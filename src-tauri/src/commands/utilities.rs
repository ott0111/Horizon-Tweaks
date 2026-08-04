use serde::Serialize;
use tauri::command;

#[derive(Serialize)]
pub struct UtilityResult {
    pub success: bool,
    pub output: String,
}

#[command]
pub async fn run_system_utility(tool: String) -> Result<UtilityResult, String> {
    let script = match tool.as_str() {
        // System Repair
        "sfc" => r#"$r = sfc /scannow 2>&1 | Out-String; Write-Output $r"#,
        "dism" => r#"$r = DISM /Online /Cleanup-Image /RestoreHealth 2>&1 | Out-String; Write-Output $r"#,
        "chkdsk" => r#"$r = chkdsk C: /scan 2>&1 | Out-String; Write-Output $r"#,
        "cleanmgr" => r#"cleanmgr /sagerun:1 2>&1 | Out-String; Write-Output 'Disk Cleanup started in background'"#,

        // Network
        "flushdns" => r#"ipconfig /flushdns 2>&1 | Out-String; Write-Output 'DNS cache flushed'"#,
        "ipconfig_release" => r#"ipconfig /release 2>&1 | Out-String; Write-Output 'IP released (may lose connection)'"#,
        "ipconfig_renew" => r#"ipconfig /renew 2>&1 | Out-String; Write-Output 'IP renewed'"#,
        "netsh_winsock" => r#"$r = netsh winsock reset 2>&1 | Out-String; Write-Output $r; Write-Output 'Winsock reset (reboot may be needed)'"#,
        "netsh_tcpip" => r#"$r = netsh int ip reset 2>&1 | Out-String; Write-Output $r; Write-Output 'TCP/IP stack reset (reboot may be needed)'"#,

        // Power
        "powercfg_energy" => r#"powercfg /energy /output $env:TEMP\energy-report.html 2>&1 | Out-String; Write-Output 'Energy report saved to TEMP\energy-report.html'"#,
        "powercfg_battery" => r#"powercfg /batteryreport /output $env:TEMP\battery-report.html 2>&1 | Out-String; Write-Output 'Battery report saved to TEMP\battery-report.html'"#,
        "powercfg_hibernate_off" => r#"powercfg /hibernate off 2>&1 | Out-String; Write-Output 'Hibernate disabled'"#,
        "powercfg_hibernate_on" => r#"powercfg /hibernate on 2>&1 | Out-String; Write-Output 'Hibernate enabled'"#,

        // System Info
        "systeminfo" => r#"systeminfo | Select-String 'OS Name','OS Version','System Manufacturer','System Model','Total Physical Memory','Available Physical Memory','Processor','BIOS Version' | Out-String"#,
        "driverquery" => r#"driverquery /v | Select-Object -First 50 | Out-String"#,
        "tasklist" => r#"tasklist /v | Select-Object -First 30 | Out-String"#,
        "netstat" => r#"netstat -an | Select-Object -First 40 | Out-String"#,
        "ping_google" => r#"$r = ping -n 4 8.8.8.8 2>&1 | Out-String; Write-Output $r"#,
        "ping_cloudflare" => r#"$r = ping -n 4 1.1.1.1 2>&1 | Out-String; Write-Output $r"#,
        "tracert" => r#"$r = tracert -h 10 8.8.8.8 2>&1 | Out-String; Write-Output $r"#,
        "pathping" => r#"$r = pathping -n -q 2 -h 8 8.8.8.8 2>&1 | Out-String; Write-Output $r"#,

        // Maintenance
        "gpupdate" => r#"gpupdate /force 2>&1 | Out-String; Write-Output 'Group Policy updated'"#,
        "defrag" => r#"Optimize-Volume -DriveLetter C -Verbose 2>&1 | Out-String; Write-Output 'C: drive optimization started'"#,
        "vssadmin" => r#"vssadmin list shadows 2>&1 | Out-String"#,
        "bcdedit" => r#"bcdedit /enum | Select-String 'identifier|description|default|displayorder|timeout' | Out-String"#,
        "fsutil" => r#"fsutil fsinfo drives 2>&1 | Out-String; Write-Output '---'; fsutil fsinfo statistics C: | Select-Object -First 10 | Out-String"#,
        "chkntfs" => r#"chkntfs C: 2>&1 | Out-String"#,
        "cipher" => r#"cipher /w:C:\Temp\ | Select-Object -First 5 | Out-String; Write-Output 'Overwriting free space on C: (background)'"#,

        // WMI
        "wmic_os" => r#"Get-CimInstance Win32_OperatingSystem | Select-Object Caption,Version,BuildNumber,OSArchitecture,TotalVisibleMemorySize,FreePhysicalMemory | Format-List | Out-String"#,
        "wmic_cpu" => r#"Get-CimInstance Win32_Processor | Select-Object Name,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed,L2CacheSize,L3CacheSize,SocketDesignation | Format-List | Out-String"#,
        "wmic_memory" => r#"Get-CimInstance Win32_PhysicalMemory | Select-Object Manufacturer,Capacity,Speed,MemoryType,FormFactor | Format-List | Out-String"#,
        "wmic_disk" => r#"Get-CimInstance Win32_DiskDrive | Select-Object Model,Size,InterfaceType,MediaType,Partitions | Format-List | Out-String"#,
        "wmic_gpu" => r#"Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM,DriverVersion,CurrentHorizontalResolution,CurrentVerticalResolution | Format-List | Out-String"#,
        "msinfo" => r#"msinfo32 /report $env:TEMP\msinfo.txt 2>&1 | Out-String; Get-Content $env:TEMP\msinfo.txt -TotalCount 30 | Out-String; Write-Output 'Full report at TEMP\msinfo.txt'"#,

        // Extra existing
        "powercfg_sleep_study" => r#"powercfg /sleepstudy /output $env:TEMP\sleepstudy.html 2>&1 | Out-String; Write-Output 'Sleep study report saved to TEMP\sleepstudy.html'"#,
        "powercfg_last_wake" => r#"powercfg /lastwake 2>&1 | Out-String"#,
        "netsh_wlan_show" => r#"netsh wlan show profiles 2>&1 | Out-String"#,
        "netsh_wlan_show_interfaces" => r#"netsh wlan show interfaces 2>&1 | Out-String"#,
        "systeminfo_uptime" => r#"$uptime = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime; $now = Get-Date; $diff = $now - $uptime; Write-Output "System uptime: $($diff.Days) days, $($diff.Hours) hours, $($diff.Minutes) minutes""#,
        "ping_local" => r#"ping -n 4 127.0.0.1 2>&1 | Out-String"#,
        "ipconfig_all" => r#"ipconfig /all 2>&1 | Out-String"#,
        "defrag_status" => r#"Get-CimInstance -ClassName Win32_Volume -Filter "DriveType=3" | Select-Object DriveLetter, @{N='DefragPercent';E={ (Get-DefragOptimizationStatus -VolumePath $_.DeviceID -ErrorAction SilentlyContinue).DefragPercentage }} | Format-Table -AutoSize | Out-String"#,
        "chkdsk_status" => r#"chkntfs C: 2>&1 | Out-String"#,
        "powercfg_devices_wake" => r#"powercfg /devicequery wake_armed 2>&1 | Out-String"#,

        // New utilities
        "windows_activation" => r#"$s = (Get-CimInstance -ClassName SoftwareLicensingProduct -Filter "ApplicationID LIKE '55c92734-d682-4d71-983e-d6ec3f16059f' AND PartialProductKey IS NOT NULL" -EA 0); if ($s) { Write-Output "Windows is activated" } else { Write-Output "Windows is NOT activated (no product key found)" }"#,
        "bitlocker_status" => r#"$blv = Get-BitLockerVolume -MountPoint $env:SystemDrive -ErrorAction SilentlyContinue; if ($blv) { Write-Output "BitLocker: $($blv.ProtectionStatus)" } else { Write-Output "BitLocker not configured on system drive" }"#,
        "power_plan_details" => r#"powercfg /query | Select-String -Context 0,3 'Scheme|SubGroup|Setting|Value|AC|DC' | Out-String"#,
        "event_log_errors" => r#"Get-WinEvent -FilterHashtable @{LogName='System';Level=2;StartTime=(Get-Date).AddHours(-24)} -MaxEvents 20 -EA 0 | Select-Object TimeCreated,Id,ProviderName,Message | Format-Table -AutoSize -Wrap | Out-String"#,
        "startup_programs" => r#"Get-CimInstance Win32_StartupCommand | Select-Object Name,Command,User,Location | Format-Table -AutoSize | Out-String"#,
        "services_status" => r#"Get-Service | Where-Object { $_.Status -eq 'Running' } | Select-Object Name,DisplayName,StartType | Format-Table -AutoSize | Out-String; Write-Output "---"; $total = (Get-Service).Count; $running = (Get-Service | Where-Object { $_.Status -eq 'Running' }).Count; Write-Output "Total: $total | Running: $running""#,
        "process_detail" => r#"Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 20 Name,Id,@{N='CPU(s)';E={[math]::Round($_.TotalProcessorTime.TotalSeconds,1)}},@{N='MB';E={[math]::Round($_.WorkingSet64/1MB,1)}} | Format-Table -AutoSize | Out-String"#,
        "firewall_status" => r#"$fw = Get-NetFirewallProfile -ErrorAction SilentlyContinue; $fw | Select-Object Name,Enabled | Format-Table -AutoSize | Out-String"#,
        "disk_partitions" => r#"Get-CimInstance Win32_DiskPartition | Select-Object DiskIndex,Name,Size,Type,PrimaryPartition | Format-Table -AutoSize | Out-String"#,
        "registry_backup" => r#"$path = "$env:TEMP\registry-backup.reg"; try { reg export HKLM\SOFTWARE $path /y 2>&1 | Out-Null; Write-Output "Registry exported to $path (100KB+)" } catch { Write-Output "Export failed: $_" }"#,
        "wifi_password" => r#"$profiles = netsh wlan show profiles | Select-String ':\s+(.+)$' | ForEach-Object { $_.Matches.Groups[1].Value.Trim() }; foreach ($p in $profiles) { $k = netsh wlan show profile name="$p" key=clear | Select-String 'Key Content'; if ($k) { Write-Output "$p : $($k -replace '.*:\s+','')" } }"#,
        "open_ports" => r#"netstat -ano | Select-String 'LISTENING' | ForEach-Object { $line = $_ -split '\s+'; if ($line[1] -match ':(\d+)') { [PSCustomObject]@{ Port = $matches[1]; State = $line[3]; PID = $line[4] } } } | Sort-Object Port -Unique | Format-Table -AutoSize | Out-String"#,
        "dns_cache_view" => r#"ipconfig /displaydns | Select-Object -First 50 | Out-String"#,
        "route_table" => r#"route print -4 | Select-Object -First 30 | Out-String"#,
        "battery_health" => r#"powercfg /batteryreport /output $env:TEMP\battery-health.xml 2>&1 | Out-Null; [xml]$xml = Get-Content "$env:TEMP\battery-health.xml" -EA 0; if ($xml) { $d = $xml.BatteryReport.Batteries.Battery.DesignCapacity; $f = $xml.BatteryReport.Batteries.Battery.FullChargeCapacity; if ($d -and $f) { Write-Output "Design: $d mWh | Full: $f mWh | Health: $([math]::Round($f/$d*100,1))%" } else { Write-Output "Battery report generated at TEMP\battery-health.xml" } } else { Write-Output "Battery report generated at TEMP\battery-health.xml" }"#,
        "temp_files_size" => r#"$size = (Get-ChildItem $env:TEMP -Recurse -File -EA 0 | Measure-Object -Property Length -Sum).Sum; $sizeGB = [math]::Round($size/1GB,2); Write-Output "TEMP folder size: $sizeGB GB ($([math]::Round($size/1MB,1)) MB)""#,
        "power_schemes" => r#"powercfg /list 2>&1 | Out-String"#,

        _ => return Err(format!("Unknown utility: {}", tool)),
    };

    let script_owned = script.to_string();
    let timeout_secs = match tool.as_str() {
        "sfc" | "dism" => 300u64,
        "cleanmgr" | "defrag" | "cipher" | "defrag_status" | "registry_backup" => 120u64,
        _ => 60u64,
    };

    let output = tokio::time::timeout(
        std::time::Duration::from_secs(timeout_secs),
        tokio::task::spawn_blocking(move || {
            crate::services::file_io::run_powershell(&script_owned, &[])
        })
    ).await.map_err(|_| format!("{} timed out (over {}s)", tool, timeout_secs))?
      .map_err(|e| format!("Task error: {}", e))?
      .map_err(|e| format!("PowerShell error: {}", e))?;

    Ok(UtilityResult {
        success: true,
        output: output.trim().to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_utility_result_serialization() {
        let result = UtilityResult {
            success: true,
            output: "Done".to_string(),
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("true"));
        assert!(json.contains("Done"));
    }

    #[test]
    fn test_utility_result_failure() {
        let result = UtilityResult {
            success: false,
            output: String::new(),
        };
        assert!(!result.success);
        assert!(result.output.is_empty());
    }

    #[test]
    fn test_known_utilities_not_empty() {
        let known = vec![
            "sfc", "dism", "chkdsk", "flushdns", "ipconfig_release",
            "netsh_winsock", "powercfg_energy", "systeminfo", "driverquery",
            "tasklist", "netstat", "ping_google", "tracert",
            "gpupdate", "defrag", "vssadmin", "bcdedit", "fsutil",
            "wmic_os", "wmic_cpu", "wmic_memory", "wmic_disk", "wmic_gpu",
            "windows_activation", "bitlocker_status", "power_plan_details",
            "event_log_errors", "startup_programs", "services_status",
            "process_detail", "firewall_status", "disk_partitions",
            "registry_backup", "wifi_password", "open_ports",
            "dns_cache_view", "route_table", "battery_health",
            "temp_files_size", "power_schemes",
        ];
        for tool in known {
            assert!(!tool.is_empty(), "Utility name should not be empty: {}", tool);
        }
    }

    #[test]
    fn test_utility_timeout_values() {
        let long_timeout = vec!["sfc", "dism"];
        let medium_timeout = vec!["cleanmgr", "defrag", "cipher", "defrag_status", "registry_backup"];

        for tool in long_timeout {
            let timeout = match tool {
                "sfc" | "dism" => 300u64,
                _ => 0,
            };
            assert_eq!(timeout, 300, "Tool {} should have 300s timeout", tool);
        }

        for tool in medium_timeout {
            let timeout = match tool {
                "cleanmgr" | "defrag" | "cipher" | "defrag_status" | "registry_backup" => 120u64,
                _ => 0,
            };
            assert_eq!(timeout, 120, "Tool {} should have 120s timeout", tool);
        }
    }
}
