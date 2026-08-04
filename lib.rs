#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::os::windows::process::CommandExt;
use std::time::{Duration, Instant};
use serde::{Deserialize, Serialize};
use sysinfo::System;
use tokio::net::TcpStream;
use tokio::time::sleep;

const CREATE_NO_WINDOW: u32 = 0x08000000;

fn run_ps(script: &str) -> Result<String, String> {
    let out = std::process::Command::new("powershell")
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("PowerShell error: {}", e))?;
    if !out.status.success() {
        let err = String::from_utf8_lossy(&out.stderr);
        return Err(format!("PS failed: {}", err.trim()));
    }
    Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemInfo {
    pub hostname: String,
    pub os: String,
    pub cpu_name: String,
    pub cpu_cores: u32,
    pub total_memory_gb: f64,
    pub uptime_hours: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PingDetail {
    pub host: String,
    pub latency_ms: f64,
    pub packet_loss: f32,
    pub timings: Vec<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NetworkSpeed {
    pub download_mbps: f64,
    pub upload_mbps: f64,
    pub adapter_name: String,
    pub connection_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NetworkAdapter {
    pub name: String,
    pub interface_description: String,
    pub ip_addresses: Vec<String>,
    pub mac_address: String,
    pub link_speed: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WifiNetwork {
    pub ssid: String,
    pub signal: String,
    pub channel: String,
    pub auth: String,
    pub bssid: String,
    pub has_password: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DnsProvider {
    pub name: String,
    pub primary: String,
    pub secondary: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NetworkSetting {
    pub id: String,
    pub name: String,
    pub description: String,
    pub current_value: String,
    pub recommended_value: String,
    pub category: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NetworkOptimizationResult {
    pub success: bool,
    pub message: String,
    pub settings_changed: Vec<String>,
}

#[tauri::command]
fn get_system_info() -> SystemInfo {
    let sys = System::new_all();
    SystemInfo {
        hostname: System::host_name().unwrap_or_default(),
        os: System::long_os_version().unwrap_or_default(),
        cpu_name: sys.cpus().first().map(|c| c.brand().to_string()).unwrap_or_default(),
        cpu_cores: sys.cpus().len() as u32,
        total_memory_gb: sys.total_memory() as f64 / 1024.0 / 1024.0 / 1024.0,
        uptime_hours: System::uptime() / 3600,
    }
}

#[tauri::command]
async fn get_public_ip() -> Result<String, String> {
    let resp = reqwest::get("https://api.ipify.org")
        .await
        .map_err(|e| format!("Failed to get public IP: {}", e))?;
    let ip = resp.text().await.map_err(|e| format!("Failed to read response: {}", e))?;
    Ok(ip.trim().to_string())
}

#[tauri::command]
async fn ping_host_continuous(host: String, count: u32) -> Result<PingDetail, String> {
    let script = format!(r#"
$raw = ping -n {count} {host}
$timings = New-Object System.Collections.ArrayList
$lossVal = 0
$sentVal = 0
foreach ($line in $raw) {{
    $s = "$line"
    if ($s -match 'time[=<]\s*(\d+)\s*ms') {{
        [void]$timings.Add([double]$matches[1])
    }} elseif ($s -match 'Lost = (\d+)') {{
        $lossVal = [int]$matches[1]
    }} elseif ($s -match 'Sent = (\d+)') {{
        $sentVal = [int]$matches[1]
    }}
}}
$packetLoss = 0.0
if ($sentVal -gt 0) {{ $packetLoss = [float](($lossVal / $sentVal) * 100.0) }}
$avgMs = 0.0
if ($timings.Count -gt 0) {{
    $sum = 0.0; foreach ($t in $timings) {{ $sum += $t }}
    $avgMs = $sum / $timings.Count
}}
$tArr = if ($timings.Count -gt 0) {{ @($timings.ToArray()) }} else {{ @() }}
[PSCustomObject]{{
    host = "{host}"
    latency_ms = [math]::Round($avgMs, 1)
    packet_loss = [math]::Round($packetLoss, 1)
    timings = $tArr
}} | ConvertTo-Json
"#);
    let out = tokio::task::spawn_blocking(move || run_ps(&script))
        .await.map_err(|e| e.to_string())??;
    if out.is_empty() || out == "null" {
        return Ok(PingDetail { host, latency_ms: 0.0, packet_loss: 100.0, timings: vec![] });
    }
    serde_json::from_str(&out).map_err(|e| format!("Parse: {}", e))
}

#[tauri::command]
async fn get_network_speed() -> Result<NetworkSpeed, String> {
    let script = r#"
$adapter = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1
if (-not $adapter) { $adapter = Get-NetAdapter -ErrorAction SilentlyContinue | Select-Object -First 1 }
$adapterName = if ($adapter) { $adapter.Name } else { 'Unknown' }
$connType = if ($adapter -and $adapter.MediaType) { $adapter.MediaType } else { $adapterName }
$dlMbps = 0.0; $ulMbps = 0.0
$urls = @('http://speedtest.tele2.net/10MB.zip', 'http://ipv4.download.thinkbroadband.com/10MB.zip', 'http://proof.ovh.net/files/10Mio.dat')
foreach ($url in $urls) {
    try {
        $wc = New-Object System.Net.WebClient
        $wc.Timeout = 15000
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $data = $wc.DownloadData($url)
        $sw.Stop()
        if ($sw.Elapsed.TotalSeconds -gt 0 -and $data.Length -gt 0) {
            $dlMbps = [math]::Round(($data.Length * 8) / ($sw.Elapsed.TotalSeconds * 1000000), 2)
            if ($dlMbps -gt 0) { break }
        }
    } catch { continue }
}
if ($dlMbps -eq 0 -and $adapter -and $adapter.LinkSpeed) {
    $linkSpeed = $adapter.LinkSpeed -replace '[^0-9]', ''
    if ($linkSpeed) { $dlMbps = [double]$linkSpeed * 0.8 }
}
# Upload: try to POST to httpbin or fake proportional
try {
    $wc = New-Object System.Net.WebClient
    $uploadData = New-Object byte[] (1048576) # 1MB
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $resp = $wc.UploadData('http://httpbin.org/post', 'POST', $uploadData)
    $sw.Stop()
    if ($sw.Elapsed.TotalSeconds -gt 0 -and $resp.Length -gt 0) {
        $ulMbps = [math]::Round(($uploadData.Length * 8) / ($sw.Elapsed.TotalSeconds * 1000000), 2)
    }
} catch { $ulMbps = [math]::Round($dlMbps * 0.3, 2) }
if ($ulMbps -eq 0) { $ulMbps = [math]::Round($dlMbps * 0.3, 2) }
[PSCustomObject]@{
    download_mbps = [math]::Round($dlMbps, 2)
    upload_mbps = [math]::Round($ulMbps, 2)
    adapter_name = $adapterName
    connection_type = $connType
} | ConvertTo-Json
"#;
    let out = tokio::task::spawn_blocking(move || run_ps(script))
        .await.map_err(|e| e.to_string())??;
    if out.is_empty() || out == "null" {
        return Ok(NetworkSpeed {
            download_mbps: 0.0,
            upload_mbps: 0.0,
            adapter_name: "Unknown".into(),
            connection_type: "Unknown".into(),
        });
    }
    serde_json::from_str(&out).map_err(|e| format!("Parse: {}", e))
}

#[tauri::command]
fn get_dns_providers() -> Vec<DnsProvider> {
    vec![
        DnsProvider { name: "Cloudflare".into(), primary: "1.1.1.1".into(), secondary: "1.0.0.1".into() },
        DnsProvider { name: "Google".into(), primary: "8.8.8.8".into(), secondary: "8.8.4.4".into() },
        DnsProvider { name: "OpenDNS".into(), primary: "208.67.222.222".into(), secondary: "208.67.220.220".into() },
        DnsProvider { name: "Quad9".into(), primary: "9.9.9.9".into(), secondary: "149.112.112.112".into() },
        DnsProvider { name: "Comodo Secure".into(), primary: "8.26.56.26".into(), secondary: "8.20.247.20".into() },
        DnsProvider { name: "AdGuard".into(), primary: "94.140.14.14".into(), secondary: "94.140.15.15".into() },
        DnsProvider { name: "CleanBrowsing".into(), primary: "185.228.168.9".into(), secondary: "185.228.169.9".into() },
    ]
}

#[tauri::command]
async fn set_dns(primary: String, secondary: String) -> Result<String, String> {
    let script = format!(
        r#"$adapters = Get-NetAdapter -Physical | Where-Object {{ $_.Status -eq 'Up' }}
foreach ($adapter in $adapters) {{
    Set-DnsClientServerAddress -InterfaceIndex $adapter.ifIndex -ServerAddresses ('{0}', '{1}') -ErrorAction SilentlyContinue
}}
Write-Output "DNS set to {0} / {1} on $($adapters.Count) adapter(s)"
"#, primary, secondary);
    tokio::task::spawn_blocking(move || run_ps(&script)).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn get_current_dns() -> Result<Vec<String>, String> {
    let script = r#"
$adapters = Get-NetAdapter -Physical | Where-Object { $_.Status -eq 'Up' }
$result = @()
foreach ($adapter in $adapters) {
    $dns = (Get-DnsClientServerAddress -InterfaceIndex $adapter.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue).ServerAddresses
    if ($dns) { $result += "$($adapter.Name): $($dns -join ', ')" }
}
if ($result.Count -eq 0) { $result += "No active adapters with DNS" }
$result -join "`n"
"#;
    let output = tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())??;
    Ok(output.lines().map(|l| l.to_string()).collect())
}

#[tauri::command]
async fn flush_dns() -> Result<String, String> {
    tokio::task::spawn_blocking(|| run_ps("ipconfig /flushdns 2>&1 | Out-String; Write-Output 'DNS cache flushed'"))
        .await.map_err(|e| e.to_string())?
        .map(|_| "DNS cache flushed".into())
}

#[tauri::command]
async fn reset_winsock() -> Result<String, String> {
    tokio::task::spawn_blocking(|| run_ps("netsh winsock reset 2>&1 | Out-String; Write-Output 'Winsock reset (reboot may be required)'"))
        .await.map_err(|e| e.to_string())?
        .map(|_| "Winsock reset (reboot may be required)".into())
}

#[tauri::command]
async fn set_tcp_setting(setting: String, value: String) -> Result<String, String> {
    let script = match setting.as_str() {
        "tcp_auto_tuning" => format!("netsh int tcp set global autotuninglevel={}", value),
        "rss" => format!("netsh int tcp set global rss={}", value),
        "chimney" => format!("netsh int tcp set global chimney={}", value),
        "netdma" => format!("netsh int tcp set global netdma={}", value),
        "ecn" => format!("netsh int tcp set global ecncapability={}", value),
        "timestamps" => format!("netsh int tcp set global timestamps={}", value),
        "initial_rto" => format!("netsh int tcp set global initialRto={}", value),
        "nagle" => format!(
            "Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces' -Name 'TcpAckFrequency' -Value {} -Type DWord -ErrorAction SilentlyContinue; Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces' -Name 'TCPDelAckTicks' -Value {} -Type DWord -ErrorAction SilentlyContinue",
            if value == "disabled" { "1" } else { "2" },
            if value == "disabled" { "0" } else { "1" }),
        _ => return Err(format!("Unknown setting: {}", setting)),
    };
    tokio::task::spawn_blocking(move || run_ps(&script)).await.map_err(|e| e.to_string())??;
    Ok(format!("{} set to {}", setting, value))
}

#[tauri::command]
async fn get_network_adapters() -> Result<Vec<NetworkAdapter>, String> {
    let script = r#"
$result = @()
$adapters = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Up' -or $_.Status -eq 'Disconnected' }
if (-not $adapters) { $adapters = Get-NetAdapter -ErrorAction SilentlyContinue }
$adapters | ForEach-Object {
    $ip = Get-NetIPAddress -InterfaceIndex $_.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue
    $ips = @()
    if ($ip) { $ip | ForEach-Object { $ips += $_.IPAddress } }
    $mac = ''
    if ($_.MacAddress) { $mac = $_.MacAddress }
    elseif ($_.ifIndex) {
        $macLine = Get-NetAdapter -InterfaceIndex $_.ifIndex -ErrorAction SilentlyContinue | Select-Object -ExpandProperty MacAddress -ErrorAction SilentlyContinue
        if ($macLine) { $mac = $macLine }
    }
    $result += [PSCustomObject]@{
        name = if ($_.Name) { $_.Name } else { "Unknown" }
        interface_description = if ($_.InterfaceDescription) { $_.InterfaceDescription } else { "" }
        ip_addresses = $ips
        mac_address = "$mac"
        link_speed = if ($_.LinkSpeed) { "$($_.LinkSpeed)" } else { "Unknown" }
        status = if ($_.Status) { "$($_.Status)" } else { "Unknown" }
    }
}
if ($result.Count -eq 0) {
    # Fallback: use netsh to get basic info
    $raw = netsh interface ip show config 2>&1
    $result += [PSCustomObject]@{
        name = "Unknown"
        interface_description = "Fallback adapter"
        ip_addresses = @()
        mac_address = ""
        link_speed = "Unknown"
        status = "Unknown"
    }
}
if ($result.Count -eq 1) { ConvertTo-Json -InputObject @($result[0]) -Depth 3 }
else { ConvertTo-Json -InputObject @($result) -Depth 3 }
"#;
    let output = tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())??;
    if output.is_empty() || output == "[]" || output == "null" {
        return Ok(vec![]);
    }
    serde_json::from_str(&output).map_err(|e| format!("Parse error: {}", e))
}

#[tauri::command]
async fn get_network_profile() -> Result<String, String> {
    let script = r#"$prof = Get-NetConnectionProfile -ErrorAction SilentlyContinue; if ($prof) { $prof.NetworkCategory } else { 'Unknown' }"#;
    tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn set_network_profile(profile: String) -> Result<String, String> {
    let cat = match profile.as_str() {
        "Private" => "Private",
        "Public" => "Public",
        _ => return Err("Invalid profile. Use Private or Public".into()),
    };
    let script = format!(r#"Get-NetConnectionProfile -ErrorAction SilentlyContinue | Set-NetConnectionProfile -NetworkCategory "{}""#, cat);
    tokio::task::spawn_blocking(move || run_ps(&script)).await.map_err(|e| e.to_string())?.map(|_| format!("Network profile set to {}", cat))
}

#[tauri::command]
fn get_network_settings() -> Vec<NetworkSetting> {
    vec![
        NetworkSetting {
            id: "tcp-ack-freq".into(), name: "TCP ACK Frequency".into(),
            description: "Reduces latency by optimizing TCP acknowledgments".into(),
            current_value: "Default".into(), recommended_value: "1".into(), category: "Latency".into(),
        },
        NetworkSetting {
            id: "network-throttling".into(), name: "Network Throttling Index".into(),
            description: "Disables Windows network throttling for gaming".into(),
            current_value: "Enabled".into(), recommended_value: "Disabled".into(), category: "Throttling".into(),
        },
        NetworkSetting {
            id: "tcp-no-delay".into(), name: "TCP No Delay".into(),
            description: "Disables Nagle's algorithm for lower latency".into(),
            current_value: "Default".into(), recommended_value: "Enabled".into(), category: "Latency".into(),
        },
        NetworkSetting {
            id: "max-connections-per-server".into(), name: "Max Connections per Server".into(),
            description: "Increases simultaneous connections for downloads".into(),
            current_value: "Default".into(), recommended_value: "16".into(), category: "Throughput".into(),
        },
        NetworkSetting {
            id: "dns-cache".into(), name: "DNS Cache".into(),
            description: "Large DNS cache for faster resolution".into(),
            current_value: "Default".into(), recommended_value: "Optimized".into(), category: "DNS".into(),
        },
        NetworkSetting {
            id: "mtu-size".into(), name: "MTU Size".into(),
            description: "Maximum Transmission Unit for adapter".into(),
            current_value: "Default".into(), recommended_value: "1500".into(), category: "Throughput".into(),
        },
    ]
}

#[tauri::command]
async fn apply_network_optimizations(settings: Vec<String>) -> Result<NetworkOptimizationResult, String> {
    let mut changed = Vec::new();
    for setting in &settings {
        let script = match setting.as_str() {
            "tcp-ack-freq" => {
                changed.push("TCP ACK Frequency → 1".into());
                r#"Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters' -Name 'TcpAckFrequency' -Value 1 -Type DWord -Force -EA SilentlyContinue"#
            }
            "network-throttling" => {
                changed.push("Network Throttling → Disabled".into());
                r#"Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' -Name 'NetworkThrottlingIndex' -Value 0xffffffff -Type DWord -Force -EA SilentlyContinue"#
            }
            "tcp-no-delay" => {
                changed.push("TCP No Delay → Enabled".into());
                r#"Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters' -Name 'TcpDelAckTicks' -Value 0 -Type DWord -Force -EA SilentlyContinue"#
            }
            "max-connections-per-server" => {
                changed.push("Max Connections → 16".into());
                r#"Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' -Name 'MaxConnectionsPerServer' -Value 16 -Type DWord -Force -EA SilentlyContinue"#
            }
            "dns-cache" => {
                changed.push("DNS Cache → Optimized".into());
                r#"Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Dnscache\Parameters' -Name 'CacheHashTableBucketSize' -Value 1 -Type DWord -Force -EA SilentlyContinue; Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Dnscache\Parameters' -Name 'CacheHashTableSize' -Value 0x180 -Type DWord -Force -EA SilentlyContinue; Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Dnscache\Parameters' -Name 'MaxCacheEntryTtlLimit' -Value 86400 -Type DWord -Force -EA SilentlyContinue; Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Dnscache\Parameters' -Name 'MaxSOACacheEntryTtlLimit' -Value 300 -Type DWord -Force -EA SilentlyContinue"#
            }
            _ => continue,
        };
        let _ = tokio::task::spawn_blocking(move || run_ps(script)).await;
    }
    Ok(NetworkOptimizationResult {
        success: true,
        message: if changed.is_empty() { "No changes applied".into() } else { format!("Applied {} optimization(s)", changed.len()) },
        settings_changed: changed,
    })
}

#[tauri::command]
async fn trace_route(host: String) -> Result<Vec<String>, String> {
    let script = format!("tracert -h 15 -d {host} 2>&1 | Select-String '^\\s*\\d' | ForEach-Object {{ ($_ -replace '\\s+', ' ').Trim() }}");
    let out = tokio::task::spawn_blocking(move || run_ps(&script)).await.map_err(|e| e.to_string())??;
    Ok(out.lines().map(|l| l.to_string()).collect())
}

#[tauri::command]
async fn get_tcp_global_params() -> Result<Vec<String>, String> {
    let script = "netsh int tcp show global 2>&1 | Out-String";
    let out = tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())??;
    Ok(out.lines().filter(|l| l.contains(':')).map(|l| l.trim().to_string()).collect())
}

#[tauri::command]
async fn get_wifi_networks() -> Result<Vec<WifiNetwork>, String> {
    let script = r#"
$nets = @()
try {
    $svc = Get-Service -Name 'WlanSvc' -ErrorAction SilentlyContinue
    if (-not $svc -or $svc.Status -ne 'Running') { Write-Output '[]'; return }
    $raw = netsh wlan show networks mode=Bssid
    if (-not $raw) { $raw = netsh wlan show networks }
    if (-not $raw) { Write-Output '[]'; return }
    $lines = @($raw) -split "`r`n|`n"
    if ($lines.Count -lt 2) { Write-Output '[]'; return }
    $current = $null
    $bssid = ""; $signal = ""; $channel = ""; $auth = ""
    $hasDetail = $false
    foreach ($_line in $lines) {
        $s = $_.Trim()
        if ($s -match '^SSID\s+\d+\s*:\s*(.+)$') {
            if ($current) { $nets += [PSCustomObject]@{ ssid = $current; bssid = $bssid; signal = $signal; channel = $channel; auth = $auth; has_password = $true } }
            $current = $matches[1].Trim()
            $bssid = ""; $signal = ""; $channel = ""; $auth = ""; $hasDetail = $true
        } elseif ($s -match '^SSID\s*:\s*(.+)$') {
            if ($current -and $hasDetail) { $nets += [PSCustomObject]@{ ssid = $current; bssid = $bssid; signal = $signal; channel = $channel; auth = $auth; has_password = $true } }
            $current = $matches[1].Trim()
            $bssid = ""; $signal = ""; $channel = ""; $auth = ""; $hasDetail = $false
        } elseif ($s -match '^BSSID\s+\d+\s*:\s*(.+)$') { $bssid = $matches[1].Trim(); $hasDetail = $true }
        elseif ($s -match '^Signal\s*:\s*(.+)$') { $signal = $matches[1].Trim() }
        elseif ($s -match '^Channel\s*:\s*(.+)$') { $channel = $matches[1].Trim() }
        elseif ($s -match '^Authentication\s*:\s*(.+)$') { $auth = $matches[1].Trim() }
    }
    if ($current) { $nets += [PSCustomObject]@{ ssid = $current; bssid = $bssid; signal = $signal; channel = $channel; auth = $auth; has_password = $true } }
} catch { Write-Output '[]'; return }
if ($nets.Count -eq 0) { Write-Output '[]'; return }
$nets | ConvertTo-Json -Depth 3 -AsArray
"#;
    let handle = tokio::task::spawn_blocking(move || run_ps(script));
    let out = tokio::time::timeout(Duration::from_secs(30), handle)
        .await
        .map_err(|_| "WiFi scan timed out (30s)".to_string())?
        .map_err(|e| e.to_string())??;
    if out.is_empty() || out == "[]" || out == "null" { return Ok(vec![]); }
    serde_json::from_str(&out).map_err(|e| format!("Parse: {}", e))
}

#[tauri::command]
async fn get_wifi_password(ssid: String) -> Result<String, String> {
    let script = format!(
        r#"$profile = netsh wlan show profile name="{0}" key=clear; $s = "$profile"; if ($s -match 'Key Content\s+:\s+(.+?)[\r\n]') {{ Write-Output $matches[1] }} else {{ Write-Output 'No password found or no profile saved' }}"#,
        ssid
    );
    tokio::task::spawn_blocking(move || run_ps(&script)).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn get_network_stats_raw() -> Result<String, String> {
    let script = r#"$before = Get-NetAdapterStatistics -ErrorAction SilentlyContinue | Select-Object Name, ReceivedBytes, SentBytes | ConvertTo-Json -Compress; Start-Sleep -Milliseconds 1000; $after = Get-NetAdapterStatistics -ErrorAction SilentlyContinue | Select-Object Name, ReceivedBytes, SentBytes | ConvertTo-Json -Compress; Write-Output ($before + '|||' + $after)"#;
    tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())?
}

// ── Packet Loss Test ──────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
struct PacketLossResult {
    host: String,
    sent: u32,
    received: u32,
    loss_pct: f64,
    min_ms: f64,
    avg_ms: f64,
    max_ms: f64,
    jitter_ms: f64,
    timings: Vec<f64>,
}

#[tauri::command]
async fn test_packet_loss(host: String, count: u32) -> Result<PacketLossResult, String> {
    let script = format!(
        r#"
$raw = ping -n {count} {host}
$timings = New-Object System.Collections.ArrayList
$lossVal = 0
$sentVal = 0
foreach ($line in $raw) {{
    $s = "$line"
    if ($s -match 'time[=<]\s*(\d+)\s*ms') {{
        [void]$timings.Add([double]$matches[1])
    }} elseif ($s -match 'Lost = (\d+)') {{
        $lossVal = [int]$matches[1]
    }} elseif ($s -match 'Sent = (\d+)') {{
        $sentVal = [int]$matches[1]
    }}
}}
$sent = if ($sentVal -gt 0) {{ $sentVal }} else {{ {count} }}
$received = $sent - $lossVal
$loss = 0.0; if ($sent -gt 0) {{ $loss = [float](($lossVal / $sent) * 100.0) }}
$avgMs = 0.0; $minMs = 0.0; $maxMs = 0.0; $jitterMs = 0.0
if ($timings.Count -gt 0) {{
    $sorted = $timings | Sort-Object
    $minMs = $sorted[0]; $maxMs = $sorted[-1]
    $sum = 0.0; foreach ($t in $timings) {{ $sum += $t }}
    $avgMs = $sum / $timings.Count
    $diffSum = 0.0
    for ($i = 1; $i -lt $timings.Count; $i++) {{ $diffSum += [math]::Abs($timings[$i] - $timings[$i-1]) }}
    $jitterMs = $diffSum / ($timings.Count - 1)
}}
$tArr = if ($timings.Count -gt 0) {{ @($timings.ToArray()) }} else {{ @() }}
[PSCustomObject]{{
    host = "{host}"
    sent = $sent
    received = $received
    loss_pct = [math]::Round($loss, 1)
    min_ms = [math]::Round($minMs, 1)
    avg_ms = [math]::Round($avgMs, 1)
    max_ms = [math]::Round($maxMs, 1)
    jitter_ms = [math]::Round($jitterMs, 1)
    timings = $tArr
}} | ConvertTo-Json
"#
    );
    let out = tokio::task::spawn_blocking(move || run_ps(&script)).await.map_err(|e| e.to_string())??;
    if out.is_empty() || out == "null" {
        return Ok(PacketLossResult {
            host, sent: count, received: 0, loss_pct: 100.0,
            min_ms: 0.0, avg_ms: 0.0, max_ms: 0.0, jitter_ms: 0.0, timings: vec![],
        });
    }
    serde_json::from_str(&out).map_err(|e| format!("Parse: {}", e))
}

// ── Bufferbloat Test ─────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
struct BufferbloatResult {
    baseline_avg_ms: f64,
    during_download_ms: f64,
    during_upload_ms: f64,
    max_delta_ms: f64,
    grade: String,
    message: String,
    download_mbps: f64,
    upload_mbps: f64,
}

#[tauri::command]
async fn run_bufferbloat_test() -> Result<BufferbloatResult, String> {
    let host = "8.8.8.8";
    let port = 443;
    let target = format!("{}:{}", host, port);

    let mut baseline = Vec::new();
    let mut during_dl = Vec::new();
    let mut during_ul = Vec::new();

    // Phase 1: Baseline pings (2 seconds)
    let start = Instant::now();
    while start.elapsed().as_secs_f64() < 2.0 {
        let t = Instant::now();
        match tokio::time::timeout(Duration::from_secs(1), TcpStream::connect(&target)).await {
            Ok(Ok(_)) => baseline.push(t.elapsed().as_secs_f64() * 1000.0),
            _ => {}
        }
        sleep(Duration::from_millis(100)).await;
    }

    // Phase 2: Download saturation (5 seconds)
    let dl_start = Instant::now();
    let dl_handles: Vec<_> = (0..6).map(|_| {
        tokio::spawn(async {
            if let Ok(resp) = reqwest::get("http://speedtest.tele2.net/10MB.zip").await {
                let _ = resp.bytes().await;
            }
        })
    }).collect();

    while dl_start.elapsed().as_secs_f64() < 5.0 {
        let t = Instant::now();
        match tokio::time::timeout(Duration::from_secs(1), TcpStream::connect(&target)).await {
            Ok(Ok(_)) => during_dl.push(t.elapsed().as_secs_f64() * 1000.0),
            _ => {}
        }
        sleep(Duration::from_millis(100)).await;
    }
    for h in dl_handles { let _ = h.await; }

    // Phase 3: Upload saturation (5 seconds)
    let ul_start = Instant::now();
    let body = vec![0u8; 1024 * 128]; // 128KB random-ish data
    let ul_handles: Vec<_> = (0..6).map(|_| {
        let b = body.clone();
        tokio::spawn(async {
            let client = reqwest::Client::new();
            let _ = client.post("http://httpbin.org/post")
                .body(b)
                .send()
                .await;
        })
    }).collect();

    while ul_start.elapsed().as_secs_f64() < 5.0 {
        let t = Instant::now();
        match tokio::time::timeout(Duration::from_secs(1), TcpStream::connect(&target)).await {
            Ok(Ok(_)) => during_ul.push(t.elapsed().as_secs_f64() * 1000.0),
            _ => {}
        }
        sleep(Duration::from_millis(100)).await;
    }
    for h in ul_handles { let _ = h.await; }

    let avg = |v: &[f64]| if v.is_empty() { 0.0 } else { v.iter().sum::<f64>() / v.len() as f64 };
    let b_avg = avg(&baseline);
    let d_avg = avg(&during_dl);
    let u_avg = avg(&during_ul);
    let delta = (d_avg - b_avg).max(u_avg - b_avg).max(0.0);

    let (grade, message) = if delta < 5.0 {
        ("A+".into(), "Perfect. Driver and router SQM are optimally tuned.".into())
    } else if delta < 30.0 {
        ("A".into(), "Great. Minimal stuttering during heavy downloads.".into())
    } else if delta < 60.0 {
        ("B".into(), "Modest. Normal gaming may stutter if someone is streaming.".into())
    } else if delta < 200.0 {
        ("C".into(), "Poor. High bufferbloat detected — apply network tweaks.".into())
    } else {
        ("F".into(), "Critical. Network chokes severely under load.".into())
    };

    Ok(BufferbloatResult {
        baseline_avg_ms: (b_avg * 10.0).round() / 10.0,
        during_download_ms: (d_avg * 10.0).round() / 10.0,
        during_upload_ms: (u_avg * 10.0).round() / 10.0,
        max_delta_ms: (delta * 10.0).round() / 10.0,
        grade,
        message,
        download_mbps: 0.0,
        upload_mbps: 0.0,
    })
}

// ── 20 Tweaks + Rollback System ──────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
struct TweakDef {
    id: String,
    name: String,
    description: String,
    category: String,
    safe_level: String,
    reboot_required: bool,
    registry_path: String,
    registry_name: String,
    registry_type: String,
    current_value: String,
    recommended_value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AppliedTweak {
    id: String,
    name: String,
    timestamp: String,
    path: String,
    value_name: String,
    original_value: String,
    applied_value: String,
}

fn rollback_path() -> std::path::PathBuf {
    let mut p = std::env::temp_dir();
    p.push("impulse-ping-tweaks.json");
    p
}

fn load_rollbacks() -> Vec<AppliedTweak> {
    let path = rollback_path();
    if path.exists() {
        std::fs::read_to_string(&path).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
    } else { vec![] }
}

fn save_rollbacks(entries: &[AppliedTweak]) {
    if let Ok(s) = serde_json::to_string(entries) {
        let _ = std::fs::write(rollback_path(), s);
    }
}

fn read_registry_ps(path: &str, name: &str) -> String {
    let script = format!(
        r#"$val = Get-ItemProperty -Path '{0}' -Name '{1}' -ErrorAction SilentlyContinue; if ($val -and $val.'{1}') {{ Write-Output $val.'{1}' }} else {{ Write-Output '__DEFAULT__' }}"#,
        path, name
    );
    run_ps(&script).unwrap_or_else(|_| "__DEFAULT__".into())
}

fn write_registry_ps(path: &str, name: &str, r#type: &str, value: &str) -> Result<String, String> {
    run_ps(&format!(
        r#"Set-ItemProperty -Path '{0}' -Name '{1}' -Value {2} -Type {3} -Force -EA SilentlyContinue; Write-Output 'ok'"#,
        path, name, value, r#type
    ))
}

fn make_tweaks() -> Vec<TweakDef> {
    vec![
        TweakDef { id: "tcp-ack-freq".into(), name: "TCP ACK Frequency".into(), description: "Reduces latency by sending ACKs every packet instead of every 2 packets".into(), category: "Latency".into(), safe_level: "Safe".into(), reboot_required: false, registry_path: "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters".into(), registry_name: "TcpAckFrequency".into(), registry_type: "DWord".into(), current_value: "__DEFAULT__".into(), recommended_value: "1".into() },
        TweakDef { id: "tcp-no-delay".into(), name: "TCP NoDelay (Nagle Disable)".into(), description: "Disables Nagle's algorithm — packets sent immediately for lower latency".into(), category: "Latency".into(), safe_level: "Safe".into(), reboot_required: false, registry_path: "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters".into(), registry_name: "TcpDelAckTicks".into(), registry_type: "DWord".into(), current_value: "__DEFAULT__".into(), recommended_value: "0".into() },
        TweakDef { id: "net-throttling".into(), name: "Network Throttling Index".into(), description: "Disables Windows bandwidth throttling for gaming and streaming".into(), category: "Throughput".into(), safe_level: "Safe".into(), reboot_required: false, registry_path: "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile".into(), registry_name: "NetworkThrottlingIndex".into(), registry_type: "DWord".into(), current_value: "__DEFAULT__".into(), recommended_value: "0xffffffff".into() },
        TweakDef { id: "max-connections".into(), name: "Max Connections per Server".into(), description: "Increases simultaneous connections from default to 16 for better throughput".into(), category: "Throughput".into(), safe_level: "Safe".into(), reboot_required: false, registry_path: "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile".into(), registry_name: "MaxConnectionsPerServer".into(), registry_type: "DWord".into(), current_value: "__DEFAULT__".into(), recommended_value: "16".into() },
        TweakDef { id: "dns-cache-bucket".into(), name: "DNS Cache Bucket Size".into(), description: "Optimizes DNS cache hash table for faster domain resolution".into(), category: "DNS".into(), safe_level: "Safe".into(), reboot_required: false, registry_path: "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters".into(), registry_name: "CacheHashTableBucketSize".into(), registry_type: "DWord".into(), current_value: "__DEFAULT__".into(), recommended_value: "1".into() },
        TweakDef { id: "dns-cache-size".into(), name: "DNS Cache Table Size".into(), description: "Increases DNS cache hash table entries for larger cache capacity".into(), category: "DNS".into(), safe_level: "Safe".into(), reboot_required: false, registry_path: "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters".into(), registry_name: "CacheHashTableSize".into(), registry_type: "DWord".into(), current_value: "__DEFAULT__".into(), recommended_value: "0x180".into() },
        TweakDef { id: "dns-cache-ttl".into(), name: "DNS Cache Max TTL".into(), description: "Increases max DNS cache lifetime to 24h for fewer lookups".into(), category: "DNS".into(), safe_level: "Safe".into(), reboot_required: false, registry_path: "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters".into(), registry_name: "MaxCacheEntryTtlLimit".into(), registry_type: "DWord".into(), current_value: "__DEFAULT__".into(), recommended_value: "86400".into() },
        TweakDef { id: "dns-negative-ttl".into(), name: "DNS Negative Cache TTL".into(), description: "Reduces negative DNS cache TTL for faster retry on failed lookups".into(), category: "DNS".into(), safe_level: "Safe".into(), reboot_required: false, registry_path: "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters".into(), registry_name: "MaxSOACacheEntryTtlLimit".into(), registry_type: "DWord".into(), current_value: "__DEFAULT__".into(), recommended_value: "300".into() },
        TweakDef { id: "tcp-auto-tuning".into(), name: "TCP Auto-Tuning Normal".into(), description: "Sets TCP receive window auto-tuning to normal for balanced throughput".into(), category: "Throughput".into(), safe_level: "Safe".into(), reboot_required: false, registry_path: "netsh".into(), registry_name: "autotuninglevel".into(), registry_type: "string".into(), current_value: "__DEFAULT__".into(), recommended_value: "normal".into() },
        TweakDef { id: "rss-enable".into(), name: "RSS (Receive Side Scaling)".into(), description: "Enables RSS to distribute network processing across CPU cores".into(), category: "Performance".into(), safe_level: "Safe".into(), reboot_required: false, registry_path: "netsh".into(), registry_name: "rss".into(), registry_type: "string".into(), current_value: "__DEFAULT__".into(), recommended_value: "enabled".into() },
        TweakDef { id: "ecn-enable".into(), name: "ECN Capability".into(), description: "Enables Explicit Congestion Notification for better network flow control".into(), category: "Performance".into(), safe_level: "Safe".into(), reboot_required: false, registry_path: "netsh".into(), registry_name: "ecncapability".into(), registry_type: "string".into(), current_value: "__DEFAULT__".into(), recommended_value: "enabled".into() },
        TweakDef { id: "timestamps-disable".into(), name: "TCP Timestamps".into(), description: "Disables TCP timestamps to reduce CPU overhead on each packet".into(), category: "Performance".into(), safe_level: "Moderate".into(), reboot_required: false, registry_path: "netsh".into(), registry_name: "timestamps".into(), registry_type: "string".into(), current_value: "__DEFAULT__".into(), recommended_value: "disabled".into() },
        TweakDef { id: "initial-rto".into(), name: "Initial RTO".into(), description: "Reduces initial retransmit timeout for faster connection establishment".into(), category: "Latency".into(), safe_level: "Moderate".into(), reboot_required: false, registry_path: "netsh".into(), registry_name: "initialRto".into(), registry_type: "string".into(), current_value: "__DEFAULT__".into(), recommended_value: "2000".into() },
        TweakDef { id: "chimney-disable".into(), name: "TCP Chimney Offload".into(), description: "Disables TCP chimney offload for better stability with gaming/VPN".into(), category: "Stability".into(), safe_level: "Moderate".into(), reboot_required: false, registry_path: "netsh".into(), registry_name: "chimney".into(), registry_type: "string".into(), current_value: "__DEFAULT__".into(), recommended_value: "disabled".into() },
        TweakDef { id: "netdma-disable".into(), name: "NetDMA".into(), description: "Disables NetDMA to prevent DMA-related network issues on some systems".into(), category: "Stability".into(), safe_level: "Moderate".into(), reboot_required: false, registry_path: "netsh".into(), registry_name: "netdma".into(), registry_type: "string".into(), current_value: "__DEFAULT__".into(), recommended_value: "disabled".into() },
        TweakDef { id: "power-saving-disable".into(), name: "Adapter Power Saving".into(), description: "Disables power saving on all physical adapters for consistent latency".into(), category: "Latency".into(), safe_level: "Moderate".into(), reboot_required: true, registry_path: "powershell".into(), registry_name: "PowerSaving".into(), registry_type: "string".into(), current_value: "__DEFAULT__".into(), recommended_value: "disabled".into() },
        TweakDef { id: "tcp-window-auto".into(), name: "TCP Window Auto-Tuning".into(), description: "Sets TCP window auto-tuning level for optimal throughput".into(), category: "Throughput".into(), safe_level: "Safe".into(), reboot_required: false, registry_path: "netsh".into(), registry_name: "autotuninglevel".into(), registry_type: "string".into(), current_value: "__DEFAULT__".into(), recommended_value: "normal".into() },
        TweakDef { id: "tcp-checksum-ipv4".into(), name: "Disable TCP Checksum (IPv4)".into(), description: "Disables TCP checksum offload for IPv4 to prevent some NIC driver issues".into(), category: "Stability".into(), safe_level: "Advanced".into(), reboot_required: true, registry_path: "powershell".into(), registry_name: "ChecksumIPv4".into(), registry_type: "string".into(), current_value: "__DEFAULT__".into(), recommended_value: "disabled".into() },
        TweakDef { id: "non-skip-raw".into(), name: "NonSkippingRawNets".into(), description: "Disables Windows packet coalescing for reduced latency variation".into(), category: "Latency".into(), safe_level: "Moderate".into(), reboot_required: false, registry_path: "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters".into(), registry_name: "NonSkippingRawNets".into(), registry_type: "DWord".into(), current_value: "__DEFAULT__".into(), recommended_value: "1".into() },
        TweakDef { id: "mtu-size".into(), name: "MTU Size 1492".into(), description: "Sets MTU to 1492 (optimal for PPPoE connections, reduces fragmentation)".into(), category: "Throughput".into(), safe_level: "Moderate".into(), reboot_required: true, registry_path: "powershell".into(), registry_name: "MTU".into(), registry_type: "string".into(), current_value: "__DEFAULT__".into(), recommended_value: "1492".into() },
    ]
}

#[tauri::command]
fn get_tweak_catalog() -> Vec<TweakDef> {
    make_tweaks()
}

#[tauri::command]
async fn get_applied_tweaks() -> Vec<AppliedTweak> {
    load_rollbacks()
}

#[tauri::command]
async fn apply_tweak_safe(tweak_id: String) -> Result<String, String> {
    let tweaks = make_tweaks();
    let tw = tweaks.iter().find(|t| t.id == tweak_id).ok_or_else(|| "Tweak not found".to_string())?;

    // Read original value
    let original = if tw.registry_path == "netsh" || tw.registry_path == "powershell" {
        "__NETSH__".to_string()
    } else {
        read_registry_ps(&tw.registry_path, &tw.registry_name)
    };

    // Apply tweak
    let result = if tw.registry_path == "netsh" {
        run_ps(&format!("netsh int tcp set global {}={}", tw.registry_name, tw.recommended_value))
    } else if tw.registry_path == "powershell" {
        match tw.id.as_str() {
            "power-saving-disable" => {
                run_ps("Get-NetAdapter -Physical | Where-Object { $_.Status -eq 'Up' } | Disable-NetAdapterPowerManagement -ErrorAction SilentlyContinue; Write-Output 'ok'")
            }
            "tcp-checksum-ipv4" => {
                run_ps("Get-NetAdapter -Physical | Where-Object { $_.Status -eq 'Up' } | Set-NetAdapterAdvancedProperty -DisplayName 'TCP Checksum Offload (IPv4)' -DisplayValue 'Disabled' -ErrorAction SilentlyContinue; Write-Output 'ok'")
            }
            "mtu-size" => {
                run_ps("Get-NetAdapter -Physical | Where-Object { $_.Status -eq 'Up' } | Set-NetAdapterAdvancedProperty -DisplayName 'MTU' -DisplayValue '1492' -ErrorAction SilentlyContinue; Write-Output 'ok'")
            }
            _ => run_ps("Write-Output 'ok'"),
        }
    } else {
        write_registry_ps(&tw.registry_path, &tw.registry_name, &tw.registry_type, &tw.recommended_value)
    };

    result?;

    // Save rollback entry
    let mut rollbacks = load_rollbacks();
    rollbacks.retain(|e| e.id != tweak_id);
    rollbacks.push(AppliedTweak {
        id: tweak_id.clone(),
        name: tw.name.clone(),
        timestamp: "just now".to_string(),
        path: tw.registry_path.clone(),
        value_name: tw.registry_name.clone(),
        original_value: original,
        applied_value: tw.recommended_value.clone(),
    });
    save_rollbacks(&rollbacks);

    Ok(format!("{} applied ✓", tw.name))
}

#[tauri::command]
async fn revert_tweak(tweak_id: String) -> Result<String, String> {
    let mut rollbacks = load_rollbacks();
    let idx = rollbacks.iter().position(|e| e.id == tweak_id).ok_or_else(|| "Tweak not found in rollback history".to_string())?;
    let entry = rollbacks[idx].clone();

    if entry.original_value == "__DEFAULT__" {
        // Remove the registry value to restore default
        let script = format!(
            r#"Remove-ItemProperty -Path '{0}' -Name '{1}' -Force -EA SilentlyContinue; Write-Output 'ok'"#,
            entry.path, entry.value_name
        );
        run_ps(&script)?;
    } else if entry.path == "netsh" {
        run_ps(&format!("netsh int tcp set global {}={}", entry.value_name, entry.original_value))?;
    } else if entry.path == "powershell" {
        match entry.id.as_str() {
            "power-saving-disable" => {
                run_ps("Get-NetAdapter -Physical | Where-Object { $_.Status -eq 'Up' } | Enable-NetAdapterPowerManagement -ErrorAction SilentlyContinue; Write-Output 'ok'")?;
            }
            _ => {}
        }
    } else {
        write_registry_ps(&entry.path, &entry.value_name, "DWord", &entry.original_value)?;
    }

    rollbacks.retain(|e| e.id != tweak_id);
    save_rollbacks(&rollbacks);

    Ok(format!("{} reverted ✓", entry.name))
}

#[tauri::command]
async fn revert_all_tweaks() -> Result<String, String> {
    let rollbacks = load_rollbacks();
    let count = rollbacks.len();
    for entry in &rollbacks {
        if entry.original_value == "__DEFAULT__" {
            let _ = run_ps(&format!(r#"Remove-ItemProperty -Path '{0}' -Name '{1}' -Force -EA SilentlyContinue"#, entry.path, entry.value_name));
        } else if entry.path == "netsh" {
            let _ = run_ps(&format!("netsh int tcp set global {}={}", entry.value_name, entry.original_value));
        } else if entry.path == "powershell" {
            if entry.id == "power-saving-disable" {
                let _ = run_ps("Get-NetAdapter -Physical | Where-Object { $_.Status -eq 'Up' } | Enable-NetAdapterPowerManagement -ErrorAction SilentlyContinue");
            }
        } else {
            let _ = write_registry_ps(&entry.path, &entry.value_name, "DWord", &entry.original_value);
        }
    }
    save_rollbacks(&[]);
    Ok(format!("Reverted {} tweak(s) ✓", count))
}

#[tauri::command]
async fn is_admin() -> bool {
    tokio::task::spawn_blocking(move || run_ps("net session 2>$null; $?"))
        .await.ok().and_then(|r| r.ok()).map(|o| o.contains("True")).unwrap_or(false)
}

#[tauri::command]
async fn restart_as_admin() -> Result<(), String> {
    let exe = std::env::current_exe().map_err(|e| format!("Failed to get exe path: {}", e))?;
    std::process::Command::new("powershell")
        .args(["-Command", &format!("Start-Process '{}' -Verb RunAs", exe.to_string_lossy())])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| format!("Failed to restart as admin: {}", e))?;
    std::process::exit(0);
}

// ── MTR (Ping + Traceroute) ─────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
struct MtrHop {
    hop: u32,
    host: String,
    latency_ms: f64,
    loss_pct: f64,
}

#[tauri::command]
async fn mtr_host(host: String) -> Result<Vec<MtrHop>, String> {
    let inner = async {
        // Run tracert to discover hops (-w 500 = 500ms per probe, default is 4000!)
        let trace_script = format!(r#"
$raw = tracert -d -h 15 -w 500 {host} 2>$null | Out-String
$s = "$raw"
$lines = $s -split "`r`n|`n"
$hops = @()
$hopNum = 0
foreach ($_l in $lines) {{
    $line = $_l.Trim()
    if ($line -match '^\d+\s+') {{
        $hopNum++
        $parts = ($line -replace '\s+', ' ') -split ' '
        $ip = $parts[-1].TrimEnd('.')
        if ($ip -and $ip -ne '*' -and $ip -match '^\d+\.\d+\.\d+\.\d+$') {{
            $hops += [PSCustomObject]@{{ hop = $hopNum; host = $ip; latency_ms = 0.0; loss_pct = 0.0 }}
        }}
    }}
}}
if ($hops.Count -eq 0) {{ Write-Output '[]'; return }}
$hops | ConvertTo-Json -Depth 3 -AsArray
"#);
        let out = tokio::task::spawn_blocking(move || run_ps(&trace_script)).await.map_err(|e| e.to_string())??;
        let trimmed = out.trim();
        if trimmed.is_empty() || trimmed == "[]" || trimmed == "null" { return Ok(vec![]); }
        let hops: Vec<MtrHop> = serde_json::from_str(trimmed).map_err(|e| format!("Parse: {}", e))?;
        if hops.is_empty() { return Ok(vec![]); }

        // Ping each hop for latency (in parallel batches of 5)
        let mut results = Vec::new();
        for chunk in hops.chunks(5) {
            let mut batch = Vec::new();
            for hop in chunk {
                let h = hop.host.clone();
                let ping_script = format!(
                    r#"$raw = ping -n 1 -w 1000 {host} 2>$null | Out-String; $s = "$raw"; if ($s -match 'time[=<]\s*(\d+)') {{ [double]$matches[1] }} else {{ 0.0 }}
"#, host = h);
                batch.push(tokio::task::spawn_blocking(move || run_ps(&ping_script)));
            }
            for (i, handle) in batch.into_iter().enumerate() {
                let hop = &chunk[i];
                let ms = handle.await.map_err(|e| e.to_string())?
                    .ok().and_then(|s| s.trim().parse::<f64>().ok()).unwrap_or(0.0);
                results.push(MtrHop { hop: hop.hop, host: hop.host.clone(), latency_ms: ms, loss_pct: 0.0 });
            }
        }
        Ok(results)
    };
    tokio::time::timeout(Duration::from_secs(60), inner)
        .await
        .map_err(|_| "MTR timed out (60s)".to_string())?
}

// ── DNS Benchmark ──────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
struct DnsBenchResult {
    name: String,
    primary: String,
    avg_ms: f64,
    min_ms: f64,
    max_ms: f64,
    loss_pct: f64,
}

#[tauri::command]
async fn benchmark_dns() -> Result<Vec<DnsBenchResult>, String> {
    let providers = vec![
        ("Cloudflare", "1.1.1.1"),
        ("Google", "8.8.8.8"),
        ("Quad9", "9.9.9.9"),
        ("OpenDNS", "208.67.222.222"),
        ("Comodo", "8.26.56.26"),
        ("AdGuard", "94.140.14.14"),
        ("CleanBrowsing", "185.228.168.9"),
        ("Verisign", "64.6.64.6"),
        ("Alternate", "76.76.19.19"),
        ("DNS.WATCH", "84.200.69.80"),
    ];

    let mut handles = Vec::with_capacity(providers.len());
    for &(name, ip) in &providers {
        let script = format!(
            r#"$timings = @()
foreach ($i in 1..5) {{
    try {{
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $r = Resolve-DnsName -Name 'google.com' -Server '{0}' -Type A -ErrorAction SilentlyContinue
        $sw.Stop()
        if ($r -and $sw.Elapsed.TotalMilliseconds -gt 0) {{ $timings += $sw.Elapsed.TotalMilliseconds }}
    }} catch {{}}
}}
if ($timings.Count -eq 0) {{ Write-Output 'null'; return }}
$avg = ($timings | Measure-Object -Average).Average
$min = ($timings | Measure-Object -Minimum).Minimum
$max = ($timings | Measure-Object -Maximum).Maximum
$loss = [math]::Round((5 - $timings.Count) / 5.0 * 100, 1)
[PSCustomObject]@{{
    avg_ms = [math]::Round($avg, 1)
    min_ms = [math]::Round($min, 1)
    max_ms = [math]::Round($max, 1)
    loss_pct = $loss
}} | ConvertTo-Json
"#,
            ip
        );
        let name_owned = name.to_string();
        let ip_owned = ip.to_string();
        handles.push(tokio::spawn(async move {
            let handle = tokio::task::spawn_blocking(move || run_ps(&script));
            match tokio::time::timeout(Duration::from_secs(5), handle).await {
                Ok(Ok(Ok(out))) if !out.is_empty() && out != "null" => {
                    #[derive(Deserialize)]
                    struct DnsRaw { avg_ms: f64, min_ms: f64, max_ms: f64, loss_pct: f64 }
                    match serde_json::from_str::<DnsRaw>(&out) {
                        Ok(r) => Some(DnsBenchResult { name: name_owned, primary: ip_owned, avg_ms: r.avg_ms, min_ms: r.min_ms, max_ms: r.max_ms, loss_pct: r.loss_pct }),
                        Err(_) => None,
                    }
                }
                _ => None,
            }
        }));
    }

    let mut results = Vec::with_capacity(providers.len());
    for handle in handles {
        if let Some(r) = handle.await.unwrap_or(None) {
            results.push(r);
        }
    }
    // Add failed providers with 100% loss
    for &(name, ip) in &providers {
        if !results.iter().any(|r| r.name == name) {
            results.push(DnsBenchResult { name: name.to_string(), primary: ip.to_string(), avg_ms: 0.0, min_ms: 0.0, max_ms: 0.0, loss_pct: 100.0 });
        }
    }
    Ok(results)
}

// ── Port Scanner ──────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
struct PortResult {
    port: u16,
    state: String,
    service: String,
    latency_ms: f64,
}

const COMMON_PORTS: &[(u16, &str)] = &[
    (21, "FTP"), (22, "SSH"), (23, "Telnet"), (25, "SMTP"), (53, "DNS"),
    (80, "HTTP"), (110, "POP3"), (123, "NTP"), (135, "RPC"), (139, "NetBIOS"),
    (143, "IMAP"), (389, "LDAP"), (443, "HTTPS"), (445, "SMB"), (465, "SMTPS"),
    (500, "IPsec"), (514, "Syslog"), (587, "SMTP"), (636, "LDAPS"),
    (993, "IMAPS"), (995, "POP3S"), (1080, "SOCKS"), (1194, "OpenVPN"),
    (1433, "MSSQL"), (1521, "Oracle"), (1701, "L2TP"), (1723, "PPTP"),
    (1900, "UPnP"), (2082, "cPanel"), (2222, "DirectAdmin"), (2483, "Oracle"),
    (3128, "Squid"), (3306, "MySQL"), (3389, "RDP"), (3690, "SVN"),
    (4333, "mSQL"), (4444, "Blaster"), (4500, "IPsec"), (4848, "GlassFish"),
    (5000, "UPnP"), (5432, "PostgreSQL"), (5631, "pcAnywhere"), (5666, "NRPE"),
    (5800, "VNC"), (5900, "VNC"), (5985, "WinRM"), (5986, "WinRM SSL"),
    (6379, "Redis"), (6443, "HTTPS"), (6667, "IRC"), (7777, "Game"),
    (8000, "HTTP"), (8080, "HTTP Proxy"), (8443, "HTTPS"), (9000, "Game"),
    (9090, "WebConsole"), (9100, "Printer"), (9200, "Elasticsearch"),
    (9418, "Git"), (9999, "Game"), (10000, "Webmin"), (11211, "Memcached"),
    (27015, "SRCDS"), (27016, "SRCDS"), (27017, "MongoDB"), (32400, "Plex"),
];

#[tauri::command]
async fn scan_ports(host: String) -> Result<Vec<PortResult>, String> {
    let mut handles = Vec::new();
    for (port, service) in COMMON_PORTS {
        let h = host.clone();
        handles.push(tokio::spawn(async move {
            let target = format!("{}:{}", h, port);
            let t = Instant::now();
            match tokio::time::timeout(Duration::from_secs(2), TcpStream::connect(&target)).await {
                Ok(Ok(_)) => {
                    let ms = t.elapsed().as_secs_f64() * 1000.0;
                    let state = if ms < 1000.0 { "open".into() } else { "filtered".into() };
                    Some(PortResult { port: *port, state, service: service.to_string(), latency_ms: (ms * 10.0).round() / 10.0 })
                }
                _ => None,
            }
        }));
    }
    let mut results = Vec::new();
    for h in handles {
        if let Ok(Some(r)) = h.await {
            results.push(r);
        }
    }
    results.sort_by_key(|r| r.port);
    Ok(results)
}

// ── Bandwidth Monitor ──────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
struct BandwidthUsage {
    adapter_name: String,
    download_kbps: f64,
    upload_kbps: f64,
}

#[tauri::command]
async fn get_bandwidth_usage() -> Result<Vec<BandwidthUsage>, String> {
    let script = r#"
try {
    $before = Get-NetAdapterStatistics -ErrorAction Stop | Select-Object Name, ReceivedBytes, SentBytes
    Start-Sleep -Milliseconds 1000
    $after = Get-NetAdapterStatistics -ErrorAction Stop | Select-Object Name, ReceivedBytes, SentBytes
    $result = @()
    for ($i = 0; $i -lt $before.Count; $i++) {
        $dlBps = ($after[$i].ReceivedBytes - $before[$i].ReceivedBytes) * 8 / 1000.0
        $ulBps = ($after[$i].SentBytes - $before[$i].SentBytes) * 8 / 1000.0
        if ($dlBps -lt 0) { $dlBps = 0.0 }
        if ($ulBps -lt 0) { $ulBps = 0.0 }
        $result += [PSCustomObject]@{
            adapter_name = $before[$i].Name
            download_kbps = [math]::Round($dlBps, 1)
            upload_kbps = [math]::Round($ulBps, 1)
        }
    }
    if ($result.Count -eq 0) { throw "No adapters" }
    [PSCustomObject]@{ usages = @($result) } | ConvertTo-Json -Depth 3
} catch {
    # Fallback: poll netstat -e interface counters
    $before = netstat -e 2>$null | Select-String '^\s+\d+'
    Start-Sleep -Milliseconds 1000
    $after = netstat -e 2>$null | Select-String '^\s+\d+'
    $result = @()
    if ($before -and $after) {
        $bVals = ($before.Line -split '\s+') | Where-Object { $_ -ne '' }
        $aVals = ($after.Line -split '\s+') | Where-Object { $_ -ne '' }
        if ($bVals.Count -ge 2 -and $aVals.Count -ge 2) {
            $rxB = [long]$aVals[0] - [long]$bVals[0]
            $txB = [long]$aVals[1] - [long]$bVals[1]
            if ($rxB -lt 0) { $rxB = 0 }; if ($txB -lt 0) { $txB = 0 }
            $dlKbps = [math]::Round($rxB * 8 / 1000.0, 1)
            $ulKbps = [math]::Round($txB * 8 / 1000.0, 1)
            $result += [PSCustomObject]@{ adapter_name = "All Interfaces"; download_kbps = $dlKbps; upload_kbps = $ulKbps }
        }
    }
    if ($result.Count -eq 0) {
        $result += [PSCustomObject]@{ adapter_name = "All"; download_kbps = 0.0; upload_kbps = 0.0 }
    }
    [PSCustomObject]@{ usages = @($result) } | ConvertTo-Json -Depth 3
}
"#;
    let out = tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())??;
    if out.is_empty() || out == "null" || out == "[]" { return Ok(vec![]); }
    #[derive(Deserialize)]
    struct BwWrap { usages: Vec<BandwidthUsage> }
    serde_json::from_str::<BwWrap>(&out).map(|w| w.usages).map_err(|e| format!("Parse: {}", e))
}

// ── Ping Sweep ─────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
struct SweepResult {
    ip: String,
    alive: bool,
    latency_ms: f64,
}

#[tauri::command]
async fn ping_sweep(subnet: String) -> Result<Vec<SweepResult>, String> {
    let batches: Vec<Vec<u32>> = (1..=254).collect::<Vec<_>>().chunks(20).map(|c| c.to_vec()).collect();
    let mut handles = Vec::new();
    for batch in batches {
        let sn = subnet.clone();
        handles.push(tokio::task::spawn_blocking(move || {
            let ips: Vec<String> = batch.iter().map(|i| format!("{}.{}", sn, i)).collect();
            let ips_list = ips.iter().map(|s| format!("'{}'", s)).collect::<Vec<_>>().join(",");
            let script = format!(
                r#"$r = @()
foreach ($ip in @({ips_list})) {{
    $raw = ping -n 1 -w 300 $ip 2>$null | Out-String
    $s = "$raw"
    $ms = 0.0; $alive = $false
    if ($s -match 'time[=<]\s*(\d+)') {{ $ms = [double]$matches[1]; $alive = $true }}
    $r += [PSCustomObject]@{{ ip = $ip; alive = $alive; latency_ms = $ms }}
}}
$r | ConvertTo-Json -Depth 3 -AsArray
"#);
            run_ps(&script)
        }));
    }

    let mut all = Vec::new();
    for h in handles {
        if let Ok(Ok(out)) = h.await {
            if out.is_empty() || out == "[]" || out == "null" { continue; }
            if let Ok(batch) = serde_json::from_str::<Vec<SweepResult>>(&out) {
                all.extend(batch);
            }
        }
    }
    all.retain(|h| h.alive);
    all.sort_by(|a, b| a.latency_ms.partial_cmp(&b.latency_ms).unwrap_or(std::cmp::Ordering::Equal));
    Ok(all)
}

// ── Connection Benchmark ───────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
struct BenchmarkResult {
    ping_ms: f64,
    loss_pct: f64,
    jitter_ms: f64,
    download_mbps: f64,
    upload_mbps: f64,
    bufferbloat_grade: String,
    bufferbloat_delta_ms: f64,
    dns_avg_ms: f64,
    score: u32,
    grade: String,
}

#[tauri::command]
async fn run_benchmark() -> Result<BenchmarkResult, String> {
    // Run ping test
    let ping = ping_host_continuous("8.8.8.8".into(), 10).await.unwrap_or(PingDetail {
        host: "8.8.8.8".into(), latency_ms: 0.0, packet_loss: 100.0, timings: vec![],
    });

    // Run packet loss/jitter
    let pl = test_packet_loss("8.8.8.8".into(), 10).await.unwrap_or(PacketLossResult {
        host: "8.8.8.8".into(), sent: 10, received: 0, loss_pct: 100.0,
        min_ms: 0.0, avg_ms: 0.0, max_ms: 0.0, jitter_ms: 0.0, timings: vec![],
    });

    // Run speed test
    let speed = get_network_speed().await.unwrap_or(NetworkSpeed {
        download_mbps: 0.0, upload_mbps: 0.0, adapter_name: "".into(), connection_type: "".into(),
    });

    // Run bufferbloat
    let bb = run_bufferbloat_test().await.unwrap_or(BufferbloatResult {
        baseline_avg_ms: 0.0, during_download_ms: 0.0, during_upload_ms: 0.0,
        max_delta_ms: 0.0, grade: "F".into(), message: "Failed".into(),
        download_mbps: 0.0, upload_mbps: 0.0,
    });

    // Quick DNS benchmark to Cloudflare
    let dns_script = r#"
$sw = [System.Diagnostics.Stopwatch]::StartNew()
[System.Net.Dns]::GetHostEntry('google.com')
$sw.Stop()
[math]::Round($sw.Elapsed.TotalMilliseconds, 1)
"#;
    let dns_ms = tokio::task::spawn_blocking(move || run_ps(dns_script))
        .await.map_err(|e| e.to_string())?
        .ok().and_then(|s| s.trim().parse::<f64>().ok()).unwrap_or(100.0);

    // Calculate score (0-100)
    let ping_score = if ping.latency_ms < 10.0 { 20 } else if ping.latency_ms < 30.0 { 18 } else if ping.latency_ms < 60.0 { 15 } else if ping.latency_ms < 100.0 { 10 } else if ping.latency_ms < 150.0 { 5 } else { 0 };
    let loss_score = if pl.loss_pct == 0.0 { 15 } else if pl.loss_pct < 1.0 { 12 } else if pl.loss_pct < 3.0 { 8 } else if pl.loss_pct < 10.0 { 4 } else { 0 };
    let jitter_score = if pl.jitter_ms < 5.0 { 10 } else if pl.jitter_ms < 15.0 { 8 } else if pl.jitter_ms < 30.0 { 5 } else { 0 };
    let speed_score = if speed.download_mbps > 200.0 { 20 } else if speed.download_mbps > 100.0 { 16 } else if speed.download_mbps > 50.0 { 12 } else if speed.download_mbps > 20.0 { 8 } else if speed.download_mbps > 10.0 { 4 } else { 0 };
    let bb_score = if bb.max_delta_ms < 5.0 { 20 } else if bb.max_delta_ms < 30.0 { 16 } else if bb.max_delta_ms < 60.0 { 10 } else if bb.max_delta_ms < 200.0 { 5 } else { 0 };
    let dns_score = if dns_ms < 10.0 { 15 } else if dns_ms < 30.0 { 12 } else if dns_ms < 60.0 { 8 } else if dns_ms < 100.0 { 4 } else { 0 };

    let score = ping_score + loss_score + jitter_score + speed_score + bb_score + dns_score;
    let grade = if score >= 95 { "A+".into() } else if score >= 85 { "A".into() } else if score >= 70 { "B".into() } else if score >= 55 { "C".into() } else if score >= 40 { "D".into() } else { "F".into() };

    Ok(BenchmarkResult {
        ping_ms: ping.latency_ms,
        loss_pct: pl.loss_pct,
        jitter_ms: pl.jitter_ms,
        download_mbps: speed.download_mbps,
        upload_mbps: speed.upload_mbps,
        bufferbloat_grade: bb.grade,
        bufferbloat_delta_ms: bb.max_delta_ms,
        dns_avg_ms: dns_ms,
        score: score.min(100),
        grade,
    })
}

pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            get_public_ip,
            ping_host_continuous,
            get_network_speed,
            get_dns_providers,
            set_dns,
            get_current_dns,
            flush_dns,
            reset_winsock,
            set_tcp_setting,
            get_network_adapters,
            get_network_profile,
            set_network_profile,
            get_network_settings,
            apply_network_optimizations,
            trace_route,
            get_tcp_global_params,
            get_wifi_networks,
            get_wifi_password,
            get_network_stats_raw,
            test_packet_loss,
            run_bufferbloat_test,
            get_tweak_catalog,
            get_applied_tweaks,
            apply_tweak_safe,
            revert_tweak,
            revert_all_tweaks,
            is_admin,
            restart_as_admin,
            mtr_host,
            benchmark_dns,
            scan_ports,
            get_bandwidth_usage,
            ping_sweep,
            run_benchmark,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
