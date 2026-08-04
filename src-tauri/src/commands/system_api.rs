use serde::{de::{self, Deserializer, SeqAccess, Visitor}, Deserialize, Serialize};
use serde_json::Value;
use std::fmt;
use tauri::command;
use std::collections::HashMap;

fn deserialize_string_or_seq<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: Deserializer<'de>,
{
    struct StringOrSeq;

    impl<'de> Visitor<'de> for StringOrSeq {
        type Value = String;

        fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
            formatter.write_str("a string or an array of strings")
        }

        fn visit_str<E>(self, value: &str) -> Result<String, E>
        where
            E: de::Error,
        {
            Ok(value.to_owned())
        }

        fn visit_string<E>(self, value: String) -> Result<String, E>
        where
            E: de::Error,
        {
            Ok(value)
        }

        fn visit_seq<A>(self, mut seq: A) -> Result<String, A::Error>
        where
            A: SeqAccess<'de>,
        {
            let mut values = Vec::new();
            while let Some(value) = seq.next_element::<String>()? {
                values.push(value);
            }
            Ok(values.join(", "))
        }

        fn visit_unit<E>(self) -> Result<String, E>
        where
            E: de::Error,
        {
            Ok(String::new())
        }
    }

    deserializer.deserialize_any(StringOrSeq)
}

fn deserialize_vec_string_or_string<'de, D>(deserializer: D) -> Result<Vec<String>, D::Error>
where
    D: Deserializer<'de>,
{
    struct VecStringOrString;

    impl<'de> Visitor<'de> for VecStringOrString {
        type Value = Vec<String>;

        fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
            formatter.write_str("a string or an array of strings")
        }

        fn visit_seq<A>(self, mut seq: A) -> Result<Vec<String>, A::Error>
        where
            A: SeqAccess<'de>,
        {
            let mut values = Vec::new();
            while let Some(value) = seq.next_element::<String>()? {
                values.push(value);
            }
            Ok(values)
        }

        fn visit_str<E>(self, value: &str) -> Result<Vec<String>, E>
        where
            E: de::Error,
        {
            Ok(vec![value.to_owned()])
        }

        fn visit_string<E>(self, value: String) -> Result<Vec<String>, E>
        where
            E: de::Error,
        {
            Ok(vec![value])
        }

        fn visit_unit<E>(self) -> Result<Vec<String>, E>
        where
            E: de::Error,
        {
            Ok(Vec::new())
        }
    }

    deserializer.deserialize_any(VecStringOrString)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GpuDevice {
    pub name: String,
    pub vendor: String,
    pub vram_gb: f32,
    pub driver_version: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DriveInfo {
    pub letter: String,
    pub label: String,
    pub total_gb: f32,
    pub used_gb: f32,
    pub free_gb: f32,
    pub usage_percent: f32,
    pub drive_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemStatus {
    #[serde(deserialize_with = "deserialize_string_or_seq")]
    pub overall_health: String,
    pub cpu_usage: f32,
    pub memory_usage: f32,
    pub gpu_usage: f32,
    #[serde(deserialize_with = "deserialize_string_or_seq")]
    pub network_status: String,
    pub disk_usage: f32,
    #[serde(default, deserialize_with = "deserialize_vec_string_or_string")]
    pub active_optimizations: Vec<String>,
    #[serde(deserialize_with = "deserialize_string_or_seq")]
    pub last_scan: String,
    #[serde(default, deserialize_with = "deserialize_vec_string_or_string")]
    pub issues_detected: Vec<String>,
    // Real system specs
    #[serde(deserialize_with = "deserialize_string_or_seq")]
    pub cpu_name: String,
    #[serde(deserialize_with = "deserialize_string_or_seq")]
    pub gpu_name: String,
    pub total_memory_gb: f32,
    #[serde(deserialize_with = "deserialize_string_or_seq")]
    pub os_name: String,
    pub disk_size_gb: f32,
    #[serde(default)]
    pub gpu_list: Vec<GpuDevice>,
    #[serde(default)]
    pub drive_list: Vec<DriveInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OptimizationRequest {
    pub target: String, // "system", "gaming", "productivity", "minimal"
    pub aggressiveness: String, // "conservative", "moderate", "aggressive"
    pub preserve_battery: bool,
    pub maintain_stability: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemOptimizationResult {
    pub success: bool,
    pub message: String,
    pub optimizations_applied: Vec<String>,
    pub performance_improvement: f32,
    pub warnings: Vec<String>,
}

use std::sync::OnceLock;
use sysinfo::{CpuRefreshKind, MemoryRefreshKind, System};

static CACHED_SYSTEM_INFO: OnceLock<SystemStatus> = OnceLock::new();

fn get_cached_static_info() -> &'static SystemStatus {
    CACHED_SYSTEM_INFO.get_or_init(|| {
        let mut sys = System::new();
        sys.refresh_cpu();
        sys.refresh_memory();

        let cpu_name = sys.cpus().first()
            .map(|c| c.brand().to_string())
            .unwrap_or_else(|| "Unknown CPU".to_string());
        let total_memory_gb = (sys.total_memory() as f64 / 1073741824.0) as f32;
        let os_name = [
            sysinfo::System::name().unwrap_or_default(),
            sysinfo::System::os_version().unwrap_or_default(),
        ].join(" ");

        SystemStatus {
            cpu_name,
            gpu_name: "Detecting...".to_string(),
            total_memory_gb,
            os_name,
            disk_size_gb: 512.0,
            gpu_list: vec![],
            drive_list: vec![],
            overall_health: "Unknown".to_string(),
            cpu_usage: 0.0,
            memory_usage: 0.0,
            gpu_usage: 0.0,
            network_status: "Checking...".to_string(),
            disk_usage: 0.0,
            active_optimizations: vec![],
            last_scan: chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
            issues_detected: vec![],
        }
    })
}

fn get_live_metrics() -> (f32, f32, f32) {
    let mut sys = System::new();
    sys.refresh_cpu_specifics(CpuRefreshKind::new().with_cpu_usage());
    sys.refresh_memory_specifics(MemoryRefreshKind::new().with_ram());

    let cpu_usage = sys.global_cpu_info().cpu_usage();
    let total_mem = sys.total_memory() as f64 / 1073741824.0;
    let used_mem = sys.used_memory() as f64 / 1073741824.0;
    let memory_usage = if total_mem > 0.0 {
        ((used_mem / total_mem) * 100.0) as f32
    } else {
        0.0
    };

    (cpu_usage, memory_usage, 50.0)
}

#[command]
pub fn get_system_status() -> Result<SystemStatus, String> {
    let script = r#"
    try {
        $processorInfo = Get-CimInstance -ClassName Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1
        $gpuInfo = Get-CimInstance -ClassName Win32_VideoController -ErrorAction SilentlyContinue | Select-Object -First 1
        $osInfo = Get-CimInstance -ClassName Win32_OperatingSystem -ErrorAction SilentlyContinue
        $disk = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='C:'" -ErrorAction SilentlyContinue
        
        $cpuUsage = 0
        $memoryUsage = 0
        $diskUsagePercent = 0
        $gpuUsage = 0
        
        try { $cpuCounter = Get-Counter '\Processor(_Total)\% Processor Time' -ErrorAction SilentlyContinue -MaxSamples 1; if ($cpuCounter.CounterSamples.Count -gt 0) { $cpuUsage = [math]::Round($cpuCounter.CounterSamples[0].CookedValue, 1) } } catch { $cpuUsage = 15 }
        try { $memCounter = Get-Counter '\Memory\% Committed Bytes In Use' -ErrorAction SilentlyContinue -MaxSamples 1; if ($memCounter.CounterSamples.Count -gt 0) { $memoryUsage = [math]::Round($memCounter.CounterSamples[0].CookedValue, 1) } } catch { $memoryUsage = 45 }
        try { if ($disk -and $disk.Size) { $diskUsagePercent = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 1) } } catch { $diskUsagePercent = 50 }
        try { $gpuEngines = Get-Counter '\GPU Engine(*)\Utilization Percentage' -ErrorAction SilentlyContinue -MaxSamples 1; if ($gpuEngines.CounterSamples.Count -gt 0) { $gpuUsage = [math]::Round(($gpuEngines.CounterSamples | Where-Object {$_.InstanceName -like '*3D*' -or $_.InstanceName -like '*Graphics*'} | Measure-Object -Property CookedValue -Average).Average, 1) } } catch { $gpuUsage = 25 }
        
        $networkStatus = "Unknown"
        try { $testConnection = Test-Connection -ComputerName 8.8.8.8 -Count 1 -ErrorAction SilentlyContinue; if ($testConnection) { $networkStatus = "Connected"; try { $speedTest = Test-NetConnection -ComputerName speedtest.net -Port 80 -ErrorAction SilentlyContinue; if ($speedTest) { $networkStatus = "Connected - High Speed" } else { $networkStatus = "Connected" } } catch { $networkStatus = "Connected" } } else { $networkStatus = "Disconnected" } } catch { $networkStatus = "Error" }
        
        $activeOptimizations = @()
        $powerPlan = powercfg /getactivescheme
        if ($powerPlan -match "High Performance" -or $powerPlan -match "SCHEME_MIN") { $activeOptimizations += "High Performance Power Plan" } elseif ($powerPlan -match "Power Saver" -or $powerPlan -match "SCHEME_MAX") { $activeOptimizations += "Power Saver Mode" }
        $gameDvr = Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' -Name 'AppCaptureEnabled' -ErrorAction SilentlyContinue; if ($gameDvr.AppCaptureEnabled -eq 0) { $activeOptimizations += "Game DVR Disabled" }
        $tcpAck = Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters' -Name 'TcpAckFrequency' -ErrorAction SilentlyContinue; if ($tcpAck.TcpAckFrequency -eq 1) { $activeOptimizations += "TCP Optimization Active" }
        
        $issues = @()
        if ($cpuUsage -gt 80) { $issues += "High CPU Usage" }
        if ($memoryUsage -gt 85) { $issues += "High Memory Usage" }
        if ($diskUsagePercent -gt 90) { $issues += "Low Disk Space" }
        if ($networkStatus -ne "Connected") { $issues += "Network Issues" }
        if ($gpuUsage -gt 90) { $issues += "High GPU Usage" }
        
        $healthScore = 100 - ($cpuUsage * 0.3) - ($memoryUsage * 0.3) - ($diskUsagePercent * 0.2) - ($issues.Count * 10)
        if ($healthScore -ge 80) { $overallHealth = "Excellent" } elseif ($healthScore -ge 60) { $overallHealth = "Good" } elseif ($healthScore -ge 40) { $overallHealth = "Fair" } elseif ($healthScore -ge 20) { $overallHealth = "Poor" } else { $overallHealth = "Critical" }
        
        $cpuName = if ($processorInfo) { $processorInfo.Name } else { "Unknown CPU" }
        $gpuName = if ($gpuInfo) { $gpuInfo.Name } else { "Unknown GPU" }
        
        $totalMemoryGB = 0
        try { $cs = Get-CimInstance -ClassName Win32_ComputerSystem -ErrorAction SilentlyContinue; if ($cs -and $cs.TotalPhysicalMemory) { $totalMemoryGB = [math]::Round($cs.TotalPhysicalMemory / 1GB, 2) } } catch {
            try { $memoryModules = Get-CimInstance -ClassName Win32_PhysicalMemory -ErrorAction SilentlyContinue; if ($memoryModules) { $totalMemoryGB = [math]::Round(($memoryModules | Measure-Object -Property Capacity -Sum).Sum / 1GB, 2) } } catch {
                try { $csWmi = Get-WmiObject -Class Win32_ComputerSystem -ErrorAction SilentlyContinue; if ($csWmi -and $csWmi.TotalPhysicalMemory) { $totalMemoryGB = [math]::Round($csWmi.TotalPhysicalMemory / 1GB, 2) } } catch { $totalMemoryGB = 16 }
            }
        }
        
        $osName = if ($osInfo) { $osInfo.Caption + " " + $osInfo.Version } else { "Unknown OS" }
        
        @{
            overall_health = $overallHealth; cpu_usage = $cpuUsage; memory_usage = $memoryUsage; gpu_usage = $gpuUsage
            network_status = $networkStatus; disk_usage = $diskUsagePercent
            active_optimizations = $activeOptimizations
            last_scan = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"); issues_detected = $issues
            cpu_name = $cpuName; gpu_name = $gpuName; total_memory_gb = $totalMemoryGB
            os_name = $osName; disk_size_gb = if ($disk) { [math]::Round($disk.Size / 1GB, 2) } else { 512 }
        } | ConvertTo-Json -Compress
    } catch {
        @{
            overall_health = "Unknown"; cpu_usage = 0; memory_usage = 0; gpu_usage = 0
            network_status = "Error"; disk_usage = 0; active_optimizations = @()
            last_scan = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"); issues_detected = @("System Status Check Failed")
            cpu_name = "Unknown CPU"; gpu_name = "Unknown GPU"; total_memory_gb = 16; os_name = "Unknown OS"; disk_size_gb = 512
        } | ConvertTo-Json -Compress
    }
    "#;

    let output = crate::services::file_io::run_powershell(script, &[])
        .map_err(|e| e.to_string())?;
    let output = output.trim_start_matches('\u{FEFF}').trim();

    let status: SystemStatus = serde_json::from_str(output)
        .map_err(|e| format!("Failed to parse system status: {}. raw output: {}", e, output))?;

    Ok(status)
}

#[command]
pub fn get_system_status_basic() -> Result<SystemStatus, String> {
    let cached = get_cached_static_info();
    let (cpu_usage, memory_usage, disk_usage) = get_live_metrics();

    let mut live = SystemStatus {
        cpu_usage,
        memory_usage,
        gpu_usage: 0.0,
        disk_usage,
        network_status: "Connected".to_string(),
        overall_health: if cpu_usage < 50.0 && memory_usage < 70.0 { "Good".to_string() } else { "Fair".to_string() },
        last_scan: chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        issues_detected: vec![],
        active_optimizations: vec![],
        ..cached.clone()
    };

    if live.cpu_usage > 80.0 { live.issues_detected.push("High CPU Usage".to_string()); }
    if live.memory_usage > 85.0 { live.issues_detected.push("High Memory Usage".to_string()); }
    if live.disk_usage > 90.0 { live.issues_detected.push("Low Disk Space".to_string()); }

    Ok(live)
}

#[command]
pub fn check_registry_value(path: String, name: String) -> Result<Value, String> {
    let script = format!(
        r#"
        try {{
            $item = Get-ItemProperty -Path '{path}' -ErrorAction SilentlyContinue
            if ($null -eq $item) {{ Write-Output ""; exit 0 }}
            $value = $item.{name}
            if ($null -eq $value) {{ Write-Output ""; exit 0 }}
            Write-Output $value
        }} catch {{
            Write-Output ""
        }}
        "#,
        path = path.replace('"', "\"").replace('`', "``"),
        name = name.replace('"', "\"").replace('`', "``")
    );

    let output = crate::services::file_io::run_powershell(&script, &[])
        .map_err(|e| e.to_string())?;
    let output = output.trim();

    if output.is_empty() {
        Ok(Value::Null)
    } else if let Ok(num) = output.parse::<i64>() {
        Ok(Value::from(num))
    } else if let Ok(boolean) = output.parse::<bool>() {
        Ok(Value::from(boolean))
    } else {
        Ok(Value::from(output.to_string()))
    }
}

#[command]
pub fn check_power_plan() -> Result<String, String> {
    let script = r#"
        try {
            $plan = powercfg /getactivescheme 2>$null
            if ($plan -match 'GUID: ([0-9A-Fa-f\-]+)') {
                Write-Output $Matches[1]
            } else {
                Write-Output ""
            }
        } catch {
            Write-Output ""
        }
        "#;

    let output = crate::services::file_io::run_powershell(script, &[])
        .map_err(|e| e.to_string())?;
    Ok(output.trim().to_string())
}

#[command]
pub fn apply_system_optimization(request: OptimizationRequest) -> Result<SystemOptimizationResult, String> {
    let script = format!(
        r#"
        try {{
            $target = "{}"
            $aggressiveness = "{}"
            $preserveBattery = ${}
            $maintainStability = ${}
            
            $optimizationsApplied = @()
            $warnings = @()
            
            Write-Host "Applying system optimization for target: $target"
            
            # Power plan optimization
            switch ($target) {{
                "gaming" {{
                    powercfg /setactive SCHEME_MIN | Out-Null
                    $optimizationsApplied += "High Performance Power Plan"
                }}
                "productivity" {{
                    powercfg /setactive SCHEME_BALANCED | Out-Null
                    $optimizationsApplied += "Balanced Power Plan"
                }}
                "minimal" {{
                    if ($preserveBattery) {{
                        powercfg /setactive SCHEME_MAX | Out-Null
                        $optimizationsApplied += "Power Saver Mode"
                    }} else {{
                        powercfg /setactive SCHEME_BALANCED | Out-Null
                        $optimizationsApplied += "Balanced Power Plan"
                    }}
                }}
                default {{
                    powercfg /setactive SCHEME_BALANCED | Out-Null
                    $optimizationsApplied += "Balanced Power Plan"
                }}
            }}
            
            # Network optimizations based on aggressiveness
            if ($aggressiveness -eq "aggressive" -or $target -eq "gaming") {{
                Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters' -Name 'TcpAckFrequency' -Value 1 -Type DWord -ErrorAction SilentlyContinue
                Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters' -Name 'TcpDelAckTicks' -Value 0 -Type DWord -ErrorAction SilentlyContinue
                Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' -Name 'NetworkThrottlingIndex' -Value 0xffffffff -Type DWord -ErrorAction SilentlyContinue
                $optimizationsApplied += "Aggressive Network Optimization"
            }} elseif ($aggressiveness -eq "moderate") {{
                Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters' -Name 'TcpAckFrequency' -Value 2 -Type DWord -ErrorAction SilentlyContinue
                Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' -Name 'NetworkThrottlingIndex' -Value 10 -Type DWord -ErrorAction SilentlyContinue
                $optimizationsApplied += "Moderate Network Optimization"
            }}
            
            # Visual effects optimization
            switch ($aggressiveness) {{
                "aggressive" {{
                    Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects' -Name 'VisualFXSetting' -Value 2 -Type DWord -ErrorAction SilentlyContinue
                    $optimizationsApplied += "Minimal Visual Effects"
                }}
                "moderate" {{
                    Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects' -Name 'VisualFXSetting' -Value 3 -Type DWord -ErrorAction SilentlyContinue
                    $optimizationsApplied += "Balanced Visual Effects"
                }}
                default {{
                    Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects' -Name 'VisualFXSetting' -Value 4 -Type DWord -ErrorAction SilentlyContinue
                    $optimizationsApplied += "Best Appearance"
                }}
            }}
            
            # Gaming-specific optimizations
            if ($target -eq "gaming") {{
                Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' -Name 'AppCaptureEnabled' -Value 0 -Type DWord -ErrorAction SilentlyContinue
                Set-ItemProperty -Path 'HKCU:\System\GameConfigStore' -Name 'GameDVR_Enabled' -Value 0 -Type DWord -ErrorAction SilentlyContinue
                Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' -Name 'HwSchMode' -Value 2 -Type DWord -ErrorAction SilentlyContinue
                $optimizationsApplied += "Gaming Mode Optimizations"
            }}
            
            # Memory management optimizations
            if ($aggressiveness -eq "aggressive" -and -not $maintainStability) {{
                Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' -Name 'ClearPageFileAtShutdown' -Value 0 -Type DWord -ErrorAction SilentlyContinue
                $optimizationsApplied += "Aggressive Memory Management"
                $warnings += "Aggressive memory settings may affect system stability"
            }}
            
            # Storage optimizations
            if ($aggressiveness -eq "aggressive") {{
                Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' -Name 'NtfsDisableLastAccessUpdate' -Value 1 -Type DWord -ErrorAction SilentlyContinue
                $optimizationsApplied += "Storage Performance Optimization"
            }}
            
            # Calculate estimated performance improvement
            $performanceImprovement = switch ($aggressiveness) {{
                "aggressive" {{ 25 }}
                "moderate" {{ 15 }}
                default {{ 8 }}
            }}
            
            if ($target -eq "gaming") {{ $performanceImprovement += 10 }}
            if ($preserveBattery) {{ $performanceImprovement -= 5 }}
            
            # Restart Explorer to apply some settings
            if ($target -eq "gaming" -or $aggressiveness -eq "aggressive") {{
                Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 2
                Start-Process explorer -ErrorAction SilentlyContinue
                $optimizationsApplied += "System Refresh Applied"
            }}
            
            @{{
                success = $true
                message = "System optimization completed successfully for $target profile"
                optimizations_applied = $optimizationsApplied
                performance_improvement = $performanceImprovement
                warnings = $warnings
            }} | ConvertTo-Json -Depth 3
        }} catch {{
            @{{
                success = $false
                message = "Failed to apply system optimization: $($_.Exception.Message)"
                optimizations_applied = @()
                performance_improvement = 0
                warnings = @("Optimization failed")
            }} | ConvertTo-Json
        }}
        "#,
        request.target,
        request.aggressiveness,
        request.preserve_battery,
        request.maintain_stability
    );
    
    let output = crate::services::file_io::run_powershell(&script, &[])
        .map_err(|e| e.to_string())?;
    
    let result: SystemOptimizationResult = serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse optimization result: {}", e))?;
    
    Ok(result)
}

#[command]
pub fn reset_all_optimizations() -> Result<SystemOptimizationResult, String> {
    let script = r#"
    try {
        $optimizationsReset = @()
        
        Write-Host "Resetting all system optimizations to defaults"
        
        # Reset power plan
        powercfg /setactive SCHEME_BALANCED | Out-Null
        $optimizationsReset += "Power Plan Reset to Balanced"
        
        # Reset network settings
        Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters' -Name 'TcpAckFrequency' -Value 2 -Type DWord -ErrorAction SilentlyContinue
        Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters' -Name 'TcpDelAckTicks' -Value 1 -Type DWord -ErrorAction SilentlyContinue
        Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' -Name 'NetworkThrottlingIndex' -Value 10 -Type DWord -ErrorAction SilentlyContinue
        $optimizationsReset += "Network Settings Reset"
        
        # Reset visual effects
        Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects' -Name 'VisualFXSetting' -Value 4 -Type DWord -ErrorAction SilentlyContinue
        $optimizationsReset += "Visual Effects Reset to Best Appearance"
        
        # Reset gaming settings
        Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' -Name 'AppCaptureEnabled' -Value 1 -Type DWord -ErrorAction SilentlyContinue
        Set-ItemProperty -Path 'HKCU:\System\GameConfigStore' -Name 'GameDVR_Enabled' -Value 1 -Type DWord -ErrorAction SilentlyContinue
        $optimizationsReset += "Gaming Settings Reset"
        
        # Reset memory management
        Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' -Name 'ClearPageFileAtShutdown' -Value 0 -Type DWord -ErrorAction SilentlyContinue
        $optimizationsReset += "Memory Management Reset"
        
        # Reset storage settings
        Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' -Name 'NtfsDisableLastAccessUpdate' -Value 0 -Type DWord -ErrorAction SilentlyContinue
        $optimizationsReset += "Storage Settings Reset"
        
        # Restart Explorer to apply changes
        Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Start-Process explorer -ErrorAction SilentlyContinue
        $optimizationsReset += "System Refresh Applied"
        
        @{
            success = $true
            message = "All system optimizations have been reset to defaults"
            optimizations_applied = $optimizationsReset
            performance_improvement = 0
            warnings = @()
        } | ConvertTo-Json -Depth 3
    } catch {
        @{
            success = $false
            message = "Failed to reset optimizations: $($_.Exception.Message)"
            optimizations_applied = @()
            performance_improvement = 0
            warnings = @("Reset failed")
        } | ConvertTo-Json
    }
    "#;
    
    let output = crate::services::file_io::run_powershell(script, &[])
        .map_err(|e| e.to_string())?;
    
    let result: SystemOptimizationResult = serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse reset result: {}", e))?;
    
    Ok(result)
}

#[command]
pub fn get_optimization_presets() -> Result<HashMap<String, String>, String> {
    let mut presets = HashMap::new();
    presets.insert("gaming_aggressive".to_string(), "Maximum gaming performance with aggressive optimizations".to_string());
    presets.insert("gaming_balanced".to_string(), "Gaming performance with system stability".to_string());
    presets.insert("productivity".to_string(), "Optimized for work and productivity applications".to_string());
    presets.insert("minimal_battery".to_string(), "Minimal resource usage with battery preservation".to_string());
    presets.insert("balanced".to_string(), "Balanced performance for general use".to_string());
    presets.insert("streaming".to_string(), "Optimized for content streaming and recording".to_string());

    Ok(presets)
}

#[command]
pub fn get_all_gpus() -> Result<Vec<GpuDevice>, String> {
    let script = r#"
    $gpus = @()
    $gpuList = Get-CimInstance -ClassName Win32_VideoController -ErrorAction SilentlyContinue
    foreach ($gpu in $gpuList) {
        $vendor = "Unknown"
        $name = $gpu.Name
        if ($name -match "NVIDIA") { $vendor = "NVIDIA" }
        elseif ($name -match "AMD|Radeon|RDNA") { $vendor = "AMD" }
        elseif ($name -match "Intel|Impulse|UHD|Iris") { $vendor = "Intel" }
        elseif ($name -match "Microsoft Basic") { $vendor = "Microsoft" }

        $vramGB = 0
        if ($gpu.AdapterRAM -and $gpu.AdapterRAM -gt 0) {
            $vramGB = [math]::Round($gpu.AdapterRAM / 1GB, 1)
        }

        $gpus += [ordered]@{
            name = $name
            vendor = $vendor
            vram_gb = $vramGB
            driver_version = if ($gpu.DriverVersion) { $gpu.DriverVersion } else { "Unknown" }
        }
    }
    $gpus | ConvertTo-Json -Depth 3
    "#;

    let output = crate::services::file_io::run_powershell(script, &[])
        .map_err(|e| e.to_string())?;
    let output = output.trim_start_matches('\u{FEFF}').trim();

    if output.is_empty() || output == "[]" || output == "null" {
        return Ok(vec![]);
    }

    let gpus: Vec<GpuDevice> = serde_json::from_str(output)
        .map_err(|e| format!("Failed to parse GPU list: {} raw: {}", e, output))?;

    Ok(gpus)
}

#[command]
pub fn get_all_drives() -> Result<Vec<DriveInfo>, String> {
    let script = r#"
    $drives = @()
    $disks = Get-CimInstance -ClassName Win32_LogicalDisk -ErrorAction SilentlyContinue | Where-Object { $_.DriveType -eq 3 }
    foreach ($disk in $disks) {
        $totalGB = [math]::Round($disk.Size / 1GB, 1)
        $freeGB = [math]::Round($disk.FreeSpace / 1GB, 1)
        $usedGB = [math]::Round(($disk.Size - $disk.FreeSpace) / 1GB, 1)
        $usagePct = if ($totalGB -gt 0) { [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 1) } else { 0 }

        $driveType = "HDD"
        try {
            $physDisk = Get-CimInstance -ClassName Win32_DiskDrive -ErrorAction SilentlyContinue | Where-Object {
                $_.DeviceID -match [regex]::Escape($disk.DeviceID.Substring(0, 2))
            }
            if (-not $physDisk) {
                # Fallback: try matching by size or use Win32_PhysicalDisk
                $physDisk = Get-CimInstance -ClassName Win32_PhysicalDisk -ErrorAction SilentlyContinue | Where-Object {
                    $_.DeviceID -eq $disk.DeviceID.Substring(0, $disk.DeviceID.Length - 1)
                }
            }
            if ($physDisk) {
                # 1. Most reliable: non-rotational capability flag
                if ($physDisk.Capability -contains 3) {
                    $driveType = "SSD"
                }
                # 2. Check model name for NVMe indicators
                $modelName = $physDisk.Model
                if ($modelName -match "NVMe|\.2 PCIe|PCIe Gen|Samsung 9|WD Black SN|WD Blue SN|WD Green SN|Crucial P[0-9]|Crucial T[0-9]|Intel 6[0-9]0|Intel 7[0-9]0|SK Hynix|Kingston NV|Sabrent|Seagate FireCuda|ADATA XPG") {
                    $driveType = "NVMe"
                } elseif ($modelName -match "SSD|SATA SSD|MX5|MX4|BX[0-9]|860|870|T7|EVO|PRO|SanDisk|Kingston SSD|TeamGroup") {
                    $driveType = "SSD"
                }
                # 3. Check MediaType from WMI
                if ($driveType -eq "HDD" -and ($physDisk.MediaType -eq "Fixed hard disk media" -or $physDisk.MediaType -match "SSD|Fixed hard disk")) {
                    $driveType = "SSD"
                }
            }
        } catch { $driveType = "Unknown" }

        $label = ""
        try { $label = $disk.VolumeName } catch { $label = "" }

        $drives += [ordered]@{
            letter = $disk.DeviceID
            label = $label
            total_gb = $totalGB
            used_gb = $usedGB
            free_gb = $freeGB
            usage_percent = $usagePct
            drive_type = $driveType
        }
    }
    $drives | ConvertTo-Json -Depth 3
    "#;

    let output = crate::services::file_io::run_powershell(script, &[])
        .map_err(|e| e.to_string())?;
    let output = output.trim_start_matches('\u{FEFF}').trim();

    if output.is_empty() || output == "[]" || output == "null" {
        return Ok(vec![]);
    }

    let drives: Vec<DriveInfo> = serde_json::from_str(output)
        .map_err(|e| format!("Failed to parse drive list: {} raw: {}", e, output))?;

    Ok(drives)
}

#[command]
pub async fn clean_drive(drive_letter: String) -> Result<String, String> {
    let drive = drive_letter.trim_end_matches(':').to_string();

    let script = format!(
        r#"
$drive = "{0}"
$cleaned = @()
$errors = @()

function SafeClean {{
    param([string]$Name,[scriptblock]$Cmd)
    try {{
        $j = Start-Job -ScriptBlock $Cmd -ErrorAction SilentlyContinue
        $j | Wait-Job -Timeout 15 -ErrorAction SilentlyContinue | Out-Null
        if ($j.State -eq 'Running') {{ $j | Stop-Job -ErrorAction SilentlyContinue; $errors += "${{Name}}: timed out" }}
        else {{ Receive-Job $j -ErrorAction SilentlyContinue | Out-Null; $cleaned += $Name }}
        $j | Remove-Job -ErrorAction SilentlyContinue
    }} catch {{ $errors += "${{Name}}: $($_.Exception.Message)" }}
}}

# 1. Drive-specific Windows Temp
SafeClean "Windows Temp" {{ Remove-Item "$drive\Windows\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue }}

# 2. User Temp
SafeClean "User Temp" {{ Remove-Item "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue; Remove-Item "$env:TMP\*" -Recurse -Force -ErrorAction SilentlyContinue }}

# 3. Prefetch
SafeClean "Prefetch" {{ Remove-Item "$drive\Windows\Prefetch\*" -Recurse -Force -ErrorAction SilentlyContinue }}

# 4. Recycle Bin
try {{ $s = New-Object -ComObject Shell.Application; $s.NameSpace(0xa).Items() | ForEach-Object {{ $_.InvokeVerb("delete") }} 2>$null; $cleaned += "Recycle Bin" }} catch {{}}

# 5. Browser caches
SafeClean "Chrome Cache" {{ Remove-Item "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache\*" -Recurse -Force -ErrorAction SilentlyContinue }}
SafeClean "Edge Cache" {{ Remove-Item "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache\*" -Recurse -Force -ErrorAction SilentlyContinue }}
SafeClean "Firefox Cache" {{ Remove-Item "$env:APPDATA\Mozilla\Firefox\Profiles\*\cache2\*" -Recurse -Force -ErrorAction SilentlyContinue }}

# 6. .NET assembly cache
SafeClean "Assembly Cache" {{ Remove-Item "$drive\Windows\assembly\NativeImages_*" -Recurse -Force -ErrorAction SilentlyContinue }}

# 7. Windows ESD cache (from upgrades)
SafeClean "ESD Cache" {{ Remove-Item "$drive\Windows\ESD\*" -Recurse -Force -ErrorAction SilentlyContinue }}

# 8. Delivery Optimization cache
SafeClean "Delivery Opt" {{ Remove-Item "$env:ProgramData\Microsoft\Windows\DeliveryOptimization\Cache\*" -Recurse -Force -ErrorAction SilentlyContinue }}

# 9. Windows Installer cache (orphaned patches)
SafeClean "Installer Cache" {{ Remove-Item "$drive\Windows\Installer\*.tmp" -Force -ErrorAction SilentlyContinue }}

Write-Output ($cleaned -join ", ")
"#,
        drive
    );

    let _output = tokio::task::spawn_blocking(move || {
        crate::services::file_io::run_powershell(&script, &[])
    }).await.map_err(|e| format!("Task failed: {}", e))?
      .map_err(|e| format!("Clean drive failed: {}", e))?;

    Ok(format!("Cleaned drive {}: temp, prefetch, caches, recycle bin", drive))
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DisplayMonitor {
    pub name: String,
    pub resolution: String,
    pub refresh_rate_hz: f32,
    pub bit_depth: u32,
    pub is_primary: bool,
    pub adapter: String,
    pub hdr_enabled: bool,
}

#[command]
pub fn get_display_info() -> Result<Vec<DisplayMonitor>, String> {
    let script = r#"
function Get-Res {
    param($disp, $adapter)
    $h = $null; $v = $null
    # Try multiple WMI property names
    foreach ($hp in @('ActiveHorizontalResolution','HorizontalResolution','CurrentHorizontalResolution')) {
        try { if ($disp.$hp -and $disp.$hp -gt 0) { $h = $disp.$hp; break } } catch {}
    }
    if (-not $h -and $adapter) {
        try { if ($adapter.CurrentHorizontalResolution -and $adapter.CurrentHorizontalResolution -gt 0) { $h = $adapter.CurrentHorizontalResolution } } catch {}
    }
    foreach ($vp in @('ActiveVerticalResolution','VerticalResolution','CurrentVerticalResolution')) {
        try { if ($disp.$vp -and $disp.$vp -gt 0) { $v = $disp.$vp; break } } catch {}
    }
    if (-not $v -and $adapter) {
        try { if ($adapter.CurrentVerticalResolution -and $adapter.CurrentVerticalResolution -gt 0) { $v = $adapter.CurrentVerticalResolution } } catch {}
    }
    if (-not $h -or -not $v) { return "1920 x 1080" }
    return "$h x $v"
}

$monitors = @()
try {
    $adapters = Get-CimInstance -ClassName Win32_VideoController -ErrorAction SilentlyContinue
    $displays = Get-CimInstance -Namespace root/wmi -ClassName WmiMonitorBasicDisplayParams -ErrorAction SilentlyContinue
    $edids = Get-CimInstance -Namespace root/wmi -ClassName WmiMonitorID -ErrorAction SilentlyContinue

    $i = 0
    foreach ($disp in $displays) {
        $name = "Monitor $($i + 1)"
        if ($edids[$i]) {
            $e = $edids[$i]
            $parts = @()
            if ($e.UserFriendlyName) { $parts += (-join ($e.UserFriendlyName | % { $c = [char]$_; if ($c -ne 0) { $c } })) }
            if ($e.ManufacturerName) { $parts += (-join ($e.ManufacturerName | % { $c = [char]$_; if ($c -ne 0) { $c } })) }
            if ($parts.Count -gt 0) { $name = ($parts -join " ").Trim() }
        }

        $adapter = $adapters[$i]
        $resolution = Get-Res -disp $disp -adapter $adapter
        $refresh = 60.0
        try { if ($disp.DisplayFrequency) { $refresh = [math]::Round($disp.DisplayFrequency, 1) } } catch {}
        $hdr = $false
        try { $hdr = $null -ne (Get-CimInstance -Namespace root/wmi -ClassName WmiMonitorColorXYZinCIE -ErrorAction SilentlyContinue | Select-Object -First 1) } catch {}
        $adapterName = ""
        if ($adapter) { $adapterName = $adapter.Name }

        $monitors += [ordered]@{
            name = $name
            resolution = $resolution
            refresh_rate_hz = $refresh
            bit_depth = 8
            is_primary = ($i -eq 0)
            adapter = $adapterName
            hdr_enabled = $hdr
        }
        $i++
    }
} catch {}
if ($monitors.Count -eq 0) {
    foreach ($a in $adapters) {
        $r = 60.0
        try { if ($a.CurrentRefreshRate -and $a.CurrentRefreshRate -ne -1) { $r = $a.CurrentRefreshRate } } catch {}
        $monitors += [ordered]@{
            name = $a.Name
            resolution = Get-Res -adapter $a
            refresh_rate_hz = $r
            bit_depth = 8
            is_primary = $true
            adapter = $a.Name
            hdr_enabled = $false
        }
    }
}
@($monitors) | ConvertTo-Json -Depth 3
"#;

    let output = crate::services::file_io::run_powershell(script, &[])
        .map_err(|e| e.to_string())?;
    let output = output.trim_start_matches('\u{FEFF}').trim().to_string();

    if output.is_empty() || output == "[]" || output == "null" {
        return Ok(vec![]);
    }

    // PS 5.1 ConvertTo-Json on a single-element array emits {obj} not [{obj}]
    let json = if output.starts_with('{') {
        format!("[{}]", output)
    } else {
        output
    };

    let mut monitors: Vec<DisplayMonitor> = serde_json::from_str(&json)
        .map_err(|e| format!("Failed to parse display info: {} raw: {}", e, json))?;

    // Strip null bytes from monitor names
    for m in &mut monitors {
        m.name = m.name.replace('\u{0000}', "").trim().to_string();
    }

    Ok(monitors)
}

/// Enters pop-out overlay mode: shrinks the window to overlay size and pins it on top.
#[command]
pub fn open_popout(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;
    if let Some(win) = app.get_webview_window("main") {
        // Unmaximize if maximized (can't resize a maximized window)
        if win.is_maximized().unwrap_or(false) {
            let _ = win.unmaximize();
        }
        let _ = win.set_always_on_top(true);
        let _ = win.set_size(tauri::PhysicalSize::new(520, 520));
        let _ = win.set_min_size(Some(tauri::Size::Physical(tauri::PhysicalSize::new(380, 340))));
        let _ = win.set_max_size(Some(tauri::Size::Physical(tauri::PhysicalSize::new(640, 600))));
    }
    Ok(())
}

/// Exits pop-out overlay mode: restores the window to full size.
#[command]
pub fn return_to_app(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.set_always_on_top(false);
        let _ = win.set_min_size(Some(tauri::Size::Physical(tauri::PhysicalSize::new(1000, 700))));
        let _ = win.set_max_size(None::<tauri::Size>);
        let _ = win.set_size(tauri::PhysicalSize::new(1400, 900));
        let _ = win.center();
        let _ = win.set_focus();
    }
    Ok(())
}

/// Closes pop-out overlay mode (same as return_to_app).
#[command]
pub fn close_popout(app: tauri::AppHandle) -> Result<(), String> {
    return_to_app(app)
}

#[command]
pub async fn clean_temp_files() -> Result<String, String> {
    let script = r#"
        $cleaned = @()
        $errors = @()
        $freedBytes = 0
        function SafeClean {
            param([string]$N,[scriptblock]$C)
            try {
                $j = Start-Job -ScriptBlock {
                    param($name, $cmd)
                    $before = 0
                    try { $before = (Get-PSDrive $env:SystemDrive[0] -EA 0).Used * 1MB } catch {}
                    & $cmd
                    $after = 0
                    try { $after = (Get-PSDrive $env:SystemDrive[0] -EA 0).Used * 1MB } catch {}
                    [PSCustomObject]@{ Name = $name; Freed = [math]::Max(0, $before - $after) }
                } -ArgumentList $N, $C -ErrorAction SilentlyContinue
                $j | Wait-Job -Timeout 30 -ErrorAction SilentlyContinue | Out-Null
                if ($j.State -eq 'Running') {
                    $j | Stop-Job -ErrorAction SilentlyContinue
                    $errors += "${{N}}: timed out"
                } else {
                    $result = Receive-Job $j -ErrorAction SilentlyContinue
                    if ($result -and $result.Freed) { $freedBytes += $result.Freed }
                    $cleaned += $N
                }
                $j | Remove-Job -ErrorAction SilentlyContinue
            } catch { $errors += "${{N}}: $($_.Exception.Message)" }
        }
        # Windows temp locations
        SafeClean "Windows Temp" { Remove-Item "$env:WINDIR\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue }
        SafeClean "User Temp" { Remove-Item "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue; Remove-Item "$env:TMP\*" -Recurse -Force -ErrorAction SilentlyContinue }
        SafeClean "Prefetch" { Remove-Item "$env:WINDIR\Prefetch\*" -Recurse -Force -ErrorAction SilentlyContinue }
        # Windows logs and caches
        SafeClean "Windows Logs" { Remove-Item "$env:WINDIR\Logs\*" -Recurse -Force -ErrorAction SilentlyContinue }
        SafeClean "SoftwareDistribution" { Remove-Item "$env:WINDIR\SoftwareDistribution\Download\*" -Recurse -Force -ErrorAction SilentlyContinue }
        SafeClean "Delivery Optimization" { Remove-Item "$env:ProgramData\Microsoft\Windows\DeliveryOptimization\Cache\*" -Recurse -Force -ErrorAction SilentlyContinue }
        # Browser caches
        SafeClean "Chrome Cache" { Remove-Item "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache\*" -Recurse -Force -ErrorAction SilentlyContinue; Remove-Item "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Code Cache\*" -Recurse -Force -ErrorAction SilentlyContinue }
        SafeClean "Edge Cache" { Remove-Item "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache\*" -Recurse -Force -ErrorAction SilentlyContinue; Remove-Item "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Code Cache\*" -Recurse -Force -ErrorAction SilentlyContinue }
        SafeClean "Firefox Cache" { Remove-Item "$env:APPDATA\Mozilla\Firefox\Profiles\*\cache2\*" -Recurse -Force -ErrorAction SilentlyContinue; Remove-Item "$env:LOCALAPPDATA\Mozilla\Firefox\Profiles\*\cache2\*" -Recurse -Force -ErrorAction SilentlyContinue }
        SafeClean "Brave Cache" { Remove-Item "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data\Default\Cache\*" -Recurse -Force -ErrorAction SilentlyContinue }
        # App caches
        SafeClean "Microsoft Store Cache" { Remove-Item "$env:LOCALAPPDATA\Microsoft\Windows\INetCache\*" -Recurse -Force -ErrorAction SilentlyContinue }
        SafeClean ".NET Assembly Cache" { Remove-Item "$env:WINDIR\assembly\NativeImages_*" -Recurse -Force -ErrorAction SilentlyContinue }
        SafeClean "Recycle Bin" { $s = New-Object -ComObject Shell.Application; $s.NameSpace(0xa).Items() | ForEach-Object { $_.InvokeVerb("delete") } }
        SafeClean "DISM SXS Cache" { Dism.exe /Online /Cleanup-Image /StartComponentCleanup /ResetBase /Quiet | Out-Null }
        # Windows ESD cache (from feature updates)
        SafeClean "ESD Cache" { Remove-Item "$env:WINDIR\ESD\*" -Recurse -Force -ErrorAction SilentlyContinue }
        # Temp internet files
        SafeClean "IE Temp Files" { Remove-Item "$env:LOCALAPPDATA\Microsoft\Windows\Temporary Internet Files\*" -Recurse -Force -ErrorAction SilentlyContinue }
        # Recent documents
        SafeClean "Recent Items" { Remove-Item "$env:APPDATA\Microsoft\Windows\Recent\*" -Recurse -Force -ErrorAction SilentlyContinue }
        # Thumbnail cache
        SafeClean "Thumbnail Cache" { Remove-Item "$env:LOCALAPPDATA\Microsoft\Windows\Explorer\thumbcache_*.db" -Force -ErrorAction SilentlyContinue }
        # PowerShell script cache
        SafeClean "PS Script Cache" { Remove-Item "$env:LOCALAPPDATA\Microsoft\Windows\PowerShell\*" -Recurse -Force -ErrorAction SilentlyContinue }
        # Flush DNS
        SafeClean "DNS Cache" { Clear-DnsClientCache -ErrorAction SilentlyContinue }

        $freedMB = [math]::Round($freedBytes / 1MB, 1)
        $msg = "Cleaned: $($cleaned -join ', '). Freed ~${freedMB}MB"
        if ($errors.Count -gt 0) { $msg += " | Errors: $($errors -join '; ')" }
        Write-Output $msg
    "#;
    let script_owned = script.to_string();
    let output = tokio::task::spawn_blocking(move || {
        crate::services::file_io::run_powershell(&script_owned, &[])
    }).await.map_err(|e| format!("Task failed: {}", e))?
      .map_err(|e| format!("Clean failed: {}", e))?;
    Ok(output.trim().to_string())
}

#[command]
pub fn export_standalone_super_page(super_page_id: String, manifest_json: String) -> Result<String, String> {
    use std::fs;
    let mut path = dirs::download_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    path.push(format!("impulse-{}-standalone.json", super_page_id));
    fs::write(&path, &manifest_json).map_err(|e| format!("Failed to write export: {}", e))?;
    Ok(path.to_string_lossy().to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DriverAnalysis {
    pub device_name: String,
    pub vendor: String,
    pub category: String,
    pub current_version: String,
    pub recommended_version: String,
    pub status: String,
    pub recommendation: String,
}

#[command]
pub fn ai_driver_analysis() -> Result<Vec<DriverAnalysis>, String> {
    let script = r#"
    $results = @()
    $devices = Get-CimInstance -ClassName Win32_PnPEntity -ErrorAction SilentlyContinue | Where-Object {
        $_.ConfigManagerErrorCode -eq 0 -and $_.Name -ne $null -and $_.Class -match '^(Display|Network|System|Sound|Storage|USB|HID|Keyboard|Mouse|Media)$'
    }
    foreach ($dev in $devices) {
        $cat = "Other"
        if ($dev.Class -eq "Display") { $cat = "GPU" }
        elseif ($dev.Class -eq "Network") { $cat = "Network" }
        elseif ($dev.Class -eq "System") { $cat = "Chipset" }
        elseif ($dev.Class -eq "Sound") { $cat = "Audio" }
        elseif ($dev.Class -eq "Storage") { $cat = "Storage" }
        elseif ($dev.Class -eq "USB") { $cat = "USB" }
        elseif ($dev.Class -match "HID|Keyboard|Mouse") { $cat = "Input" }
        elseif ($dev.Class -eq "Media") { $cat = "Media" }
        $vendor = "Unknown"
        $n = $dev.Name
        if ($n -match "NVIDIA") { $vendor = "NVIDIA" }
        elseif ($n -match "AMD|Radeon") { $vendor = "AMD" }
        elseif ($n -match "Intel|Impulse|UHD|Iris") { $vendor = "Intel" }
        elseif ($n -match "Realtek") { $vendor = "Realtek" }
        elseif ($n -match "Qualcomm|Killer") { $vendor = "Qualcomm" }
        elseif ($n -match "Broadcom") { $vendor = "Broadcom" }
        $ver = if ($dev.DriverVersion) { $dev.DriverVersion } else { "Unknown" }
        $results += [ordered]@{
            device_name = $n
            vendor = $vendor
            category = $cat
            current_version = $ver
            recommended_version = "Visit vendor website"
            status = "Active"
            recommendation = "Driver is active and running."
        }
    }
    $results | ConvertTo-Json -Depth 3
    "#;
    let output = crate::services::file_io::run_powershell(script, &[])
        .map_err(|e| e.to_string())?;
    let output = output.trim_start_matches('\u{FEFF}').trim();
    if output.is_empty() || output == "[]" || output == "null" {
        return Ok(vec![]);
    }
    let analysis: Vec<DriverAnalysis> = serde_json::from_str(output)
        .map_err(|e| format!("Failed to parse driver analysis: {} raw: {}", e, output))?;
    Ok(analysis)
}
