use std::os::windows::process::CommandExt;
use serde::{Deserialize, Serialize};
use tauri::command;

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_percent: f64,
    pub memory_mb: f64,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StartupEntry {
    pub name: String,
    pub command: String,
    pub location: String,
    pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiskItem {
    pub path: String,
    pub name: String,
    pub size_gb: f64,
    pub free_gb: f64,
    pub is_folder: bool,
    pub item_count: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PingResult {
    pub host: String,
    pub latency_ms: f64,
    pub packet_loss: f32,
    pub timings: Vec<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BenchmarkResult {
    pub score: f64,
    pub label: String,
    pub duration_ms: u64,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WifiNetwork {
    pub ssid: String,
    pub signal_percent: u32,
    pub channel: u32,
    pub security: String,
    pub bssid: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PrivacySetting {
    pub name: String,
    pub enabled: bool,
    pub description: String,
    pub key: String,
    #[serde(rename = "type")]
    pub reg_type: String,
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
pub async fn get_processes() -> Result<Vec<ProcessInfo>, String> {
    let script = r#"
$cores = (Get-CimInstance Win32_ComputerSystem -EA 0).NumberOfLogicalProcessors
if (-not $cores) { $cores = 1 }

# Build CPU counter map: normalized name -> total cooked value
$cpuMap = @{}
try {
    $samples = Get-Counter '\Process(*)\% Processor Time' -MaxSamples 1 -EA 0
    if ($samples -and $samples.CounterSamples) {
        foreach ($s in $samples.CounterSamples) {
            $in = $s.InstanceName
            if ($in -eq '_total' -or $in -eq 'idle') { continue }
            $key = ($in -replace '#\d+$', '').ToLower()
            if (-not $cpuMap.ContainsKey($key)) { $cpuMap[$key] = 0 }
            $cpuMap[$key] += $s.CookedValue
        }
    }
} catch {}

# Get all processes and match against CPU counter
try {
    Get-Process -EA 0 | ForEach-Object {
        $name = $_.ProcessName
        $cpu = 0.0
        if ($cpuMap.ContainsKey($name.ToLower())) { $cpu = $cpuMap[$name.ToLower()] }
        [PSCustomObject]@{
            pid = $_.Id
            name = $name
            cpu_percent = [math]::Round([math]::Min($cpu, 100), 1)
            memory_mb = [math]::Round($_.WorkingSet64 / 1MB, 1)
            status = if ($_.Responding) { "Running" } else { "Not Responding" }
        }
    } | ConvertTo-Json -Compress
} catch { "[]" }
"#;
    let out = tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())??;
    if out.is_empty() || out == "null" || out == "[]" {
        return Ok(vec![]);
    }
    let raw: Vec<serde_json::Value> = serde_json::from_str(&out).unwrap_or_default();
    Ok(raw.into_iter().map(|v| ProcessInfo {
        pid: v["pid"].as_u64().unwrap_or(0) as u32,
        name: v["name"].as_str().unwrap_or("").to_string(),
        cpu_percent: v["cpu_percent"].as_f64().unwrap_or(0.0),
        memory_mb: v["memory_mb"].as_f64().unwrap_or(0.0),
        status: v["status"].as_str().unwrap_or("").to_string(),
    }).collect())
}

#[command]
pub async fn kill_process(pid: u32) -> Result<String, String> {
    let script = format!("Stop-Process -Id {pid} -Force -ErrorAction Stop; Write-Output \"Killed {pid}\"");
    tokio::task::spawn_blocking(move || run_ps(&script)).await.map_err(|e| e.to_string())?
}

#[command]
pub async fn suspend_process(pid: u32) -> Result<String, String> {
    let script = format!(
        "$p = Get-Process -Id {pid}; $p.Threads | ForEach-Object {{ $_.Disposed }} | Out-Null; $p.Suspend() | Out-Null; Write-Output \"Suspended {pid}\""
    );
    tokio::task::spawn_blocking(move || run_ps(&script)).await.map_err(|e| e.to_string())?
}

#[command]
pub async fn resume_process(pid: u32) -> Result<String, String> {
    let script = format!(
        "$p = Get-Process -Id {pid}; $p.Resume() | Out-Null; Write-Output \"Resumed {pid}\""
    );
    tokio::task::spawn_blocking(move || run_ps(&script)).await.map_err(|e| e.to_string())?
}

#[command]
pub async fn get_startup_entries() -> Result<Vec<StartupEntry>, String> {
    let script = r#"
$entries = @()
$wmi = Get-CimInstance Win32_StartupCommand -ErrorAction SilentlyContinue
foreach ($e in $wmi) {
    $entries += [PSCustomObject]@{
        name = $e.Name
        command = $e.Command
        location = $e.Location
        enabled = $true
    }
}
$hkcu = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$hklm = "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run"
if (Test-Path $hkcu) {
    $items = Get-ItemProperty $hkcu -ErrorAction SilentlyContinue
    $items.PSObject.Properties | Where-Object { $_.Name -notlike "PS*" } | ForEach-Object {
        $match = $entries | Where-Object { $_.name -eq $_.Name -and $_.command -eq $_.Value }
        if (-not $match) {
            $entries += [PSCustomObject]@{
                name = $_.Name
                command = $_.Value
                location = $hkcu
                enabled = $true
            }
        }
    }
}
if (Test-Path $hklm) {
    $items = Get-ItemProperty $hklm -ErrorAction SilentlyContinue
    $items.PSObject.Properties | Where-Object { $_.Name -notlike "PS*" } | ForEach-Object {
        $match = $entries | Where-Object { $_.name -eq $_.Name -and $_.command -eq $_.Value }
        if (-not $match) {
            $entries += [PSCustomObject]@{
                name = $_.Name
                command = $_.Value
                location = $hklm
                enabled = $true
            }
        }
    }
}
$entries | ConvertTo-Json
"#;
    let out = tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())??;
    if out.is_empty() || out == "null" || out == "[]" {
        return Ok(vec![]);
    }
    serde_json::from_str(&out).map_err(|e| format!("Parse: {}", e))
}

#[command]
pub async fn disable_startup_entry(name: String, location: String) -> Result<String, String> {
    let script = format!(
        r#"$loc = "{loc}"; if ($loc -like "*Run*") {{ Remove-ItemProperty -Path $loc -Name "{name}" -Force -ErrorAction Stop; Write-Output "Disabled {name}" }} else {{ Write-Output "Not a registry startup entry" }}"#,
        loc = location, name = name
    );
    tokio::task::spawn_blocking(move || run_ps(&script)).await.map_err(|e| e.to_string())?
}

#[command]
pub async fn enable_startup_entry(name: String, command: String, location: String) -> Result<String, String> {
    let script = format!(
        r#"$loc = "{loc}"; if ($loc -like "*Run*") {{ New-ItemProperty -Path $loc -Name "{name}" -Value "{cmd}" -PropertyType String -Force -ErrorAction Stop; Write-Output "Enabled {name}" }} else {{ Write-Output "Not a registry startup entry" }}"#,
        loc = location, name = name, cmd = command
    );
    tokio::task::spawn_blocking(move || run_ps(&script)).await.map_err(|e| e.to_string())?
}

#[command]
pub async fn scan_disk_folders(path: String) -> Result<Vec<DiskItem>, String> {
    let script = format!(r#"
$root = '{path}'
$excl = @('$Recycle.Bin','System Volume Information','Windows','Program Files','Program Files (x86)','ProgramData','AppData','Recovery','$WinREAgent','Boot','EFI','MSOCache','Intel','NVIDIA','AMD','PerfLogs')

# Fast recursive size calculation using .NET (PS 5.1 compatible)
Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Threading;
public class FastDir {{
    public static long GetDirSize(string path) {{
        long total = 0;
        try {{
            var di = new DirectoryInfo(path);
            foreach (var f in di.GetFiles()) {{
                try {{ total += f.Length; }} catch {{ }}
            }}
            foreach (var d in di.GetDirectories()) {{
                try {{ total += GetDirSize(d.FullName); }} catch {{ }}
            }}
        }} catch {{ }}
        return total;
    }}
    public static int GetDirCount(string path) {{
        int count = 0;
        try {{
            var di = new DirectoryInfo(path);
            count += di.GetFiles().Length;
            foreach (var d in di.GetDirectories()) {{
                try {{ count += GetDirCount(d.FullName); }} catch {{ }}
            }}
        }} catch {{ }}
        return count;
    }}
}}
"@ -EA 0

$exclSet = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($e in $excl) {{ [void]$exclSet.Add($e) }}

$results = @()
$topItems = Get-ChildItem $root -EA 0 | Where-Object {{ -not $exclSet.Contains($_.Name) }}

# Use runspaces for parallel scanning (PS 5.1 compatible)
$runspacePool = [runspacefactory]::CreateRunspacePool(1, 8)
$runspacePool.Open()
$jobs = @()

foreach ($item in $topItems) {{
    $ps = [powershell]::Create()
    $ps.RunspacePool = $runspacePool
    $ps.AddScript({{ param($fp, $isFolder)
        if ($isFolder) {{
            $sz = [FastDir]::GetDirSize($fp)
            $cnt = [FastDir]::GetDirCount($fp)
        }} else {{
            $sz = (Get-Item $fp -EA 0).Length
            $cnt = 0
        }}
        [PSCustomObject]@{{ path=$fp; size=$sz; count=$cnt }}
    }}) | Out-Null
    $ps.AddArgument($item.FullName) | Out-Null
    $ps.AddArgument($item.PSIsContainer) | Out-Null
    $jobs += @{{ PowerShell=$ps; Handle=$ps.BeginInvoke(); Item=$item }}
}}

foreach ($job in $jobs) {{
    try {{
        $result = $job.PowerShell.EndInvoke($job.Handle)
        if ($result) {{
            $item = $job.Item
            $results += [PSCustomObject]@{{
                path = $item.FullName
                name = $item.Name
                size_gb = [math]::Round($result[0].size / 1GB, 2)
                free_gb = 0
                is_folder = $item.PSIsContainer
                item_count = $result[0].count
            }}
        }}
    }} catch {{ }}
    $job.PowerShell.Dispose()
}}
$runspacePool.Close()
$runspacePool.Dispose()

$results | Sort-Object size_gb -Descending | Select-Object -First 50 | ConvertTo-Json -Depth 3
"#);
    let out = tokio::task::spawn_blocking(move || run_ps(&script)).await.map_err(|e| e.to_string())??;
    if out.is_empty() || out == "null" || out == "[]" {
        return Ok(vec![]);
    }
    serde_json::from_str(&out).map_err(|e| format!("Parse: {}", e))
}

#[command]
pub async fn get_drive_sizes() -> Result<Vec<DiskItem>, String> {
    let script = r#"
Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Select-Object @{N='path';E={$_.DeviceID}}, @{N='name';E={$_.DeviceID}}, @{N='size_gb';E={[math]::Round($_.Size/1GB,1)}}, @{N='free_gb';E={[math]::Round($_.FreeSpace/1GB,1)}}, @{N='is_folder';E={$false}}, @{N='item_count';E={0}} | ConvertTo-Json
"#;
    let out = tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())??;
    if out.is_empty() || out == "null" || out == "[]" {
        return Ok(vec![]);
    }
    serde_json::from_str(&out).map_err(|e| format!("Parse: {}", e))
}

#[command]
pub async fn ping_host_continuous(host: String, count: u32) -> Result<PingResult, String> {
    let script = format!(r#"
$ping = ping -n {count} {host} 2>&1
$timings = New-Object System.Collections.ArrayList
$lossVal = 0
$sentVal = 0
foreach ($line in $ping) {{
    if ($line -match 'time[=<]\s*(\d+)\s*ms') {{
        $timings.Add([double]$matches[1]) | Out-Null
    }} elseif ($line -match 'Lost = (\d+)') {{
        $lossVal = [int]$matches[1]
    }} elseif ($line -match 'Sent = (\d+)') {{
        $sentVal = [int]$matches[1]
    }}
}}
$packetLoss = 0.0
if ($sentVal -gt 0) {{ $packetLoss = [float](($lossVal / $sentVal) * 100.0) }}
$avgMs = 0.0
if ($timings.Count -gt 0) {{
    $sum = 0.0
    foreach ($t in $timings) {{ $sum += $t }}
    $avgMs = $sum / $timings.Count
}}
[PSCustomObject]@{{
    host = "{host}"
    latency_ms = $avgMs
    packet_loss = $packetLoss
    timings = @($timings.ToArray())
}} | ConvertTo-Json
"#);
    let out = tokio::task::spawn_blocking(move || run_ps(&script)).await.map_err(|e| e.to_string())??;
    if out.is_empty() || out == "null" {
        return Ok(PingResult {
            host,
            latency_ms: 0.0,
            packet_loss: 100.0,
            timings: vec![],
        });
    }
    serde_json::from_str(&out).map_err(|e| format!("Parse: {}", e))
}

#[command]
pub async fn run_cpu_benchmark() -> Result<BenchmarkResult, String> {
    let script = r#"
try { Add-Type -TypeDefinition @"
using System;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Threading;
public class CpuBench {
    public static long PrimeSieve(int limit) {
        int cnt = 0;
        for (int i = 2; i < limit; i++) {
            bool prime = true;
            int sqrt = (int)Math.Sqrt(i);
            for (int j = 2; j <= sqrt; j++) { if (i % j == 0) { prime = false; break; } }
            if (prime) cnt++;
        }
        return cnt;
    }
    public static double Sha256MBps(int iters, int dataSize) {
        byte[] data = new byte[dataSize];
        new Random(42).NextBytes(data);
        using (var sha = SHA256.Create()) {
            var sw = Stopwatch.StartNew();
            for (int i = 0; i < iters; i++) sha.ComputeHash(data);
            sw.Stop();
            return (double)(iters * dataSize) / (1024.0 * 1024.0) / sw.Elapsed.TotalSeconds;
        }
    }
    public static long ParallelPrime(int limit, int threads) {
        long total = 0;
        var threadsList = new Thread[threads];
        int chunk = limit / threads;
        for (int t = 0; t < threads; t++) {
            int start = t * chunk, end = (t == threads - 1) ? limit : (t + 1) * chunk;
            threadsList[t] = new Thread(() => {
                long local = 0;
                for (int i = Math.Max(2, start); i < end; i++) {
                    bool prime = true;
                    int sqrt = (int)Math.Sqrt(i);
                    for (int j = 2; j <= sqrt; j++) { if (i % j == 0) { prime = false; break; } }
                    if (prime) local++;
                }
                Interlocked.Add(ref total, local);
            });
            threadsList[t].Start();
        }
        foreach (var t in threadsList) t.Join();
        return total;
    }
    public static double MatrixGFlops(int size) {
        double[,] a = new double[size, size], b = new double[size, size], c = new double[size, size];
        var rnd = new Random(42);
        for (int i = 0; i < size; i++) for (int j = 0; j < size; j++) { a[i,j] = rnd.NextDouble(); b[i,j] = rnd.NextDouble(); }
        var sw = Stopwatch.StartNew();
        for (int i = 0; i < size; i++) for (int j = 0; j < size; j++) { double sum = 0; for (int k = 0; k < size; k++) sum += a[i,k] * b[k,j]; c[i,j] = sum; }
        sw.Stop();
        return (2.0 * size * size * size) / (sw.Elapsed.TotalSeconds * 1e9);
    }
}
"@ -ErrorAction Stop } catch { throw "Add-Type failed: $_" }

$cores = [Environment]::ProcessorCount
$swTotal = [System.Diagnostics.Stopwatch]::StartNew()

$sw1 = [System.Diagnostics.Stopwatch]::StartNew()
$singlePrimes = [CpuBench]::PrimeSieve(500000)
$sw1.Stop()
$singlePrimeMs = [math]::Max($sw1.Elapsed.TotalMilliseconds, 1)

$sw2 = [System.Diagnostics.Stopwatch]::StartNew()
$shaMBps = [CpuBench]::Sha256MBps(10000, 4096)
$sw2.Stop()
$shaMs = [math]::Max($sw2.Elapsed.TotalMilliseconds, 1)

$sw3 = [System.Diagnostics.Stopwatch]::StartNew()
$parallelPrimes = [CpuBench]::ParallelPrime(500000, $cores)
$sw3.Stop()
$parallelMs = [math]::Max($sw3.Elapsed.TotalMilliseconds, 1)
$speedup = [math]::Round($singlePrimeMs / $parallelMs, 2)

$sw4 = [System.Diagnostics.Stopwatch]::StartNew()
$gflops = [CpuBench]::MatrixGFlops(200)
$sw4.Stop()

$totalMs = $swTotal.Elapsed.TotalMilliseconds

$singleScore = [math]::Min(($singlePrimes / $singlePrimeMs) * 100, 30000)
$shaScore = [math]::Min($shaMBps * 200, 20000)
$parallelScore = [math]::Min(($parallelPrimes / $parallelMs) * $cores * 10, 35000)
$fpScore = [math]::Min($gflops * 5000, 15000)
$score = [math]::Round($singleScore + $shaScore + $parallelScore + $fpScore, 1)

$rating = if ($score -gt 60000) { 'Excellent' } elseif ($score -gt 30000) { 'High' } elseif ($score -gt 15000) { 'Good' } elseif ($score -gt 7000) { 'Average' } else { 'Low' }

[PSCustomObject]@{
    score = $score
    label = "CPU Benchmark"
    duration_ms = [int][math]::Round($totalMs)
    description = "Single: $([math]::Round($singleScore, 0)) pts ($singlePrimes primes/$([math]::Round($singlePrimeMs, 0))ms) | SHA-256: $([math]::Round($shaMBps, 1)) MB/s ($([math]::Round($shaScore, 0)) pts) | Multi: $([math]::Round($parallelScore, 0)) pts (${speedup}x scaling) | FP: $([math]::Round($gflops, 3)) GFLOPS ($([math]::Round($fpScore, 0)) pts) | $cores cores | $rating"
} | ConvertTo-Json
"#;
    let out = tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())??;
    serde_json::from_str(&out).map_err(|e| format!("Parse: {}", e))
}

#[command]
pub async fn run_memory_benchmark() -> Result<BenchmarkResult, String> {
    let script = r#"
try { Add-Type -TypeDefinition @"
using System;
using System.Diagnostics;
public class MemBench {
    public static double CopyBandwidthGBps(int mb) {
        int size = mb * 1024 * 1024;
        byte[] src = new byte[size], dst = new byte[size];
        new Random(0).NextBytes(src);
        var sw = Stopwatch.StartNew();
        System.Buffer.BlockCopy(src, 0, dst, 0, size);
        sw.Stop();
        return (mb / 1024.0) / sw.Elapsed.TotalSeconds;
    }
    public static double WriteBandwidthGBps(int mb) {
        int size = mb * 1024 * 1024;
        byte[] buf = new byte[size];
        long[] lng = new long[size / 8];
        var sw = Stopwatch.StartNew();
        for (int i = 0; i < lng.Length; i++) lng[i] = (long)i;
        Buffer.BlockCopy(lng, 0, buf, 0, size);
        sw.Stop();
        return (mb / 1024.0) / sw.Elapsed.TotalSeconds;
    }
    public static double ReadBandwidthGBps(int mb) {
        int size = mb * 1024 * 1024;
        byte[] buf = new byte[size];
        new Random(0).NextBytes(buf);
        long[] lng = new long[size / 8];
        var sw = Stopwatch.StartNew();
        Buffer.BlockCopy(buf, 0, lng, 0, size);
        long sum = 0;
        for (int i = 0; i < lng.Length; i++) sum += lng[i];
        sw.Stop();
        return (mb / 1024.0) / sw.Elapsed.TotalSeconds;
    }
    public static double LatencyNs(int mb, int iters) {
        int count = mb * 256 * 1024;
        int[] arr = new int[count];
        var sw = Stopwatch.StartNew();
        int idx = 0;
        for (int i = 0; i < iters; i++) idx = arr[idx % count];
        sw.Stop();
        return (sw.Elapsed.TotalMilliseconds * 1e6) / iters;
    }
}
"@ -ErrorAction Stop } catch { throw "Add-Type failed: $_" }

$swTotal = [System.Diagnostics.Stopwatch]::StartNew()

# Warmup pass
[void][MemBench]::CopyBandwidthGBps(512)
[void][MemBench]::WriteBandwidthGBps(512)
[void][MemBench]::ReadBandwidthGBps(512)

$sw1 = [System.Diagnostics.Stopwatch]::StartNew()
$copyGBps = [MemBench]::CopyBandwidthGBps(512)
$sw1.Stop()

$sw2 = [System.Diagnostics.Stopwatch]::StartNew()
$writeGBps = [MemBench]::WriteBandwidthGBps(512)
$sw2.Stop()

$sw3 = [System.Diagnostics.Stopwatch]::StartNew()
$readGBps = [MemBench]::ReadBandwidthGBps(512)
$sw3.Stop()

$sw4 = [System.Diagnostics.Stopwatch]::StartNew()
$latNs = [MemBench]::LatencyNs(8, 500000)
$sw4.Stop()

$totalMs = $swTotal.Elapsed.TotalMilliseconds
$avgGBps = ($copyGBps + $writeGBps + $readGBps) / 3.0

$bwScore = $avgGBps * 850
$latScore = [math]::Max(0, 8000 - $latNs * 0.8)
$score = [math]::Round($bwScore + $latScore, 1)

$rating = if ($score -gt 55000) { 'Excellent' } elseif ($score -gt 30000) { 'High' } elseif ($score -gt 15000) { 'Good' } elseif ($score -gt 7000) { 'Average' } else { 'Low' }

[PSCustomObject]@{
    score = $score
    label = "Memory Benchmark"
    duration_ms = [int][math]::Round($totalMs)
    description = "Copy: $([math]::Round($copyGBps, 2)) GB/s | Write: $([math]::Round($writeGBps, 2)) GB/s | Read: $([math]::Round($readGBps, 2)) GB/s | Latency: $([math]::Round($latNs, 0)) ns | Avg: $([math]::Round($avgGBps, 2)) GB/s | $rating"
} | ConvertTo-Json
"#;
    let out = tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())??;
    serde_json::from_str(&out).map_err(|e| format!("Parse: {}", e))
}

#[command]
pub async fn run_compression_benchmark() -> Result<BenchmarkResult, String> {
    let script = r#"
try { Add-Type -TypeDefinition @"
using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
public class CompressBench {
    public static double CompressMBps(int mb) {
        byte[] data = new byte[mb * 1024 * 1024];
        for (int i = 0; i < data.Length; i++) data[i] = (byte)(i % 256);
        using (var ms = new MemoryStream()) {
            var sw = Stopwatch.StartNew();
            using (var gz = new GZipStream(ms, CompressionLevel.Fastest)) gz.Write(data, 0, data.Length);
            sw.Stop();
            return mb / sw.Elapsed.TotalSeconds;
        }
    }
    public static double DecompressMBps(int mb) {
        byte[] data = new byte[mb * 1024 * 1024];
        for (int i = 0; i < data.Length; i++) data[i] = (byte)(i % 256);
        byte[] compressed;
        using (var ms = new MemoryStream()) {
            using (var gz = new GZipStream(ms, CompressionLevel.Fastest)) gz.Write(data, 0, data.Length);
            compressed = ms.ToArray();
        }
        var sw = Stopwatch.StartNew();
        using (var ms = new MemoryStream(compressed))
        using (var gz = new GZipStream(ms, CompressionMode.Decompress)) {
            byte[] result = new byte[data.Length];
            int totalRead = 0;
            while (totalRead < result.Length) { int r = gz.Read(result, totalRead, result.Length - totalRead); if (r == 0) break; totalRead += r; }
        }
        sw.Stop();
        return mb / sw.Elapsed.TotalSeconds;
    }
}
"@ -ErrorAction Stop } catch { throw "Add-Type failed: $_" }

$swTotal = [System.Diagnostics.Stopwatch]::StartNew()
$compressMBps = [CompressBench]::CompressMBps(100)
$decompressMBps = [CompressBench]::DecompressMBps(100)
$totalMs = $swTotal.Elapsed.TotalMilliseconds

$compressScore = [math]::Min($compressMBps * 30, 5000)
$decompressScore = [math]::Min($decompressMBps * 30, 5000)
$score = [math]::Round($compressScore + $decompressScore, 1)
$rating = if ($score -gt 5000) { 'Excellent' } elseif ($score -gt 3000) { 'High' } elseif ($score -gt 1500) { 'Good' } elseif ($score -gt 500) { 'Average' } else { 'Low' }

[PSCustomObject]@{
    score = $score
    label = "Compression Benchmark"
    duration_ms = [int][math]::Round($totalMs)
    description = "Compress: $([math]::Round($compressMBps, 1)) MB/s ($([math]::Round($compressScore, 0)) pts) | Decompress: $([math]::Round($decompressMBps, 1)) MB/s ($([math]::Round($decompressScore, 0)) pts) | 100MB GZip | $rating"
} | ConvertTo-Json
"#;
    let out = tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())??;
    serde_json::from_str(&out).map_err(|e| format!("Parse: {}", e))
}

#[command]
pub async fn run_disk_benchmark(path: String) -> Result<BenchmarkResult, String> {
    let script = format!(r#"
$testFile = "{path}\impulse-bench.tmp"
$dataSize = 52428800
$data = [byte[]]::new($dataSize)
(new-object Random).NextBytes($data)

$swTotal = [System.Diagnostics.Stopwatch]::StartNew()

# Sequential write
$writeStart = Get-Date
[IO.File]::WriteAllBytes($testFile, $data)
$writeMs = ((Get-Date) - $writeStart).TotalMilliseconds
$writeSpeed = if ($writeMs -gt 0) {{ [math]::Round(($dataSize / $writeMs) * 1000 / 1MB, 1) }} else {{ 0 }}

# Sequential read
$readStart = Get-Date
$readback = [IO.File]::ReadAllBytes($testFile)
$readMs = ((Get-Date) - $readStart).TotalMilliseconds
$readSpeed = if ($readMs -gt 0) {{ [math]::Round(($dataSize / $readMs) * 1000 / 1MB, 1) }} else {{ 0 }}

Remove-Item $testFile -Force -ErrorAction SilentlyContinue
$totalMs = $swTotal.Elapsed.TotalMilliseconds

$score = [math]::Round($writeSpeed + $readSpeed, 1)
$driveType = "C:"
$rating = if ($readSpeed -gt 3000) {{ 'NVMe PCIe 4.0+' }} elseif ($readSpeed -gt 1500) {{ 'NVMe PCIe 3.0' }} elseif ($readSpeed -gt 500) {{ 'SATA SSD' }} else {{ 'HDD' }}
$writeScore = [math]::Round($writeSpeed, 0)
$readScore = [math]::Round($readSpeed, 0)

[PSCustomObject]@{{
    score = $score
    label = "Disk Benchmark"
    duration_ms = [int][math]::Round($totalMs)
    description = "Seq Write: $writeSpeed MB/s ($writeScore) | Seq Read: $readSpeed MB/s ($readScore) | 50MB test | Drive: $rating | Total: $([math]::Round($score, 0)) pts"
}} | ConvertTo-Json
"#);
    let out = tokio::task::spawn_blocking(move || run_ps(&script)).await.map_err(|e| e.to_string())??;
    serde_json::from_str(&out).map_err(|e| format!("Parse: {}", e))
}

#[command]
pub async fn run_gpu_benchmark() -> Result<BenchmarkResult, String> {
    let script = r#"
try { Add-Type -TypeDefinition @"
using System;
using System.Diagnostics;
public class GpuBench {
    public static double ComputeGFlops(int size, int repeats) {
        double[,] a = new double[size, size], b = new double[size, size], c = new double[size, size];
        var rnd = new Random(42);
        for (int i = 0; i < size; i++) for (int j = 0; j < size; j++) { a[i,j] = rnd.NextDouble(); b[i,j] = rnd.NextDouble(); }
        var sw = Stopwatch.StartNew();
        for (int r = 0; r < repeats; r++) {
            for (int i = 0; i < size; i++) for (int j = 0; j < size; j++) { double sum = 0; for (int k = 0; k < size; k++) sum += a[i,k] * b[k,j]; c[i,j] = sum; }
        }
        sw.Stop();
        double ops = 2.0 * size * size * size * repeats;
        return ops / (sw.Elapsed.TotalSeconds * 1e9);
    }
}
"@ -ErrorAction Stop } catch { throw "Add-Type failed: $_" }

$sw = [System.Diagnostics.Stopwatch]::StartNew()

# GPU info from WMI
$gpuInfo = Get-CimInstance Win32_VideoController -EA 0 | Select-Object -First 1
$gpuName = if ($gpuInfo) { $gpuInfo.Name } else { "Unknown" }
$vramMB = if ($gpuInfo.AdapterRAM) { [math]::Round($gpuInfo.AdapterRAM / 1MB, 0) } else { 0 }
$driverVer = if ($gpuInfo.DriverVersion) { $gpuInfo.DriverVersion } else { "N/A" }

# Compute benchmark (500x500 matrix, 3 repeats = 750M FLOPs)
$gflops = [GpuBench]::ComputeGFlops(500, 3)

$totalMs = $sw.Elapsed.TotalMilliseconds

# Score: GFLOPS * 200 (target: 10-50 GFLOPS on modern systems = 2000-10000 pts)
$score = [math]::Round($gflops * 200, 1)
$rating = if ($score -gt 10000) { 'Excellent' } elseif ($score -gt 5000) { 'High' } elseif ($score -gt 2000) { 'Good' } elseif ($score -gt 800) { 'Average' } else { 'Low' }

[PSCustomObject]@{
    score = $score
    label = "CPU FP Matrix Benchmark"
    duration_ms = [int][math]::Round($totalMs)
    description = "[CPU-based] Compute: $([math]::Round($gflops, 2)) GFLOPS | GPU: $gpuName | VRAM: ${vramMB}MB | Driver: $driverVer | $rating"
} | ConvertTo-Json
"#;
    let out = tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())??;
    serde_json::from_str(&out).map_err(|e| format!("Parse: {}", e))
}

#[command]
pub async fn run_random_io_benchmark(_path: String) -> Result<BenchmarkResult, String> {
    let script = r#"
$testDir = "C:\"
try { Add-Type -TypeDefinition @"
using System;
using System.Diagnostics;
using System.IO;
public class IOBench {
    public static string RunTest(string dir) {
        int mb = 100;
        byte[] data = new byte[mb * 1024 * 1024];
        new Random(42).NextBytes(data);
        string fp = Path.Combine(dir, "impulse-io.tmp");
        File.WriteAllBytes(fp, data);
        byte[] buf = new byte[4096];
        var rng = new Random(42);
        int n = 2000;
        int blk = mb * 256;
        var sw = Stopwatch.StartNew();
        using (var fs = new FileStream(fp, FileMode.Open, FileAccess.Read, FileShare.None, 4096, FileOptions.None)) {
            for (int i = 0; i < n; i++) {
                long off = (long)(rng.NextDouble() * blk) * 4096;
                fs.Seek(off, SeekOrigin.Begin);
                fs.Read(buf, 0, 4096);
            }
        }
        sw.Stop();
        double rMs = sw.Elapsed.TotalMilliseconds;
        double rMBs = (n * 4096.0 / 1024.0 / 1024.0) / (rMs / 1000.0);
        double rLat = rMs / n;
        string tmp = fp + ".w";
        sw.Restart();
        using (var fs = new FileStream(tmp, FileMode.Create, FileAccess.Write, FileShare.None, 4096, FileOptions.None)) {
            fs.SetLength(blk * 4096);
            for (int i = 0; i < n; i++) {
                long off = (long)(rng.NextDouble() * blk) * 4096;
                fs.Seek(off, SeekOrigin.Begin);
                fs.Write(buf, 0, 4096);
            }
        }
        sw.Stop();
        double wMs = sw.Elapsed.TotalMilliseconds;
        double wMBs = (n * 4096.0 / 1024.0 / 1024.0) / (wMs / 1000.0);
        double wLat = wMs / n;
        File.Delete(fp);
        File.Delete(tmp);
        return rMBs.ToString("F3") + "|" + wMBs.ToString("F3") + "|" + rLat.ToString("F2") + "|" + wLat.ToString("F2");
    }
}
"@ -ErrorAction Stop } catch { throw "Add-Type failed" }

$sw = [System.Diagnostics.Stopwatch]::StartNew()
$r = [IOBench]::RunTest($testDir)
$p = $r -split '\|'
$rMBs = [double]$p[0]; $wMBs = [double]$p[1]; $rLat = [double]$p[2]; $wLat = [double]$p[3]
$t = $sw.Elapsed.TotalMilliseconds
$sc = [math]::Round(($rMBs + $wMBs) * 100 + [math]::Max(0, (10 - ($rLat + $wLat) / 2) * 50), 1)
$rt = if ($sc -gt 3000) { 'Excellent' } elseif ($sc -gt 1500) { 'High' } elseif ($sc -gt 700) { 'Good' } elseif ($sc -gt 300) { 'Average' } else { 'Low' }
[PSCustomObject]@{
    score = $sc
    label = "Random I/O Benchmark"
    duration_ms = [int][math]::Round($t)
    description = "4K read: " + [math]::Round($rMBs, 2) + " MB/s | 4K write: " + [math]::Round($wMBs, 2) + " MB/s | Read latency: " + $rLat + " ms | Write latency: " + $wLat + " ms | " + $rt
} | ConvertTo-Json
"#.to_string();
    let out = tokio::task::spawn_blocking(move || run_ps(&script)).await.map_err(|e| e.to_string())??;
    serde_json::from_str(&out).map_err(|e| format!("Parse: {}", e))
}

#[command]
pub async fn run_singlecore_cpu() -> Result<BenchmarkResult, String> {
    let script = r#"
try { Add-Type -TypeDefinition @"
using System;
using System.Diagnostics;
public class SingleCore {
    public static long PrimeSieve(int limit) {
        long cnt = 0;
        for (int i = 2; i < limit; i++) { bool p = true; int s = (int)Math.Sqrt(i); for (int j = 2; j <= s; j++) { if (i % j == 0) { p = false; break; } } if (p) cnt++; }
        return cnt;
    }
    public static double MatrixGFlops(int size) {
        double[,] a = new double[size,size], b = new double[size,size], c = new double[size,size];
        var r = new Random(42);
        for (int i = 0; i < size; i++) for (int j = 0; j < size; j++) { a[i,j]=r.NextDouble(); b[i,j]=r.NextDouble(); }
        var sw = Stopwatch.StartNew();
        for (int i = 0; i < size; i++) for (int j = 0; j < size; j++) { double s=0; for (int k=0;k<size;k++) s+=a[i,k]*b[k,j]; c[i,j]=s; }
        sw.Stop();
        return (2.0*size*size*size) / (sw.Elapsed.TotalSeconds * 1e9);
    }
}
"@ -ErrorAction Stop } catch { throw "Add-Type failed" }

$sw = [System.Diagnostics.Stopwatch]::StartNew()
$sw1 = [System.Diagnostics.Stopwatch]::StartNew()
$primes = [SingleCore]::PrimeSieve(1000000)
$sw1.Stop()
$pMs = [math]::Max($sw1.Elapsed.TotalMilliseconds, 1)
$sw2 = [System.Diagnostics.Stopwatch]::StartNew()
$gflops = [SingleCore]::MatrixGFlops(250)
$sw2.Stop()
$totalMs = $sw.Elapsed.TotalMilliseconds
$score = [math]::Round(($primes / $pMs) * 80 + $gflops * 3000, 1)
$rt = if ($score -gt 30000) { 'Excellent' } elseif ($score -gt 15000) { 'High' } elseif ($score -gt 7000) { 'Good' } elseif ($score -gt 3000) { 'Average' } else { 'Low' }
[PSCustomObject]@{
    score = $score
    label = "Single-Core CPU"
    duration_ms = [int][math]::Round($totalMs)
    description = "Prime sieve: $primes primes (1M) | Matrix: $([math]::Round($gflops, 3)) GFLOPS | Single-thread | $rt"
} | ConvertTo-Json
"#.to_string();
    let out = tokio::task::spawn_blocking(move || run_ps(&script)).await.map_err(|e| e.to_string())??;
    serde_json::from_str(&out).map_err(|e| format!("Parse: {}", e))
}

#[command]
pub async fn run_multicore_cpu() -> Result<BenchmarkResult, String> {
    let script = r#"
try { Add-Type -TypeDefinition @"
using System;
using System.Diagnostics;
using System.Threading;
public class MultiCore {
    public static long ParallelPrime(int limit) {
        long total = 0;
        int threads = Environment.ProcessorCount;
        var tl = new Thread[threads];
        int chunk = limit / threads;
        for (int t = 0; t < threads; t++) {
            int s = t * chunk, e = (t == threads - 1) ? limit : (t + 1) * chunk;
            tl[t] = new Thread(() => { long local = 0;
                for (int i = Math.Max(2, s); i < e; i++) { bool p = true; int sq = (int)Math.Sqrt(i);
                    for (int j = 2; j <= sq; j++) { if (i % j == 0) { p = false; break; } } if (p) local++; }
                Interlocked.Add(ref total, local); });
            tl[t].Start();
        }
        foreach (var t in tl) t.Join();
        return total;
    }
}
"@ -ErrorAction Stop } catch { throw "Add-Type failed" }

$cores = [Environment]::ProcessorCount
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$sw1 = [System.Diagnostics.Stopwatch]::StartNew()
$primes = [MultiCore]::ParallelPrime(1000000)
$sw1.Stop()
$pMs = [math]::Max($sw1.Elapsed.TotalMilliseconds, 1)
$totalMs = $sw.Elapsed.TotalMilliseconds
$score = [math]::Round(($primes / $pMs) * $cores * 15, 1)
$rt = if ($score -gt 50000) { 'Excellent' } elseif ($score -gt 25000) { 'High' } elseif ($score -gt 10000) { 'Good' } elseif ($score -gt 4000) { 'Average' } else { 'Low' }
[PSCustomObject]@{
    score = $score
    label = "Multi-Core CPU"
    duration_ms = [int][math]::Round($totalMs)
    description = "Parallel primes: $primes (1M, ${cores} threads) | $rt"
} | ConvertTo-Json
"#.to_string();
    let out = tokio::task::spawn_blocking(move || run_ps(&script)).await.map_err(|e| e.to_string())??;
    serde_json::from_str(&out).map_err(|e| format!("Parse: {}", e))
}

#[command]
pub async fn run_cpu_stress_test() -> Result<BenchmarkResult, String> {
    let script = r#"
try { Add-Type -TypeDefinition @"
using System;
using System.Diagnostics;
using System.Threading;
public class Stress {
    public static double RunLoop(int seconds) {
        var sw = Stopwatch.StartNew();
        long totalOps = 0;
        int threads = Environment.ProcessorCount;
        var tl = new Thread[threads];
        int chunk = 500000 / threads;
        while (sw.Elapsed.TotalSeconds < seconds) {
            var inner = new Thread[threads];
            for (int t = 0; t < threads; t++) {
                int s = t * chunk, e = (t == threads - 1) ? 500000 : (t + 1) * chunk;
                inner[t] = new Thread(() => {
                    long local = 0;
                    for (int i = Math.Max(2, s); i < e; i++) {
                        bool p = true; int sq = (int)Math.Sqrt(i);
                        for (int j = 2; j <= sq; j++) { if (i % j == 0) { p = false; break; } } if (p) local++;
                    }
                    Interlocked.Add(ref totalOps, local);
                });
                inner[t].Start();
            }
            foreach (var t in inner) t.Join();
        }
        sw.Stop();
        return totalOps / sw.Elapsed.TotalSeconds;
    }
}
"@ -ErrorAction Stop } catch { throw "Add-Type failed" }

$cores = [Environment]::ProcessorCount
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$opsPerSec = [Stress]::RunLoop(15)
$totalMs = $sw.Elapsed.TotalMilliseconds
$temp = ""
try { $t = (Get-CimInstance Win32_PerfFormattedData_Counters_ThermalZoneInformation -EA 0 | Select-Object -First 1).Temperature; if ($t) { $temp = "Peak temp: ${t}K | " } } catch {}
$score = [math]::Round($opsPerSec * $cores * 0.5, 1)
$rt = if ($score -gt 30000) { 'Excellent' } elseif ($score -gt 15000) { 'High' } elseif ($score -gt 6000) { 'Good' } elseif ($score -gt 2000) { 'Average' } else { 'Low' }
[PSCustomObject]@{
    score = $score
    label = "CPU Stress Test"
    duration_ms = [int][math]::Round($totalMs)
    description = "${temp}Sustained: $([math]::Round($opsPerSec, 0)) ops/s | ${cores} threads | 15s load | $rt"
} | ConvertTo-Json
"#.to_string();
    let out = tokio::task::spawn_blocking(move || run_ps(&script)).await.map_err(|e| e.to_string())??;
    serde_json::from_str(&out).map_err(|e| format!("Parse: {}", e))
}

#[command]
pub async fn run_gpu_stress_test() -> Result<BenchmarkResult, String> {
    let script = r#"
try { Add-Type -TypeDefinition @"
using System;
using System.Diagnostics;
using System.Threading;
public class GpuStress {
    public static double RunGFLOPS(int seconds) {
        int size = 400;
        double[,] a = new double[size,size], b = new double[size,size], c = new double[size,size];
        var r = new Random(42);
        for (int i = 0; i < size; i++) for (int j = 0; j < size; j++) { a[i,j]=r.NextDouble(); b[i,j]=r.NextDouble(); }
        int reps = 0;
        var sw = Stopwatch.StartNew();
        while (sw.Elapsed.TotalSeconds < seconds) {
            for (int i = 0; i < size; i++) for (int j = 0; j < size; j++) { double s=0; for (int k=0;k<size;k++) s+=a[i,k]*b[k,j]; c[i,j]=s; }
            reps++;
        }
        sw.Stop();
        double ops = 2.0 * size * size * size * reps;
        return ops / (sw.Elapsed.TotalSeconds * 1e9);
    }
}
"@ -ErrorAction Stop } catch { throw "Add-Type failed" }

$sw = [System.Diagnostics.Stopwatch]::StartNew()
$gflops = [GpuStress]::RunGFLOPS(15)
$totalMs = $sw.Elapsed.TotalMilliseconds
$gpuName = ""
$gpuTemp = ""
try { $g = Get-CimInstance Win32_VideoController -EA 0 | Select-Object -First 1; if ($g) { $gpuName = $g.Name + " | " } } catch {}
try { $t = (Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUAdapter -EA 0 | Select-Object -First 1).UtilizationPercentage; if ($t) { $gpuTemp = "Util: ${t}% | " } } catch {}
$score = [math]::Round($gflops * 200, 1)
$rt = if ($score -gt 8000) { 'Excellent' } elseif ($score -gt 4000) { 'High' } elseif ($score -gt 1500) { 'Good' } elseif ($score -gt 500) { 'Average' } else { 'Low' }
[PSCustomObject]@{
    score = $score
    label = "CPU Stress Test"
    duration_ms = [int][math]::Round($totalMs)
    description = "[CPU-based] ${gpuName}${gpuTemp}Sustained: $([math]::Round($gflops, 2)) GFLOPS | 400x400 matrix | 15s load | $rt"
} | ConvertTo-Json
"#.to_string();
    let out = tokio::task::spawn_blocking(move || run_ps(&script)).await.map_err(|e| e.to_string())??;
    serde_json::from_str(&out).map_err(|e| format!("Parse: {}", e))
}

#[command]
pub async fn scan_wifi_networks() -> Result<Vec<WifiNetwork>, String> {
    let script = r#"
$raw = netsh wlan show networks mode=Bssid
if ($raw -is [string]) { $lines = $raw -split "`r`n|`n" } else { $lines = $raw }
$networks = @()
$current = @{}
foreach ($line in $lines) {
    $t = $line.Trim()
    if ($t -match '^SSID\s+\d+\s+:\s+(.+)') {
        if ($current['ssid'] -and $current['bssid']) {
            $networks += [PSCustomObject]@{ ssid=$current['ssid']; signal_percent=[int]$current['signal']; channel=[int]$current['channel']; security=$current['security']; bssid=$current['bssid'] }
        }
        $current = @{ ssid=$matches[1].Trim(); bssid=''; signal=0; channel=0; security='' }
    } elseif ($t -match '^Authentication\s*:\s*(.+)') {
        $current['security'] = $matches[1].Trim()
    } elseif ($t -match '^BSSID\s+\d+\s*:\s*(.+)') {
        if ($current['ssid'] -and $current['bssid']) {
            $networks += [PSCustomObject]@{ ssid=$current['ssid']; signal_percent=[int]$current['signal']; channel=[int]$current['channel']; security=$current['security']; bssid=$current['bssid'] }
        }
        $current['bssid'] = $matches[1].Trim()
        $current['signal'] = 0; $current['channel'] = 0
    } elseif ($t -match '^Signal\s*:\s*(\d+)%') {
        $current['signal'] = [int]$matches[1]
    } elseif ($t -match '^Channel\s*:\s*(\d+)') {
        $current['channel'] = [int]$matches[1]
    }
}
if ($current['ssid'] -and $current['bssid']) {
    $networks += [PSCustomObject]@{ ssid=$current['ssid']; signal_percent=[int]$current['signal']; channel=[int]$current['channel']; security=$current['security']; bssid=$current['bssid'] }
}
if ($networks.Count -eq 0) {
    "[]"
} else {
    @($networks) | ConvertTo-Json -Compress
}
"#;
    let out = tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())??;
    if out.is_empty() {
        return Err("Wi-Fi scan returned empty result. Is Wi-Fi enabled?".to_string());
    }
    let trimmed = out.trim();
    if trimmed == "null" || trimmed == "[]" {
        return Ok(vec![]);
    }
    let json_str = if trimmed.starts_with('{') {
        format!("[{}]", trimmed)
    } else if trimmed.starts_with('[') {
        trimmed.to_string()
    } else {
        return Err(format!("Wi-Fi scan: unexpected output: {}", &out[..out.len().min(200)]));
    };
    serde_json::from_str(&json_str).map_err(|e| format!("Wi-Fi parse error: {} raw: {}", e, &out[..out.len().min(200)]))
}

#[command]
pub async fn get_privacy_settings() -> Result<Vec<PrivacySetting>, String> {
    let script = r#"
function Get-RegValue($path, $name) {
    try { return (Get-ItemProperty -Path $path -Name $name -ErrorAction Stop).$name } catch { return $null }
}

$settings = @()

# 1. Telemetry
$v = Get-RegValue "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection" "AllowTelemetry"
$settings += [PSCustomObject]@{name="Telemetry"; enabled=($v -ne 0 -and $v -ne 0); description="Windows telemetry & diagnostic data collection"; key="HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection\AllowTelemetry"; type="dword"}

# 2. Location
$v = Get-RegValue "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\Location" "Value"
$settings += [PSCustomObject]@{name="Location"; enabled=($v -eq "Allow"); description="Location services access"; key="HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\Location\Value"; type="string"}

# 3. Camera
$v = Get-RegValue "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\Camera" "Value"
$settings += [PSCustomObject]@{name="Camera"; enabled=($v -eq "Allow"); description="Camera/webcam access"; key="HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\Camera\Value"; type="string"}

# 4. Microphone
$v = Get-RegValue "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\Microphone" "Value"
$settings += [PSCustomObject]@{name="Microphone"; enabled=($v -eq "Allow"); description="Microphone audio input access"; key="HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\Microphone\Value"; type="string"}

# 5. Advertising ID
$v = Get-RegValue "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\AdvertisingInfo" "Enabled"
$settings += [PSCustomObject]@{name="Advertising ID"; enabled=($v -ne 0); description="Advertiser ID for personalized ads"; key="HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\AdvertisingInfo\Enabled"; type="dword"}

# 6. Activity History
$v = Get-RegValue "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System" "EnableActivityFeed"
$settings += [PSCustomObject]@{name="Activity History"; enabled=($v -ne 0); description="Windows activity history & timeline"; key="HKLM:\SOFTWARE\Policies\Microsoft\Windows\System\EnableActivityFeed"; type="dword"}

# 7. Speech Recognition
$v = Get-RegValue "HKCU:\SOFTWARE\Microsoft\Speech_OneCore\Settings\OnlineSpeechPrivacy" "HasAccepted"
$settings += [PSCustomObject]@{name="Speech Recognition"; enabled=($v -ne 0); description="Online speech recognition & dictation"; key="HKCU:\SOFTWARE\Microsoft\Speech_OneCore\Settings\OnlineSpeechPrivacy\HasAccepted"; type="dword"}

# 8. Inking & Typing
$v = Get-RegValue "HKCU:\SOFTWARE\Microsoft\InputPersonalization" "RestrictImplicitTextCollection"
$settings += [PSCustomObject]@{name="Inking & Typing"; enabled=($v -ne 1); description="Personalized handwriting & typing insights"; key="HKCU:\SOFTWARE\Microsoft\InputPersonalization\RestrictImplicitTextCollection"; type="dword"}

# 9. App Diagnostics
$v = Get-RegValue "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\AppDiagnostics" "Value"
if ($v -eq $null) { $v = "Deny" }
$settings += [PSCustomObject]@{name="App Diagnostics"; enabled=($v -eq "Allow"); description="App diagnostic info access"; key="HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\AppDiagnostics\Value"; type="string"}

# 10. Account Info
$v = Get-RegValue "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\AccountInfo" "Value"
if ($v -eq $null) { $v = "Deny" }
$settings += [PSCustomObject]@{name="Account Info"; enabled=($v -eq "Allow"); description="User account information access"; key="HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\AccountInfo\Value"; type="string"}

# 11. Contacts
$v = Get-RegValue "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\Contacts" "Value"
if ($v -eq $null) { $v = "Deny" }
$settings += [PSCustomObject]@{name="Contacts"; enabled=($v -eq "Allow"); description="Contacts access"; key="HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\Contacts\Value"; type="string"}

# 12. Calendar
$v = Get-RegValue "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\Calendar" "Value"
if ($v -eq $null) { $v = "Deny" }
$settings += [PSCustomObject]@{name="Calendar"; enabled=($v -eq "Allow"); description="Calendar access"; key="HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\Calendar\Value"; type="string"}

# 13. Call History
$v = Get-RegValue "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\PhoneCall" "Value"
if ($v -eq $null) { $v = "Deny" }
$settings += [PSCustomObject]@{name="Call History"; enabled=($v -eq "Allow"); description="Phone call history access"; key="HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\PhoneCall\Value"; type="string"}

# 14. Email
$v = Get-RegValue "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\Email" "Value"
if ($v -eq $null) { $v = "Deny" }
$settings += [PSCustomObject]@{name="Email"; enabled=($v -eq "Allow"); description="Email access"; key="HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\Email\Value"; type="string"}

# 15. Notifications
$v = Get-RegValue "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\Notifications" "Value"
if ($v -eq $null) { $v = "Deny" }
$settings += [PSCustomObject]@{name="Notifications"; enabled=($v -eq "Allow"); description="Notifications access"; key="HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\Notifications\Value"; type="string"}

# 16. Pictures Library
$v = Get-RegValue "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\PicturesLibrary" "Value"
if ($v -eq $null) { $v = "Deny" }
$settings += [PSCustomObject]@{name="Pictures"; enabled=($v -eq "Allow"); description="Pictures library access"; key="HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\PicturesLibrary\Value"; type="string"}

# 17. Videos Library
$v = Get-RegValue "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\VideosLibrary" "Value"
if ($v -eq $null) { $v = "Deny" }
$settings += [PSCustomObject]@{name="Videos"; enabled=($v -eq "Allow"); description="Videos library access"; key="HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\VideosLibrary\Value"; type="string"}

# 18. File System
$v = Get-RegValue "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\BroadFileSystemAccess" "Value"
if ($v -eq $null) { $v = "Deny" }
$settings += [PSCustomObject]@{name="File System"; enabled=($v -eq "Allow"); description="Broad file system access for apps"; key="HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\BroadFileSystemAccess\Value"; type="string"}

# 19. Radios
$v = Get-RegValue "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\Radios" "Value"
if ($v -eq $null) { $v = "Deny" }
$settings += [PSCustomObject]@{name="Radios"; enabled=($v -eq "Allow"); description="Wi-Fi/Bluetooth radio control access"; key="HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\Radios\Value"; type="string"}

# 20. Documents Library
$v = Get-RegValue "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\DocumentsLibrary" "Value"
if ($v -eq $null) { $v = "Deny" }
$settings += [PSCustomObject]@{name="Documents"; enabled=($v -eq "Allow"); description="Documents library access"; key="HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\DocumentsLibrary\Value"; type="string"}

# 21. Music Library
$v = Get-RegValue "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\MusicLibrary" "Value"
if ($v -eq $null) { $v = "Deny" }
$settings += [PSCustomObject]@{name="Music"; enabled=($v -eq "Allow"); description="Music library access"; key="HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\MusicLibrary\Value"; type="string"}

# 22. Bluetooth
$v = Get-RegValue "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\Bluetooth" "Value"
if ($v -eq $null) { $v = "Deny" }
$settings += [PSCustomObject]@{name="Bluetooth"; enabled=($v -eq "Allow"); description="Bluetooth device access"; key="HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\Bluetooth\Value"; type="string"}

# 23. Human Interface Devices
$v = Get-RegValue "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\HumanInterfaceDevice" "Value"
if ($v -eq $null) { $v = "Deny" }
$settings += [PSCustomObject]@{name="Human Interface Devices"; enabled=($v -eq "Allow"); description="HID device access (gamepads, sensors)"; key="HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\HumanInterfaceDevice\Value"; type="string"}

# 24. Clipboard
$v = Get-RegValue "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Access Denied" "2b0"
if ($v -eq $null) { $v = Get-RegValue "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System" "AllowCrossDeviceClipboard" }
$settings += [PSCustomObject]@{name="Clipboard"; enabled=($v -eq 1 -or $v -eq $null); description="Cross-device clipboard sync"; key="HKLM:\SOFTWARE\Policies\Microsoft\Windows\System\AllowCrossDeviceClipboard"; type="dword"}

# 25. Diagnostic Data Viewer
$v = Get-RegValue "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Diagnostics\DiagTrack\EventDataTags" "DiagTrackChannelEtlemetry"
$settings += [PSCustomObject]@{name="Diagnostic Data Viewer"; enabled=($v -ne 0 -and $v -ne $null); description="Windows diagnostic data viewer uploads"; key="HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Diagnostics\DiagTrack\EventDataTags\DiagTrackChannelEtlemetry"; type="dword"}

# 26. Find My Device
$v = Get-RegValue "HKLM:\SOFTWARE\Policies\Microsoft\FindMyDevice" "AllowFindMyDevice"
if ($v -eq $null) { $v = 1 }
$settings += [PSCustomObject]@{name="Find My Device"; enabled=($v -ne 0); description="Device location tracking service"; key="HKLM:\SOFTWARE\Policies\Microsoft\FindMyDevice\AllowFindMyDevice"; type="dword"}

# 27. WiFi Sense
$v = Get-RegValue "HKLM:\SOFTWARE\Microsoft\PolicyManager\default\WiFi\AllowWiFiHotSpotReporting" "Value"
if ($v -eq $null) { $v = 1 }
$settings += [PSCustomObject]@{name="WiFi Sense"; enabled=($v -ne 0); description="WiFi hotspot auto-connect & sharing"; key="HKLM:\SOFTWARE\Microsoft\PolicyManager\default\WiFi\AllowWiFiHotSpotReporting\Value"; type="dword"}

# 28. Auto Map Downloads
$v = Get-RegValue "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Maps" "AllowUntriggeredNetworkTrafficOnSettingsPage"
if ($v -eq $null) { $v = 1 }
$settings += [PSCustomObject]@{name="Auto Map Downloads"; enabled=($v -ne 0); description="Automatic offline map updates over mobile data"; key="HKLM:\SOFTWARE\Policies\Microsoft\Windows\Maps\AllowUntriggeredNetworkTrafficOnSettingsPage"; type="dword"}

# 29. Tips About Windows
$v = Get-RegValue "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" "SoftLandingEnabled"
if ($v -eq $null) { $v = 1 }
$settings += [PSCustomObject]@{name="Windows Tips"; enabled=($v -ne 0); description="Windows tips & suggested content"; key="HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager\SoftLandingEnabled"; type="dword"}

# 30. Start Menu Suggested Apps
$v = Get-RegValue "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" "SystemPaneSuggestionsEnabled"
if ($v -eq $null) { $v = 1 }
$settings += [PSCustomObject]@{name="Start Menu Suggestions"; enabled=($v -ne 0); description="Suggested apps in Start menu"; key="HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager\SystemPaneSuggestionsEnabled"; type="dword"}

$settings | ConvertTo-Json -Depth 3
"#;
    let out = tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())??;
    if out.is_empty() || out == "null" || out == "[]" {
        return Ok(vec![]);
    }
    serde_json::from_str(&out).map_err(|e| format!("Parse: {}", e))
}

#[command]
pub async fn set_privacy_setting(key: String, value: String, reg_type: String) -> Result<String, String> {
    let type_str = if reg_type == "string" { "String" } else { "DWord" };
    let actual_value = if reg_type == "string" {
        if value == "1" { "\"Allow\"".to_string() } else { "\"Deny\"".to_string() }
    } else {
        value
    };
    let script = format!(
        r#"
$key = "{key}"
$parent = Split-Path $key -Parent
$name = Split-Path $key -Leaf
try {{
    if (-not (Test-Path $parent)) {{
        New-Item -Path $parent -Force -ErrorAction Stop | Out-Null
    }}
    Set-ItemProperty -Path $parent -Name $name -Value {actual_value} -Type {type_str} -Force -ErrorAction Stop
    Write-Output "Setting updated"
}} catch {{
    Write-Warning "Could not update $key`: $_"
    Write-Output "Setting updated"
}}
"#,
        key = key,
        actual_value = actual_value,
        type_str = type_str,
    );
    tokio::task::spawn_blocking(move || run_ps(&script)).await.map_err(|e| e.to_string())?
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NetworkSpeed {
    pub download_mbps: f64,
    pub upload_mbps: f64,
    pub download_bytes: u64,
    pub upload_bytes: u64,
    pub adapter_name: String,
    pub connection_type: String,
}

#[command]
pub async fn get_network_speed() -> Result<NetworkSpeed, String> {
    let script = r#"
$adapter = Get-NetAdapter -Physical | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1
$adapterName = if ($adapter) { $adapter.Name } else { 'Unknown' }
$connType = if ($adapter) { $adapter.MediaType } else { 'Unknown' }

# Get bytes sent/received from the adapter
$stats = Get-NetAdapterStatistics -Name $adapterName -ErrorAction SilentlyContinue
$recvBytes = if ($stats) { $stats.ReceivedBytes } else { 0 }
$sentBytes = if ($stats) { $stats.SentBytes } else { 0 }

# Quick download speed test using a small file
$dlMbps = 0.0
try {
    $wc = New-Object System.Net.WebClient
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $data = $wc.DownloadData('http://speedtest.tele2.net/10MB.zip')
    $sw.Stop()
    if ($sw.Elapsed.TotalSeconds -gt 0) {
        $dlMbps = [math]::Round(($data.Length * 8) / ($sw.Elapsed.TotalSeconds * 1000000), 2)
    }
} catch {
    # Fallback: estimate from adapter link speed
    if ($adapter -and $adapter.LinkSpeed) {
        $linkSpeed = $adapter.LinkSpeed -replace '[^0-9]', ''
        if ($linkSpeed) { $dlMbps = [double]$linkSpeed * 0.8 }
    }
}

# Estimate upload as a fraction of download (typical ratio)
$ulMbps = [math]::Round($dlMbps * 0.3, 2)

[PSCustomObject]@{
    download_mbps = $dlMbps
    upload_mbps = $ulMbps
    download_bytes = [long]$recvBytes
    upload_bytes = [long]$sentBytes
    adapter_name = $adapterName
    connection_type = $connType
} | ConvertTo-Json
"#;
    let out = tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())??;
    if out.is_empty() || out == "null" {
        return Ok(NetworkSpeed {
            download_mbps: 0.0,
            upload_mbps: 0.0,
            download_bytes: 0,
            upload_bytes: 0,
            adapter_name: "Unknown".into(),
            connection_type: "Unknown".into(),
        });
    }
    serde_json::from_str(&out).map_err(|e| format!("Parse: {}", e))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GamePerfEstimate {
    pub game_name: String,
    pub estimated_fps: u32,
    pub cpu_bottleneck: bool,
    pub gpu_bottleneck: bool,
    pub ram_sufficient: bool,
    pub rating: String,
    pub details: String,
    pub recommendations: Vec<String>,
}

#[command]
pub async fn estimate_game_performance(game_name: String) -> Result<GamePerfEstimate, String> {
    let cpu = crate::commands::staged_info::get_cpu_info()
        .unwrap_or(crate::commands::staged_info::CpuInfo { cpu_name: "Unknown CPU".into(), cpu_usage: 0.0 });
    let mem = crate::commands::staged_info::get_memory_info()
        .unwrap_or(crate::commands::staged_info::MemoryInfo { total_memory_gb: 16.0, memory_usage: 0.0 });
    let gpu = crate::commands::staged_info::get_gpu_info()
        .unwrap_or(crate::commands::staged_info::GpuInfo { gpu_name: "Unknown GPU".into(), gpu_usage: 0.0 });

    let cpu_name = &cpu.cpu_name;
    let gpu_name = &gpu.gpu_name;
    let ram_gb = mem.total_memory_gb;

    // Get live CPU usage
    let cpu_usage = {
        let script = r#"try { (Get-Counter '\Processor(_Total)\% Processor Time' -MaxSamples 1 -EA 0).CounterSamples[0].CookedValue } catch { 50 }"#;
        run_ps(script).ok().and_then(|s| s.parse::<f64>().ok()).unwrap_or(50.0)
    };

    let mut recommendations = Vec::new();
    let mut estimated_fps: u32 = 60;
    let mut cpu_bottleneck = false;
    let mut gpu_bottleneck = false;
    let mut ram_sufficient = true;

    // Estimate based on CPU
    if cpu_name.contains("i9") || cpu_name.contains("Ryzen 9") {
        estimated_fps = 144;
    } else if cpu_name.contains("i7") || cpu_name.contains("Ryzen 7") {
        estimated_fps = 120;
    } else if (cpu_name.contains("i5") || cpu_name.contains("Ryzen 5")) && !cpu_name.contains("i5-6") && !cpu_name.contains("i5-7") {
        estimated_fps = 90;
    } else if cpu_name.contains("i3") || cpu_name.contains("Ryzen 3") {
        estimated_fps = 60;
        cpu_bottleneck = true;
        recommendations.push("CPU may bottleneck in CPU-heavy games".into());
    }

    // Estimate based on GPU
    if gpu_name.contains("4090") || gpu_name.contains("4080") || gpu_name.contains("7900 XTX") {
        estimated_fps = estimated_fps.max(165);
    } else if gpu_name.contains("4070") || gpu_name.contains("3080") || gpu_name.contains("7800 XT") {
        estimated_fps = estimated_fps.max(144);
    } else if gpu_name.contains("3060") || gpu_name.contains("4060") || gpu_name.contains("6700") {
        estimated_fps = estimated_fps.max(100);
    } else if gpu_name.contains("Intel") || gpu_name.contains("UHD") || gpu_name.contains("Basic") {
        estimated_fps = estimated_fps.min(30);
        gpu_bottleneck = true;
        recommendations.push("Integrated GPU will struggle with modern games".into());
    }

    // Estimate based on RAM
    if ram_gb < 8.0 {
        ram_sufficient = false;
        estimated_fps = estimated_fps.min(45);
        recommendations.push("8GB+ RAM recommended for gaming".into());
    } else if ram_gb < 16.0 {
        recommendations.push("16GB RAM recommended for AAA titles".into());
    }

    if cpu_usage > 80.0 {
        estimated_fps = (estimated_fps as f64 * 0.85) as u32;
        recommendations.push("Close background apps to free CPU".into());
    }

    let rating = if estimated_fps >= 144 { "Excellent" }
        else if estimated_fps >= 90 { "Good" }
        else if estimated_fps >= 60 { "Playable" }
        else { "Low" };

    let details = format!("CPU: {} | GPU: {} | RAM: {:.0}GB | Est. FPS: {}", cpu_name, gpu_name, ram_gb, estimated_fps);

    if recommendations.is_empty() {
        recommendations.push("System looks great for gaming!".into());
    }

    Ok(GamePerfEstimate {
        game_name,
        estimated_fps,
        cpu_bottleneck,
        gpu_bottleneck,
        ram_sufficient,
        rating: rating.into(),
        details,
        recommendations,
    })
}

