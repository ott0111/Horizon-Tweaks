use std::os::windows::process::CommandExt;
use serde::{Deserialize, Serialize};
use tauri::command;

const CREATE_NO_WINDOW: u32 = 0x08000000;

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

#[derive(Debug, Serialize, Deserialize)]
pub struct NetworkAdapter {
    pub name: String,
    pub interface_description: String,
    pub ip_addresses: Vec<String>,
    pub mac_address: String,
    pub link_speed: String,
    pub status: String,
    pub adapter_type: String,
    pub dhcp_enabled: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DnsProvider {
    pub name: String,
    pub primary: String,
    pub secondary: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PingResult {
    pub success: bool,
    pub output: String,
    pub latency_ms: f64,
}

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

#[command]
pub async fn get_network_adapters() -> Result<Vec<NetworkAdapter>, String> {
    let script = r#"
$result = @()
Get-NetAdapter -Physical | ForEach-Object {
    $ip = Get-NetIPAddress -InterfaceIndex $_.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue
    $result += [PSCustomObject]@{
        name = $_.Name
        interface_description = $_.InterfaceDescription
        ip_addresses = if ($ip) { @($ip.IPAddress) } else { @() }
        mac_address = $_.MacAddress
        link_speed = "$($_.LinkSpeed)"
        status = $_.Status
        adapter_type = $_.MediaType
        dhcp_enabled = if ($_.DhcpEnabled -eq $true) { "Enabled" } else { "Disabled" }
    }
}
if ($result.Count -eq 0) {
    ConvertTo-Json -InputObject @() -Depth 3
} elseif ($result.Count -eq 1) {
    ConvertTo-Json -InputObject @($result[0]) -Depth 3
} else {
    ConvertTo-Json -InputObject @($result) -Depth 3
}
"#;
    let output = tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())??;
    if output.is_empty() || output == "[]" || output == "null" {
        return Ok(vec![]);
    }
    serde_json::from_str(&output).map_err(|e| format!("Parse error: {}", e))
}

#[command]
pub async fn get_dns_providers() -> Vec<DnsProvider> {
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

#[command]
pub async fn set_dns(primary: String, secondary: String) -> Result<String, String> {
    let script = format!(
        r#"
$adapters = Get-NetAdapter -Physical | Where-Object {{ $_.Status -eq 'Up' }}
foreach ($adapter in $adapters) {{
    Set-DnsClientServerAddress -InterfaceIndex $adapter.ifIndex -ServerAddresses ('{0}', '{1}') -ErrorAction SilentlyContinue
}}
Write-Output "DNS set to {0} / {1} on $($adapters.Count) adapter(s)"
"#,
        primary, secondary
    );
    tokio::task::spawn_blocking(move || run_ps(&script)).await.map_err(|e| e.to_string())?
}

#[command]
pub async fn get_current_dns() -> Result<Vec<String>, String> {
    let script = r#"
$adapters = Get-NetAdapter -Physical | Where-Object { $_.Status -eq 'Up' }
$result = @()
foreach ($adapter in $adapters) {
    $dns = (Get-DnsClientServerAddress -InterfaceIndex $adapter.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue).ServerAddresses
    if ($dns) {
        $result += "$($adapter.Name): $($dns -join ', ')"
    }
}
if ($result.Count -eq 0) { $result += "No active adapters with DNS" }
$result -join "`n"
"#;
    let output = tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())??;
    Ok(output.lines().map(|l| l.to_string()).collect())
}

#[command]
pub async fn flush_dns() -> Result<String, String> {
    tokio::task::spawn_blocking(|| run_ps("ipconfig /flushdns 2>&1 | Out-String; Write-Output 'DNS cache flushed'"))
        .await.map_err(|e| e.to_string())?
        .map(|_| "DNS cache flushed".into())
}

#[command]
pub async fn reset_winsock() -> Result<String, String> {
    tokio::task::spawn_blocking(|| run_ps("netsh winsock reset 2>&1 | Out-String; Write-Output 'Winsock reset (reboot may be required)'"))
        .await.map_err(|e| e.to_string())?
        .map(|_| "Winsock reset (reboot may be required)".into())
}

#[command]
pub async fn set_tcp_setting(setting: String, value: String) -> Result<String, String> {
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
            if value == "disabled" { "0" } else { "1" }
        ),
        _ => return Err(format!("Unknown setting: {}", setting)),
    };
    tokio::task::spawn_blocking(move || run_ps(&script)).await.map_err(|e| e.to_string())??;
    Ok(format!("{} set to {}", setting, value))
}

#[command]
pub async fn ping_host(host: String, count: u32) -> Result<PingResult, String> {
    let script = format!("ping -n {count} {host} 2>&1 | Out-String");
    let output = tokio::task::spawn_blocking(move || run_ps(&script)).await.map_err(|e| e.to_string())??;
    let avg_ms = output.lines()
        .filter(|l| l.contains("Average") || l.contains("average"))
        .filter_map(|l| {
            l.split('=').last()
                .and_then(|s| s.trim().trim_end_matches("ms").parse::<f64>().ok())
        })
        .next()
        .unwrap_or(0.0);
    Ok(PingResult { success: true, output, latency_ms: avg_ms })
}

#[command]
pub async fn get_network_settings() -> Result<Vec<NetworkSetting>, String> {
    let settings = vec![
        NetworkSetting {
            id: "tcp-ack-freq".to_string(),
            name: "TCP ACK Frequency".to_string(),
            description: "Reduces latency by optimizing TCP acknowledgments".to_string(),
            current_value: "Default".to_string(),
            recommended_value: "1".to_string(),
            category: "Latency".to_string(),
        },
        NetworkSetting {
            id: "network-throttling".to_string(),
            name: "Network Throttling Index".to_string(),
            description: "Disables Windows network throttling for gaming".to_string(),
            current_value: "Enabled".to_string(),
            recommended_value: "Disabled".to_string(),
            category: "Throttling".to_string(),
        },
        NetworkSetting {
            id: "tcp-no-delay".to_string(),
            name: "TCP No Delay".to_string(),
            description: "Disables Nagle's algorithm for lower latency".to_string(),
            current_value: "Default".to_string(),
            recommended_value: "Enabled".to_string(),
            category: "Latency".to_string(),
        },
        NetworkSetting {
            id: "max-connections-per-server".to_string(),
            name: "Max Connections per Server".to_string(),
            description: "Increases simultaneous connections for downloads".to_string(),
            current_value: "Default".to_string(),
            recommended_value: "16".to_string(),
            category: "Throughput".to_string(),
        },
        NetworkSetting {
            id: "dns-cache".to_string(),
            name: "DNS Cache".to_string(),
            description: "Large DNS cache for faster resolution".to_string(),
            current_value: "Default".to_string(),
            recommended_value: "Optimized".to_string(),
            category: "DNS".to_string(),
        },
        NetworkSetting {
            id: "mtu-size".to_string(),
            name: "MTU Size".to_string(),
            description: "Maximum Transmission Unit for adapter".to_string(),
            current_value: "Default".to_string(),
            recommended_value: "1500".to_string(),
            category: "Throughput".to_string(),
        },
    ];
    Ok(settings)
}

#[command]
pub async fn apply_network_optimizations(settings: Vec<String>) -> Result<NetworkOptimizationResult, String> {
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
        let script_clone = script.to_string();
        let _ = tokio::task::spawn_blocking(move || crate::services::file_io::run_powershell(&script_clone, &[])).await;
    }
    Ok(NetworkOptimizationResult {
        success: true,
        message: if changed.is_empty() {
            "No changes applied".to_string()
        } else {
            format!("Applied {} optimization(s)", changed.len())
        },
        settings_changed: changed,
    })
}

#[command]
pub async fn get_network_profile() -> Result<String, String> {
    let script = r#"
$prof = Get-NetConnectionProfile -ErrorAction SilentlyContinue
if ($prof) { $prof.NetworkCategory } else { 'Unknown' }
"#;
    tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())?
}

#[command]
pub async fn set_network_profile(profile: String) -> Result<String, String> {
    let cat = match profile.as_str() {
        "Private" => "Private",
        "Public" => "Public",
        _ => return Err("Invalid profile. Use Private or Public".into()),
    };
    let script = format!(
        r#"Get-NetConnectionProfile -ErrorAction SilentlyContinue | Set-NetConnectionProfile -NetworkCategory "{}""#,
        cat
    );
    tokio::task::spawn_blocking(move || run_ps(&script)).await.map_err(|e| e.to_string())?.map(|_| format!("Network profile set to {}", cat))
}
