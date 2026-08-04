use crate::services::rollback_manager::RollbackManager;
use serde::{Deserialize, Serialize};
use tauri::{command, State};
use std::sync::Impulse;
use tokio::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Snapshot {
    pub id: String,
    pub name: String,
    pub description: String,
    pub date: String,
    pub status: String,
    #[serde(rename = "type")]
    pub type_field: String,
}

#[command]
pub async fn list_snapshots(_rollback: State<'_, Impulse<Mutex<RollbackManager>>>) -> Result<Vec<Snapshot>, String> {
    let script = r#"
    try {
        # Get system restore points
        $restorePoints = Get-ComputerRestorePoint | Sort-Object CreationTime -Descending | Select-Object -First 20
        
        $snapshots = @()
        
        foreach ($point in $restorePoints) {
            $snapshots += [PSCustomObject]@{
                id = $point.SequenceNumber.ToString()
                name = $point.Description
                description = $point.Description
                date = $point.CreationTime.ToString("yyyy-MM-dd HH:mm:ss")
                status = if ($point.EventType -eq "BEGIN_SYSTEM_CHANGE") { "Available" } else { "In Progress" }
                type = "System Restore Point"
            }
        }
        
        # Get Impulse custom snapshots
        $arkPath = "$env:USERPROFILE\Horizon Tweaks Optimization\Snapshots"
        if (Test-Path $arkPath) {
            Get-ChildItem $arkPath -Directory -ErrorAction SilentlyContinue | ForEach-Object {
                $metadataFile = Join-Path $_.FullName "metadata.json"
                if (Test-Path $metadataFile) {
                    try {
                        $metadata = Get-Content $metadataFile | ConvertFrom-Json
                        $snapshots += [PSCustomObject]@{
                            id = $metadata.id
                            name = $metadata.name
                            description = $metadata.description
                            date = $metadata.date
                            status = $metadata.status
                            type = $metadata.type
                        }
                    } catch {
                        # Skip invalid metadata files
                    }
                }
            }
        }
        
        $snapshots = $snapshots | Group-Object id | ForEach-Object { $_.Group[0] }
        $snapshots | ConvertTo-Json -Depth 3 -Compress
    } catch {
        @() | ConvertTo-Json -Compress
    }
    "#;
    
    let output = crate::services::file_io::run_powershell(script, &[])
        .map_err(|e| e.to_string())?;
    
    let trimmed = output.trim();
    if trimmed.is_empty() {
        return Ok(vec![]);
    }
    
    let snapshots: Vec<Snapshot> = serde_json::from_str(trimmed)
        .or_else(|_| {
            if let Some(start) = trimmed.find('[') {
                if let Some(end) = trimmed.rfind(']') {
                    return serde_json::from_str(&trimmed[start..=end]);
                }
            }
            Ok(vec![])
        })
        .unwrap_or_default();
    
    Ok(snapshots)
}

#[command]
pub async fn create_snapshot(
    name: String,
    description: String,
    _rollback: State<'_, Impulse<Mutex<RollbackManager>>>,
) -> Result<String, String> {
    // Check if we're admin - snapshot requires elevation
    if !crate::commands::admin_check::is_admin() {
        return Err("Creating snapshots requires administrator privileges. Please restart the app as Administrator.".into());
    }
    let id = format!("snapshot-{}", chrono::Utc::now().timestamp());
    let date = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Fast registry-only snapshot — no system restore point, no config backups
    // Takes < 5 seconds instead of 15 minutes
    let script = format!(r#"
$id = "{id}"
$backupPath = "$env:USERPROFILE\Horizon Tweaks Optimization\Snapshots\$id"
New-Item -ItemType Directory -Path $backupPath -Force -ErrorAction Stop | Out-Null

# Quick export of critical registry keys (parallel via Start-Job)
$regKeys = @(
    "HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
    "HKCU\Software\Microsoft\Windows\CurrentVersion\RunOnce",
    "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
    "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce",
    "HKCU\Control Panel\Desktop"
)
$jobs = @()
foreach ($key in $regKeys) {{
    $safeName = ($key -split '\\')[-1] -replace '[^a-zA-Z0-9]','_'
    $regCmd = "reg export `"$key`" `"$backupPath\$safeName.reg`" /y 2>`$null"
    $j = Start-Job -ScriptBlock {{ param($c) Invoke-Expression $c }} -ArgumentList $regCmd
    $jobs += @{{job = $j; name = $safeName}}
}}
$exported = 0
foreach ($entry in $jobs) {{
    $entry.job | Wait-Job -Timeout 10 | Out-Null
    if ($entry.job.State -eq 'Running') {{ $entry.job | Stop-Job -EA 0 }}
    $entry.job | Remove-Job -Force -EA 0
    if (Test-Path "$backupPath\$($entry.name).reg") {{ $exported++ }}
}}

$metadata = @{{
    id = "{id}"
    name = "{name}"
    description = "{description}"
    date = "{date}"
    status = "Available"
    type = "Registry Snapshot"
    registry_backups = $exported
    config_backups = 0
    has_system_restore = $false
}}
$metadata | ConvertTo-Json -Depth 4 | Out-File "$backupPath\metadata.json" -Force

Write-Host "SNAPSHOT_OK:Snapshot '$name' created ($exported registry keys)"
"#, id = id, name = name, description = description, date = date);

    match crate::services::file_io::run_powershell(&script, &[]) {
        Ok(output) => {
            let trimmed = output.trim();
            let success = trimmed.lines().find(|l| l.contains("SNAPSHOT_OK:"));
            let failure = trimmed.lines().find(|l| l.contains("SNAPSHOT_FAIL:"));
            if let Some(line) = success {
                let msg = line.split("SNAPSHOT_OK:").nth(1).unwrap_or("").trim();
                Ok(msg.to_string())
            } else if let Some(line) = failure {
                let msg = line.split("SNAPSHOT_FAIL:").nth(1).unwrap_or("").trim();
                Err(format!("Snapshot creation failed: {}", msg))
            } else {
                Err(format!("Snapshot creation failed: {}", trimmed))
            }
        }
        Err(e) => Err(format!("Failed to run snapshot script: {}", e)),
    }
}

#[command]
pub async fn rollback_snapshot(
    id: String,
    _rollback: State<'_, Impulse<Mutex<RollbackManager>>>,
) -> Result<String, String> {
    // Check if we're admin - rollback requires elevation
    if !crate::commands::admin_check::is_admin() {
        return Err("Rollback requires administrator privileges. Please restart the app as Administrator.".into());
    }
    let script = format!(
        r#"
        try {{
            $snapshotId = "{}"
            Write-Host "Starting rollback to snapshot: $snapshotId"
            
            # Check if it's a system restore point
            if ($snapshotId -match '^\d+$') {{
                Write-Host "Performing system restore to restore point $snapshotId"
                Restore-Computer -RestorePoint $snapshotId -Confirm:$false
                Write-Host "System restore initiated. The system will restart to complete the restore."
                "System restore initiated. Computer will restart to complete rollback to snapshot $snapshotId."
            }} else {{
                # Check if it's an Impulse custom snapshot
                $arkPath = "$env:USERPROFILE\Horizon Tweaks Optimization\Snapshots\{}"
                if (Test-Path $arkPath) {{
                    Write-Host "Restoring from Impulse custom snapshot"
                    
                    # Import registry backups
                    $regFiles = Get-ChildItem $arkPath -Filter "*.reg" -ErrorAction SilentlyContinue
                    foreach ($regFile in $regFiles) {{
                        Write-Host "Importing registry from $($regFile.Name)"
                        reg import "$($regFile.FullName)" | Out-Null
                    }}
                    
                    # Restore configuration files
                    $configFiles = @("hosts", "protocol", "services", "drvindex.inf")
                    foreach ($configFile in $configFiles) {{
                        $sourceFile = Join-Path $arkPath $configFile
                        $targetFile = "$env:WINDIR\System32\drivers\etc\$configFile"
                        if ($configFile -eq "drvindex.inf") {{
                            $targetFile = "$env:WINDIR\inf\$configFile"
                        }}
                        
                        if (Test-Path $sourceFile) {{
                            Write-Host "Restoring $configFile"
                            Copy-Item $sourceFile $targetFile -Force
                        }}
                    }}
                    
                    # Restore Impulse Platform settings if available
                    $arkBackupPath = Join-Path $arkPath "HorizonConfig"
                    if (Test-Path $arkBackupPath) {{
                        Write-Host "Restoring Impulse configuration"
                        $arkConfigPath = "$env:USERPROFILE\Horizon Tweaks Optimization"
                        if (Test-Path $arkConfigPath) {{
                            Copy-Item "$arkBackupPath\*" $arkConfigPath -Recurse -Force
                        }}
                    }}
                    
                    # Restart Windows Explorer to apply settings
                    Write-Host "Restarting Windows Explorer to apply changes"
                    Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
                    Start-Sleep -Seconds 2
                    Start-Process explorer -ErrorAction SilentlyContinue
                    
                    Write-Host "Custom snapshot rollback completed"
                    "Successfully rolled back to custom snapshot: {}"
                }} else {{
                    throw "Snapshot not found: $snapshotId"
                }}
            }}
        }} catch {{
            "Failed to rollback to snapshot: $($_.Exception.Message)"
        }}
        "#, id, id, id
    );
    
    let output = crate::services::file_io::run_powershell(&script, &[])
        .map_err(|e| e.to_string())?;
    
    Ok(output.trim().to_string())
}

#[command]
pub async fn delete_snapshot(
    id: String,
    _rollback: State<'_, Impulse<Mutex<RollbackManager>>>,
) -> Result<String, String> {
    let script = format!(
        r#"
        try {{
            $snapshotId = "{}"
            Write-Host "Deleting snapshot: $snapshotId"
            
            # Check if it's a system restore point
            if ($snapshotId -match '^\d+$') {{
                Write-Host "Deleting system restore point $snapshotId"
                # Note: System restore points cannot be easily deleted via PowerShell
                # They are automatically cleaned up by Windows based on age and disk space
                "System restore points are automatically managed by Windows and cannot be manually deleted."
            }} else {{
                # Check if it's an Impulse custom snapshot
                $arkPathDel = "$env:USERPROFILE\Horizon Tweaks Optimization\Snapshots\{}"
                if (Test-Path $arkPathDel) {{
                    Write-Host "Deleting Impulse custom snapshot"
                    Remove-Item $arkPathDel -Recurse -Force
                    "Successfully deleted custom snapshot: {}"
                }} else {{
                    throw "Snapshot not found: $snapshotId"
                }}
            }}
        }} catch {{
            "Failed to delete snapshot: $($_.Exception.Message)"
        }}
        "#, id, id, id
    );
    
    let output = crate::services::file_io::run_powershell(&script, &[])
        .map_err(|e| e.to_string())?;
    
    Ok(output.trim().to_string())
}
