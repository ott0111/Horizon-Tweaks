use std::os::windows::process::CommandExt;
use serde::{Deserialize, Serialize};
use tauri::command;

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Serialize, Deserialize)]
pub struct BiosInfo {
    pub manufacturer: String,
    pub model: String,
    pub bios_version: String,
    pub bios_date: String,
    pub serial_number: String,
    pub secure_boot: String,
    pub tpm_status: String,
    pub virtualization: String,
    pub smbios_version: String,
    pub cpu_name: String,
    pub baseboard_version: String,
    pub bios_mode: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MemorySlot {
    pub bank: String,
    pub capacity_gb: f64,
    pub speed_mhz: u32,
    pub form_factor: String,
    pub memory_type: String,
    pub manufacturer: String,
    pub part_number: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CpuFeature {
    pub name: String,
    pub supported: bool,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BiosSetting {
    pub name: String,
    pub category: String,
    pub current_value: String,
    pub description: String,
    pub modifiable: bool,
    pub possible_values: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StorageInfo {
    pub model: String,
    pub device_id: String,
    pub size_gb: f64,
    pub media_type: String,
    pub interface_type: String,
    pub firmware: String,
    pub partition_count: u32,
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
pub async fn get_bios_info() -> Result<BiosInfo, String> {
    let script = r#"
$b = Get-CimInstance Win32_BIOS -ErrorAction SilentlyContinue
$cs = Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue
$bb = Get-CimInstance Win32_BaseBoard -ErrorAction SilentlyContinue
$cpu = Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue
$info = @{}
$info.manufacturer = if ($b) { $b.Manufacturer } else { 'Unknown' }
$info.model = if ($cs) { $cs.Model } else { 'Unknown' }
$info.bios_version = if ($b) { $b.SMBIOSBIOSVersion } else { 'Unknown' }
$info.bios_date = if ($b) { $b.ReleaseDate -replace '(\d{4})(\d{2})(\d{2}).*','$1-$2-$3' } else { 'Unknown' }
$info.serial_number = if ($b) { $b.SerialNumber } else { 'Unknown' }
$info.smbios_version = if ($b) { "$($b.SMBIOSMajorVersion).$($b.SMBIOSMinorVersion)" } else { 'Unknown' }
$info.cpu_name = if ($cpu) { $cpu.Name.Trim() } else { 'Unknown' }
$info.baseboard_version = if ($bb) { "$($bb.Product) rev $($bb.Version)" } else { 'Unknown' }
try { $info.bios_mode = if ((Get-FirmwareType).ToString() -eq 'Uefi') { 'UEFI' } else { 'Legacy' } } catch { $info.bios_mode = 'Unknown' }
try { $info.secure_boot = if (Confirm-SecureBootUEFI) { 'Enabled' } else { 'Disabled' } } catch { $info.secure_boot = 'Unavailable' }
try { $tp = Get-CimInstance -Namespace 'root\cimv2\Security\MicrosoftTpm' -ClassName Win32_Tpm; $info.tpm_status = if ($tp.IsEnabled_InitialValue) { 'Ready' } else { 'Disabled' } } catch { $info.tpm_status = 'Not found' }
$info.virtualization = if ($cs.HypervisorPresent) { 'Supported' } else { 'Not supported' }
$info | ConvertTo-Json
"#;
    let out = tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())??;
    serde_json::from_str(&out).map_err(|e| format!("Parse: {}", e))
}

#[command]
pub async fn get_memory_slots() -> Result<Vec<MemorySlot>, String> {
    let script = r#"
Get-CimInstance Win32_PhysicalMemory -ErrorAction SilentlyContinue | Select-Object BankLabel,
@{N='CapacityGB';E={[math]::Round($_.Capacity/1GB,1)}}, Speed,
@{N='FormFactor';E={switch($_.FormFactor){8{'DIMM'}12{'SODIMM'}0{'Unknown'}default{'Other'}}}},
@{N='MemoryType';E={switch($_.MemoryType){20{'DDR'}21{'DDR2'}24{'DDR3'}26{'DDR4'}0{'Unknown'}default{'DDR5'}}}},
Manufacturer, PartNumber | ConvertTo-Json
"#;
    let out = tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())??;
    Ok(serde_json::from_str(&out).unwrap_or_default())
}

#[command]
pub async fn get_cpu_features() -> Result<Vec<CpuFeature>, String> {
    let script = r#"
$cpu = Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue
$features = @()
if ($cpu) {
    $features += [PSCustomObject]@{ name = 'Hardware Virtualization'; supported = ($cpu.HypervisorPresent -eq $true); description = if ($cpu.HypervisorPresent) { 'Supported' } else { 'Not available' } }
    $features += [PSCustomObject]@{ name = '64-bit Support'; supported = ($cpu.AddressWidth -eq 64); description = "$($cpu.AddressWidth)-bit Architecture" }
    $features += [PSCustomObject]@{ name = 'Cores / Threads'; supported = $true; description = "$($cpu.NumberOfCores) cores / $($cpu.NumberOfLogicalProcessors) threads" }
    $features += [PSCustomObject]@{ name = 'Max Clock Speed'; supported = $true; description = "$($cpu.MaxClockSpeed) MHz" }
    $features += [PSCustomObject]@{ name = 'Current Clock Speed'; supported = ($cpu.CurrentClockSpeed -gt 0); description = if ($cpu.CurrentClockSpeed -gt 0) { "$($cpu.CurrentClockSpeed) MHz" } else { 'Unknown' } }
    $features += [PSCustomObject]@{ name = 'L2 Cache'; supported = ($cpu.L2CacheSize -gt 0); description = "$($cpu.L2CacheSize) KB" }
    $features += [PSCustomObject]@{ name = 'L3 Cache'; supported = ($cpu.L3CacheSize -gt 0); description = "$($cpu.L3CacheSize) KB" }
    $features += [PSCustomObject]@{ name = 'Architecture'; supported = $true; description = if ($cpu.Architecture -eq 9) { 'x64' } elseif ($cpu.Architecture -eq 0) { 'x86' } else { "ARM/$($cpu.Architecture)" } }
    $features += [PSCustomObject]@{ name = 'Socket'; supported = $true; description = "$($cpu.SocketDesignation)" }
    $features += [PSCustomObject]@{ name = 'Family'; supported = $true; description = "$($cpu.Family)" }
}
$features | ConvertTo-Json
"#;
    let out = tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())??;
    Ok(serde_json::from_str(&out).unwrap_or_default())
}

#[command]
pub async fn get_storage_info() -> Result<Vec<StorageInfo>, String> {
    let script = r#"
Get-CimInstance Win32_DiskDrive -ErrorAction SilentlyContinue | Select-Object Model,
@{N='DeviceID';E={$_.DeviceID}},
@{N='SizeGB';E={[math]::Round($_.Size/1GB,1)}},
@{N='MediaType';E={if($_.MediaType){$_.MediaType}else{if($_.Model -match 'NVMe'){'SSD (NVMe)'}elseif($_.Model -match 'SSD'){'SSD'}elseif($_.Model -match 'Virtual'){'Virtual'}else{'HDD'}}}},
@{N='InterfaceType';E={$_.InterfaceType}},
@{N='Firmware';E={$_.FirmwareRevision}},
@{N='PartitionCount';E={$_.Partitions}} | ConvertTo-Json
"#;
    let out = tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())??;
    Ok(serde_json::from_str(&out).unwrap_or_default())
}

#[command]
pub async fn get_bios_settings() -> Result<Vec<BiosSetting>, String> {
    let script = r#"
$settings = @()
try {
    $s = powercfg /getactivescheme | Select-String 'GUID'
    $plan = if ($s) { ($s.ToString() -replace '.*\(|\).*','').Trim() } else { 'Unknown' }
    $settings += [PSCustomObject]@{ name = 'Active Power Plan'; category = 'Power'; current_value = $plan; description = 'Current power scheme'; modifiable = $true; possible_values = @('Balanced', 'High Performance', 'Power Saver') }
} catch {}
try {
    $v = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power' -Name HiberbootEnabled -EA 0).HiberbootEnabled
    $settings += [PSCustomObject]@{ name = 'Fast Startup'; category = 'Power'; current_value = if ($v -eq 1) { 'Enabled' } else { 'Disabled' }; description = 'Hybrid boot (fast startup)'; modifiable = $true; possible_values = @('Enabled', 'Disabled') }
} catch {}
try {
    $v = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl' -Name Win32PrioritySeparation -EA 0).Win32PrioritySeparation
    $settings += [PSCustomObject]@{ name = 'CPU Quantum'; category = 'CPU'; current_value = if ($v) { "$v" } else { '2 (default)' }; description = 'CPU scheduling length'; modifiable = $true; possible_values = @('2 (Short)', '24 (Long)', '38 (Var Length)') }
} catch {}
try {
    $v = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard' -Name EnableVirtualizationBasedSecurity -EA 0).EnableVirtualizationBasedSecurity
    $settings += [PSCustomObject]@{ name = 'VBS'; category = 'Security'; current_value = if ($v -eq 1) { 'Enabled' } else { 'Disabled' }; description = 'Virtualization-Based Security'; modifiable = $true; possible_values = @('Disabled', 'Enabled') }
} catch {}
try {
    $t = bcdedit /enum {current} | Select-String 'timeout'
    $settings += [PSCustomObject]@{ name = 'Boot Timeout'; category = 'Boot'; current_value = if ($t) { ($t -replace 'timeout\s+','').Trim() + 's' } else { '30s' }; description = 'Boot menu timeout seconds'; modifiable = $true; possible_values = @('0s', '5s', '10s', '30s') }
} catch {}
try {
    $sb = Confirm-SecureBootUEFI -EA 0
    $settings += [PSCustomObject]@{ name = 'Secure Boot'; category = 'Security'; current_value = if ($sb) { 'Enabled' } else { 'Disabled' }; description = 'UEFI Secure Boot'; modifiable = $false; possible_values = @('N/A') }
} catch {}
try {
    $tpm = Get-CimInstance -Namespace 'root\cimv2\Security\MicrosoftTpm' -ClassName Win32_Tpm -EA 0
    $settings += [PSCustomObject]@{ name = 'TPM'; category = 'Security'; current_value = if ($tpm -and $tpm.IsEnabled_InitialValue) { 'Ready' } else { 'Not available' }; description = 'Trusted Platform Module'; modifiable = $false; possible_values = @('N/A') }
} catch {}
try {
    $bootDesc = (bcdedit /enum firmware | Select-String 'description' | Select-Object -First 3 | ForEach-Object { $_ -replace 'description\s+','' }) -join ', '
    $settings += [PSCustomObject]@{ name = 'Boot Order'; category = 'Boot'; current_value = if ($bootDesc) { $bootDesc.Substring(0, [math]::Min(60, $bootDesc.Length)) } else { 'Unknown' }; description = 'UEFI boot entry order'; modifiable = $false; possible_values = @('N/A') }
} catch {}
try {
    $total = (Get-CimInstance Win32_ComputerSystem -EA 0).TotalPhysicalMemory
    $settings += [PSCustomObject]@{ name = 'Total Memory'; category = 'Memory'; current_value = "$([math]::Round($total/1GB,1)) GB"; description = 'Installed physical RAM'; modifiable = $false; possible_values = @('N/A') }
} catch {}
try {
    $v = (Get-ItemProperty 'HKLM:\HARDWARE\DESCRIPTION\System\BIOS' -Name 'SystemFamily' -EA 0).SystemFamily
    $settings += [PSCustomObject]@{ name = 'System Family'; category = 'System'; current_value = if ($v) { "$v" } else { 'Unknown' }; description = 'Product family from BIOS'; modifiable = $false; possible_values = @('N/A') }
} catch {}
try {
    $v = (Get-ItemProperty 'HKLM:\HARDWARE\DESCRIPTION\System\CentralProcessor\0' -Name 'ProcessorNameString' -EA 0).ProcessorNameString
    $settings += [PSCustomObject]@{ name = 'Processor'; category = 'CPU'; current_value = if ($v) { "$v".Trim() } else { 'Unknown' }; description = 'CPU model'; modifiable = $false; possible_values = @('N/A') }
} catch {}
try {
    $v = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' -Name 'DisplayVersion' -EA 0).DisplayVersion
    $settings += [PSCustomObject]@{ name = 'Windows Version'; category = 'System'; current_value = if ($v) { "$v" } else { 'Unknown' }; description = 'Windows release'; modifiable = $false; possible_values = @('N/A') }
} catch {}
try {
    $v = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Services\USB' -Name 'DisableSelectiveSuspend' -EA 0).DisableSelectiveSuspend
    $settings += [PSCustomObject]@{ name = 'USB Selective Suspend'; category = 'USB'; current_value = if ($v -eq 1) { 'Disabled' } else { 'Enabled' }; description = 'USB power saving'; modifiable = $true; possible_values = @('Enabled', 'Disabled') }
} catch {}
try {
    $v = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' -Name 'LargeSystemCache' -EA 0).LargeSystemCache
    $settings += [PSCustomObject]@{ name = 'Large System Cache'; category = 'Memory'; current_value = if ($v -eq 1) { 'Enabled' } else { 'Disabled' }; description = 'File system cache size'; modifiable = $true; possible_values = @('Disabled', 'Enabled') }
} catch {}
try {
    $v = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' -Name 'DisablePagingExecutive' -EA 0).DisablePagingExecutive
    $settings += [PSCustomObject]@{ name = 'Disable Paging Executive'; category = 'Memory'; current_value = if ($v -eq 1) { 'Enabled' } else { 'Disabled' }; description = 'Keep kernel in RAM (not paged)'; modifiable = $true; possible_values = @('Disabled', 'Enabled') }
} catch {}
try {
    $v = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Services\ndis\Parameters' -Name 'DisableTaskOffload' -EA 0).DisableTaskOffload
    $settings += [PSCustomObject]@{ name = 'Network Task Offload'; category = 'Network'; current_value = if ($v -eq 1) { 'Disabled' } else { 'Enabled' }; description = 'NIC hardware offloading'; modifiable = $true; possible_values = @('Enabled', 'Disabled') }
} catch {}
$settings | ConvertTo-Json -Depth 3
"#;
    let out = tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())??;
    Ok(serde_json::from_str(&out).unwrap_or_default())
}

#[command]
pub async fn set_bios_setting(name: String, value: String) -> Result<String, String> {
    let script = match name.as_str() {
        "Fast Startup" => {
            let v = if value == "Enabled" { "1" } else { "0" };
            format!("Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power' -Name HiberbootEnabled -Value {} -Type DWord -Force", v)
        }
        "CPU Quantum" => {
            let v = value.split(' ').next().unwrap_or("2");
            format!("Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Name Win32PrioritySeparation -Value {} -Type DWord -Force", v)
        }
        "VBS" => {
            let v = if value == "Enabled" { "1" } else { "0" };
            format!("Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard' -Name EnableVirtualizationBasedSecurity -Value {} -Type DWord -Force", v)
        }
        "Boot Timeout" => {
            let s = value.trim_end_matches('s');
            return Ok(run_ps(&format!("bcdedit /timeout {}", s)).unwrap_or_else(|e| e));
        }
        "Active Power Plan" => {
            let guid = match value.as_str() {
                "High Performance" => "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c",
                "Power Saver" => "a1841308-3541-4fab-bc81-f71556f20b4a",
                _ => "381b4222-f694-41f0-9685-ff5bb260df2e",
            };
            return run_ps(&format!("powercfg /setactive {}", guid)).map(|_| format!("Power plan: {}", value));
        }
        "USB Selective Suspend" => {
            let v = if value == "Disabled" { "1" } else { "0" };
            format!("Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB' -Name DisableSelectiveSuspend -Value {} -Type DWord -Force", v)
        }
        "Large System Cache" => {
            let v = if value == "Enabled" { "1" } else { "0" };
            format!("Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management' -Name LargeSystemCache -Value {} -Type DWord -Force", v)
        }
        "Disable Paging Executive" => {
            let v = if value == "Enabled" { "1" } else { "0" };
            format!("Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management' -Name DisablePagingExecutive -Value {} -Type DWord -Force", v)
        }
        "Network Task Offload" => {
            let v = if value == "Disabled" { "1" } else { "0" };
            format!("Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\ndis\\Parameters' -Name DisableTaskOffload -Value {} -Type DWord -Force", v)
        }
        _ => return Err(format!("Not modifiable: {}", name)),
    };
    run_ps(&script)?;
    Ok(format!("{} set to {}", name, value))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FanInfo {
    pub supported: bool,
    pub fan_count: u32,
    pub fans: Vec<FanDevice>,
    pub method: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FanDevice {
    pub name: String,
    pub current_speed: u32,
    pub max_speed: u32,
    pub active_cooling: bool,
    pub unit: String,
}

#[command]
pub async fn get_fan_info() -> Result<FanInfo, String> {
    let script = r#"
$result = @{ supported = $false; fan_count = 0; fans = @(); method = 'none' }
try {
    $fans = Get-CimInstance Win32_Fan -ErrorAction Stop
    if ($fans -and $fans.Count -gt 0) {
        $result.supported = $true
        $result.fan_count = [uint32]$fans.Count
        $result.method = 'WMI'
        $fanList = @()
        $idx = 0
        foreach ($f in $fans) {
            $fanList += @{
                name = if ($f.Name) { $f.Name } else { "Fan $($idx + 1)" }
                current_speed = if ($f.ActiveCooling) { 100 } else { 0 }
                max_speed = 100
                active_cooling = [bool]$f.ActiveCooling
                unit = 'percent'
            }
            $idx++
        }
        $result.fans = $fanList
    }
} catch {}
if (-not $result.supported) {
    try {
        $query = powercfg /query SCHEME_CURRENT 5d76a2ca-e8c0-402f-a133-2158492d58ad 2>$null
        if ($query -and ($query -join "`n") -match 'Fan Policy') {
            $result.supported = $true
            $result.method = 'ACPI'
            $result.fan_count = 1
            $currentVal = 0
            $maxVal = 3
            $currentName = 'Balanced'
            $joined = $query -join "`n"
            if ($joined -match 'Current Power Index:\s+(\d+)') {
                $currentVal = [int]$Matches[1]
            }
            if ($joined -match 'Index:\s+(\d+)\s+Name:\s+(.+)') {
                $maxVal = [math]::Max($maxVal, [int]$Matches[1])
                if ([int]$Matches[1] -eq $currentVal) { $currentName = $Matches[2].Trim() }
            }
            $pct = if ($maxVal -gt 0) { [math]::Round(($currentVal / $maxVal) * 100) } else { 0 }
            $result.fans = @(@{
                name = 'System Fan'
                current_speed = $pct
                max_speed = 100
                active_cooling = $true
                unit = 'policy:' + $currentName
            })
        }
    } catch {}
}
if (-not $result.supported) {
    try {
        $tz = Get-CimInstance MSAcpi_ThermalZoneTemperature -Namespace 'root/WMI' -ErrorAction Stop
        if ($tz -and $tz.Count -gt 0) {
            $result.supported = $true
            $result.method = 'ThermalZone'
            $result.fan_count = 0
            $result.fans = @()
        }
    } catch {}
}
if (-not $result.supported) {
    try {
        $cs = Get-CimInstance Win32_ComputerSystem -ErrorAction Stop
        $enc = Get-CimInstance Win32_SystemEnclosure -ErrorAction Stop
        $isLaptop = $false
        if ($cs.SystemType -match 'Laptop|Notebook') { $isLaptop = $true }
        if ($enc.ChassisTypes) {
            foreach ($ct in $enc.ChassisTypes) {
                if ($ct -in @(8, 9, 10, 14)) { $isLaptop = $true }
            }
        }
        if ($isLaptop) {
            $result.supported = $true
            $result.method = 'Laptop'
            $result.fan_count = 1
            $result.fans = @(@{
                name = 'Laptop Fan'
                current_speed = 50
                max_speed = 100
                active_cooling = $true
                unit = 'auto'
            })
        }
    } catch {}
}
$result | ConvertTo-Json -Depth 4
"#;
    let out = tokio::task::spawn_blocking(move || run_ps(script)).await.map_err(|e| e.to_string())??;
    serde_json::from_str(&out).map_err(|e| format!("Parse: {}", e))
}

#[command]
pub async fn set_fan_policy(level: String) -> Result<String, String> {
    let idx = match level.as_str() {
        "silent" | "off" => "0",
        "balanced" => "1",
        "performance" | "max" => "3",
        _ => return Err(format!("Unknown fan level: {}", level)),
    };
    let script = format!(
        "powercfg /setacvalueindex SCHEME_CURRENT 5d76a2ca-e8c0-402f-a133-2158492d58ad {0}\npowercfg /setdcvalueindex SCHEME_CURRENT 5d76a2ca-e8c0-402f-a133-2158492d58ad {0}\npowercfg /setactive SCHEME_CURRENT",
        idx
    );
    run_ps(&script)?;
    Ok(format!("Fan policy set to: {}", level))
}
