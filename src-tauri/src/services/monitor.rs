use crate::commands::metrics::{SystemMetrics, broadcast_metrics};
use std::os::windows::process::CommandExt;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;
use sysinfo::{CpuRefreshKind, MemoryRefreshKind, System};
use tauri::AppHandle;

const CREATE_NO_WINDOW: u32 = 0x08000000;

static LATEST_CPU: AtomicU64 = AtomicU64::new(0);
static LATEST_RAM_USED: AtomicU64 = AtomicU64::new(0);
static LATEST_RAM_TOTAL: AtomicU64 = AtomicU64::new(0);
static LATEST_GPU: AtomicU64 = AtomicU64::new(0);
static LATEST_GPU_VRAM: AtomicU64 = AtomicU64::new(0);
static LATEST_CPU_TEMP: AtomicU64 = AtomicU64::new(0);
static LATEST_GPU_TEMP: AtomicU64 = AtomicU64::new(0);

pub fn latest_metrics() -> SystemMetrics {
    SystemMetrics {
        cpu_percent: f32::from_bits(LATEST_CPU.load(Ordering::Relaxed) as u32),
        ram_used_gb: f32::from_bits(LATEST_RAM_USED.load(Ordering::Relaxed) as u32),
        ram_total_gb: f32::from_bits(LATEST_RAM_TOTAL.load(Ordering::Relaxed) as u32),
        gpu_percent: f32::from_bits(LATEST_GPU.load(Ordering::Relaxed) as u32),
        gpu_vram_used_gb: f32::from_bits(LATEST_GPU_VRAM.load(Ordering::Relaxed) as u32),
        cpu_temp_celsius: f32::from_bits(LATEST_CPU_TEMP.load(Ordering::Relaxed) as u32),
        gpu_temp_celsius: f32::from_bits(LATEST_GPU_TEMP.load(Ordering::Relaxed) as u32),
        timestamp_ms: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64,
    }
}

fn poll_gpu_typeperf(wildcard: &str) -> Option<f32> {
    let out = std::process::Command::new("typeperf")
        .args(["-sc", "1", wildcard])
        .creation_flags(CREATE_NO_WINDOW)
        .output().ok()?;
    if !out.status.success() {
        eprintln!("[monitor] typeperf failed for wildcard: {}", wildcard);
        return None;
    }
    let s = String::from_utf8_lossy(&out.stdout);
    let line = s.lines().filter(|l| !l.trim().is_empty()).nth(1)?;
    let mut max_val = 0.0f32;
    for field in line.split(',').skip(1) {
        if let Ok(n) = field.trim_matches('"').trim().parse::<f32>() {
            if n > max_val { max_val = n; }
        }
    }
    if max_val > 0.0 {
        eprintln!("[monitor] typeperf {} OK: {}%", wildcard, max_val);
        Some(max_val.min(100.0))
    } else {
        eprintln!("[monitor] typeperf {} returned all zero", wildcard);
        None
    }
}

fn poll_nvidia_smi() -> Option<(f32, f32)> {
    for path in &["nvidia-smi", r"C:\Program Files\NVIDIA Corporation\NVSMI\nvidia-smi.exe"] {
        if let Ok(out) = std::process::Command::new(path)
            .args(["--query-gpu=utilization.gpu,temperature.gpu", "--format=csv,noheader,nounits", "-i", "0"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            if out.status.success() {
                let s = String::from_utf8_lossy(&out.stdout);
                let parts: Vec<&str> = s.trim().split(',').collect();
                let gpu = parts.get(0).and_then(|v| v.trim().parse::<f32>().ok()).unwrap_or(0.0);
                let temp = parts.get(1).and_then(|v| v.trim().parse::<f32>().ok()).unwrap_or(0.0);
                eprintln!("[monitor] nvidia-smi OK: gpu={}% temp={}°C", gpu, temp);
                return Some((gpu.min(100.0).max(0.0), temp.min(120.0).max(0.0)));
            } else {
                eprintln!("[monitor] nvidia-smi failed (status {})", out.status);
            }
        }
    }
    eprintln!("[monitor] nvidia-smi: not found");
    None
}

fn poll_cpu_temp_powershell() -> f32 {
    let script = r#"
$t = 0
try { $c = Get-Counter '\Thermal Zone Information(*)\Temperature' -MaxSamples 1 -EA 0; if ($c -and $c.CounterSamples) { $v = $c.CounterSamples | Where-Object { $_.CookedValue -gt 0 }; if ($v) { $t = [math]::Round(($v | Measure-Object -Property CookedValue -Average).Average, 1) } } } catch {}
if ($t -eq 0) { try { $d = Get-CimInstance -Namespace 'root/wmi' -ClassName MSAcpi_ThermalZoneTemperature -EA 0; if ($d) { $src = $d | Where-Object { $_.InstanceName -match 'CPU|Processor|THRM|TZ0' }; if (-not $src) { $src = $d }; $avg = ($src | Measure-Object -Property CurrentTemperature -Average).Average; if ($avg -gt 0) { $t = [math]::Round(($avg / 10) - 273.15, 1) } } } catch {} }
if ($t -eq 0) { try { $d = Get-CimInstance Win32_TemperatureProbe -EA 0; if ($d) { $v = $d | Where-Object { $_.CurrentReading -gt 0 }; if ($v) { $t = [math]::Round(($v | Measure-Object -Property CurrentReading -Average).Average, 1) } } } catch {} }
if ($t -eq 0) { try { $d = Get-CimInstance Win32_PerfFormattedData_Counters_ThermalZoneInformation -EA 0; if ($d) { $v = $d | Where-Object { $_.Temperature -gt 0 }; if ($v) { $t = [math]::Round(($v | Measure-Object -Property Temperature -Average).Average / 10, 1) } } } catch {} }
if ($t -eq 0) { try { $c = Get-Counter '\Processor Information(*)\Temperature' -MaxSamples 1 -EA 0; if ($c -and $c.CounterSamples) { $v = $c.CounterSamples | Where-Object { $_.CookedValue -gt 0 }; if ($v) { $t = [math]::Round(($v | Measure-Object -Property CookedValue -Average).Average / 10, 1) } } } catch {} }
if ($t -le 0 -or $t -gt 120) { $t = 0 }
$t
"#;
    match std::process::Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
    {
        Ok(out) if out.status.success() => {
            let s = String::from_utf8_lossy(&out.stdout);
            s.trim().parse::<f32>().unwrap_or(0.0).max(0.0).min(120.0)
        }
        _ => 0.0
    }
}

fn poll_gpu_temp_wmi() -> f32 {
    let script = r#"
$t = 0
try { $g = Get-CimInstance -Namespace 'root/wmi' -ClassName MSAcpi_ThermalZoneTemperature -EA 0; if ($g) { $gpu = $g | Where-Object { $_.InstanceName -match 'GPU|Video|Display' }; if ($gpu) { $t = [math]::Round(($gpu | Measure-Object -Property CurrentTemperature -Average).Average / 10 - 273.15, 1) } } } catch {}
if ($t -le 0 -or $t -gt 150) { $t = 0 }
$t
"#;
    match std::process::Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
    {
        Ok(out) if out.status.success() => {
            let s = String::from_utf8_lossy(&out.stdout);
            s.trim().parse::<f32>().unwrap_or(0.0).max(0.0).min(150.0)
        }
        _ => 0.0
    }
}

fn poll_gpu_and_temp() -> (f32, f32, f32) {
    // 1. nvidia-smi
    if let Some((gpu, gpu_temp)) = poll_nvidia_smi() {
        let cpu_temp = poll_cpu_temp_powershell();
        eprintln!("[monitor] nvidia-smi gpu={} cpu_temp={} gpu_temp={}", gpu, cpu_temp, gpu_temp);
        return (gpu, cpu_temp, gpu_temp);
    }
    // 2. typeperf
    for wc in &["\\GPU Engine(*)\\Utilization Percentage", "\\GPU Engine(engtype_3D*)\\Utilization Percentage"] {
        if let Some(gpu) = poll_gpu_typeperf(wc) {
            let cpu_temp = poll_cpu_temp_powershell();
            let gpu_temp = poll_gpu_temp_wmi();
            eprintln!("[monitor] typeperf gpu={} cpu_temp={} gpu_temp_wmi={}", gpu, cpu_temp, gpu_temp);
            return (gpu, cpu_temp, gpu_temp);
        }
    }
    // 3. PowerShell GPU enum
    let script = r#"
$r = @{ gpu = 0 }
try {
    $paths = (Get-Counter -ListSet "GPU Engine" -EA 0).Paths
    foreach ($p in $paths) {
        if ($p -match 'Utilization') {
            try {
                $c = Get-Counter $p -MaxSamples 1 -EA 0
                if ($c -and $c.CounterSamples) {
                    $active = $c.CounterSamples | Where-Object { $_.CookedValue -gt 0 }
                    if ($active) {
                        $avg = [math]::Round(($active | Measure-Object -Property CookedValue -Average).Average, 1)
                        if ($avg -gt $r.gpu) { $r.gpu = $avg }
                    }
                }
            } catch {}
        }
    }
} catch {}
try {
    $wmi = Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -EA 0
    if ($wmi) { foreach ($e in $wmi) { if ($e.UtilizationPercentage -gt $r.gpu) { $r.gpu = $e.UtilizationPercentage } } }
} catch {}
try {
    $m = Get-Counter '\GPU Adapter Memory(*)\Local Usage' -MaxSamples 1 -EA 0
    if ($m -and $m.CounterSamples) { $used = $m.CounterSamples | Where-Object { $_.CookedValue -gt 0 }; if ($used) { $r.gpu = [math]::Max($r.gpu, 1) } }
} catch {}
$r.gpu
"#;
    let gpu = match std::process::Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
    {
        Ok(out) if out.status.success() => {
            let s = String::from_utf8_lossy(&out.stdout);
            s.trim().parse::<f32>().unwrap_or(0.0).min(100.0).max(0.0)
        }
        _ => 0.0
    };
    eprintln!("[monitor] PowerShell gpu={}", gpu);
    let cpu_temp = poll_cpu_temp_powershell();
    let gpu_temp = poll_gpu_temp_wmi();
    (gpu, cpu_temp, gpu_temp)
}

pub fn spawn_monitor(_app: AppHandle) {
    std::thread::spawn(move || {
        let mut sys = System::new();
        sys.refresh_cpu();
        std::thread::sleep(Duration::from_millis(300));
        sys.refresh_cpu_specifics(CpuRefreshKind::new().with_cpu_usage());
        std::thread::sleep(Duration::from_millis(700));
        let mut gpu_usage: f32 = 0.0;
        let mut cpu_temp: f32 = 0.0;
        let mut gpu_temp: f32 = 0.0;
        let mut tick: u32 = 0;
        loop {
            sys.refresh_cpu_specifics(CpuRefreshKind::new().with_cpu_usage());
            sys.refresh_memory_specifics(MemoryRefreshKind::new().with_ram());
            let cpu_percent = sys.global_cpu_info().cpu_usage();
            let total_mem = sys.total_memory() as f64 / 1073741824.0;
            let used_mem = sys.used_memory() as f64 / 1073741824.0;
            if tick % 2 == 0 {
                let (g, t, gt) = poll_gpu_and_temp();
                eprintln!("[monitor] poll result: gpu={}% cpu_temp={}°C gpu_temp={}°C", g, t, gt);
                gpu_usage = g;
                cpu_temp = t;
                gpu_temp = gt;
            }
            LATEST_CPU.store(cpu_percent.to_bits() as u64, Ordering::Relaxed);
            LATEST_RAM_USED.store((used_mem as f32).to_bits() as u64, Ordering::Relaxed);
            LATEST_RAM_TOTAL.store((total_mem as f32).to_bits() as u64, Ordering::Relaxed);
            LATEST_GPU.store(gpu_usage.to_bits() as u64, Ordering::Relaxed);
            LATEST_GPU_VRAM.store(0f32.to_bits() as u64, Ordering::Relaxed);
            LATEST_CPU_TEMP.store(cpu_temp.to_bits() as u64, Ordering::Relaxed);
            LATEST_GPU_TEMP.store(gpu_temp.to_bits() as u64, Ordering::Relaxed);
            broadcast_metrics(SystemMetrics {
                cpu_percent,
                ram_used_gb: used_mem as f32,
                ram_total_gb: total_mem as f32,
                gpu_percent: gpu_usage,
                gpu_vram_used_gb: 0.0,
                cpu_temp_celsius: cpu_temp,
                gpu_temp_celsius: gpu_temp,
                timestamp_ms: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64,
            });
            tick += 1;
            std::thread::sleep(Duration::from_secs(1));
        }
    });
}
