use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct App {
    pub id: String,
    pub name: String,
    pub version: String,
    pub size: String,
    pub installed_on: String,
    pub publisher: Option<String>,
    #[serde(rename = "type")]
    pub app_type: String,
    pub category: String,
    pub is_bloatware: bool,
    pub is_safe_to_remove: bool,
    pub uninstall_string: Option<String>,
    pub icon_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DebloatResult {
    pub success: bool,
    pub message: String,
    pub removed_count: usize,
}

#[command]
pub fn get_installed_desktop_apps() -> Result<Vec<App>, String> {
    let script = r#"
    $bloatwareKeywords = @('Microsoft', 'Windows', 'Xbox', 'Skype', 'OneDrive', 'Cortana', 'News', 'Weather', 'Money', 'Sports', 'Maps')
    $safeToRemove = @('Microsoft.3DBuilder', 'Microsoft.BingWeather', 'Microsoft.BingNews', 'Microsoft.GetHelp', 'Microsoft.Getstarted', 'Microsoft.Messaging', 'Microsoft.MicrosoftOfficeHub', 'Microsoft.MicrosoftSolitaireCollection', 'Microsoft.People', 'Microsoft.SkypeApp', 'Microsoft.Wallet', 'Microsoft.WindowsAlarms', 'Microsoft.WindowsCamera', 'microsoft.windowscommunicationsapps', 'Microsoft.WindowsMaps', 'Microsoft.WindowsPhone', 'Microsoft.WindowsSoundRecorder', 'Microsoft.XboxApp', 'Microsoft.XboxGameOverlay', 'Microsoft.XboxSpeechToTextOverlay', 'Microsoft.YourPhone', 'Microsoft.ZuneMusic', 'Microsoft.ZuneVideo')
    
    Get-ItemProperty 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
                      'HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
                      'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' |
    Where-Object { $_.DisplayName -ne $null -and $_.DisplayName -notmatch '^KB[0-9]' } |
    ForEach-Object {
        $name = $_.DisplayName
        $publisher = $_.Publisher
        $isBloatware = $false
        $category = "Unknown"
        $isSafe = $false
        
        if ($publisher -and $publisher -like "*Microsoft*") {
            $isBloatware = $true
            $category = "Microsoft"
        } elseif ($publisher -and $publisher -like "*Intel*" -or $publisher -like "*NVIDIA*" -or $publisher -like "*AMD*") {
            $category = "Drivers"
        } elseif ($name -match "Adobe" -or $name -match "Office" -or $name -match "Visual Studio") {
            $category = "Productivity"
        } elseif ($name -match "Steam" -or $name -match "Epic Games" -or $name -match "Origin" -or $name -match "Ubisoft") {
            $category = "Gaming"
        } else {
            $category = "Third Party"
        }
        
        $safeToRemove | ForEach-Object {
            if ($name -match $_ -or $_.PSChildName -match $_) {
                $isSafe = $true
            }
        }
        
        # Get app icon path
        $iconPath = $null
        try {
            # Method 1: Check for icon in registry
            $displayIcon = $_.DisplayIcon
            if ($displayIcon) {
                # Extract path from DisplayIcon (remove quotes and arguments)
                $iconPath = ($displayIcon -split '"')[0]
                if (-not $iconPath) {
                    $iconPath = ($displayIcon -split ',')[0]
                }
            }
            
            # Method 2: Check common locations if no icon found
            if (-not $iconPath -or -not (Test-Path $iconPath)) {
                $appPath = if ($_.InstallLocation) { $_.InstallLocation } else { $null }
                if ($appPath) {
                    # Look for .exe in install location
                    $exeFiles = Get-ChildItem -Path $appPath -Filter "*.exe" -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*$name*" -or $_.BaseName -like "*$name*" }
                    if ($exeFiles) {
                        $iconPath = $exeFiles[0].FullName
                    }
                }
            }
            
            # Method 3: Check system app paths for common apps
            if (-not $iconPath) {
                $commonPaths = @(
                    "C:\Program Files\$name\$name.exe",
                    "C:\Program Files (x86)\$name\$name.exe",
                    "C:\Program Files\$name.exe",
                    "C:\Program Files (x86)\$name.exe",
                    "C:\Windows\System32\$name.exe"
                )
                foreach ($path in $commonPaths) {
                    if (Test-Path $path) {
                        $iconPath = $path
                        break
                    }
                }
            }
        } catch {
            $iconPath = $null
        }

        [ordered]@{
            id = $_.PSChildName
            name = $name
            version = if ($_.DisplayVersion) { $_.DisplayVersion } else { "Unknown" }
            size = if ($_.EstimatedSize) { "$([math]::Round($_.EstimatedSize/1KB,2)) MB" } else { "N/A" }
            installed_on = if ($_.InstallDate) { $_.InstallDate.Insert(4,'-').Insert(7,'-') } else { "Unknown" }
            publisher = if ($publisher) { $publisher } else { "Unknown" }
            type = "desktop"
            category = $category
            is_bloatware = $isBloatware
            is_safe_to_remove = $isSafe
            uninstall_string = if ($_.UninstallString) { $_.UninstallString } else { $null }
            icon_path = if ($iconPath -and (Test-Path $iconPath)) { $iconPath } else { $null }
        }
    } | ConvertTo-Json -Depth 3
    "#;
    
    let output = crate::services::file_io::run_powershell(script, &[])
        .map_err(|e| e.to_string())?;
    
    let apps: Vec<App> = serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse apps: {}", e))?;
    
    Ok(apps)
}

#[command]
pub fn get_installed_store_apps() -> Result<Vec<App>, String> {
    let script = r#"
    $safeToRemove = @('Microsoft.3DBuilder', 'Microsoft.BingWeather', 'Microsoft.BingNews', 'Microsoft.GetHelp', 'Microsoft.Getstarted', 'Microsoft.Messaging', 'Microsoft.MicrosoftOfficeHub', 'Microsoft.MicrosoftSolitaireCollection', 'Microsoft.People', 'Microsoft.SkypeApp', 'Microsoft.Wallet', 'Microsoft.WindowsAlarms', 'Microsoft.WindowsCamera', 'microsoft.windowscommunicationsapps', 'Microsoft.WindowsMaps', 'Microsoft.WindowsPhone', 'Microsoft.WindowsSoundRecorder', 'Microsoft.XboxApp', 'Microsoft.XboxGameOverlay', 'Microsoft.XboxSpeechToTextOverlay', 'Microsoft.YourPhone', 'Microsoft.ZuneMusic', 'Microsoft.ZuneVideo')
    
    Get-AppxPackage -AllUsers |
    ForEach-Object {
        $name = $_.Name
        $publisher = $_.Publisher
        $isBloatware = $false
        $category = "Store App"
        $isSafe = $false
        
        if ($publisher -and $publisher -like "*Microsoft*") {
            $isBloatware = $true
            $category = "Microsoft Store"
        } elseif ($name -match "Adobe" -or $name -match "Office") {
            $category = "Productivity"
        } elseif ($name -match "Steam" -or $name -match "Epic" -or $name -match "Xbox") {
            $category = "Gaming"
        } else {
            $category = "Third Party Store"
        }
        
        if ($safeToRemove -contains $name) {
            $isSafe = $true
        }
        
        # Get store app icon path
        $iconPath = $null
        try {
            # Method 1: Check store app logo
            $packageLocation = $_.InstallLocation
            if ($packageLocation) {
                $logoPath = Join-Path $packageLocation "Assets\StoreLogo.png"
                if (Test-Path $logoPath) {
                    $iconPath = $logoPath
                } else {
                    # Try other common logo names
                    $logoNames = @("StoreLogo.png", "Logo.png", "icon.png", "AppIcon.png")
                    foreach ($logoName in $logoNames) {
                        $testPath = Join-Path $packageLocation "Assets\$logoName"
                        if (Test-Path $testPath) {
                            $iconPath = $testPath
                            break
                        }
                    }
                }
            }
            
            # Method 2: Check Windows app data locations
            if (-not $iconPath) {
                $appDataPath = "$env:LOCALAPPDATA\Packages\$($name)_*"
                $appFolders = Get-Item $appDataPath -ErrorAction SilentlyContinue
                if ($appFolders) {
                    $assetsPath = Join-Path $appFolders.FullName "Assets"
                    if (Test-Path $assetsPath) {
                        $iconFiles = Get-ChildItem -Path $assetsPath -Filter "*.png" -ErrorAction SilentlyContinue
                        if ($iconFiles) {
                            $iconPath = $iconFiles[0].FullName
                        }
                    }
                }
            }
        } catch {
            $iconPath = $null
        }

        [ordered]@{
            id = $_.Name
            name = $name
            version = if ($_.Version) { $_.Version } else { "Unknown" }
            size = "N/A"
            installed_on = "Unknown"
            publisher = if ($publisher) { $publisher } else { "Unknown" }
            type = "store"
            category = $category
            is_bloatware = $isBloatware
            is_safe_to_remove = $isSafe
            uninstall_string = $null
            icon_path = if ($iconPath -and (Test-Path $iconPath)) { $iconPath } else { $null }
        }
    } | ConvertTo-Json -Depth 3
    "#;
    
    let output = crate::services::file_io::run_powershell(script, &[])
        .map_err(|e| e.to_string())?;
    
    let apps: Vec<App> = serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse store apps: {}", e))?;
    
    Ok(apps)
}

#[command]
pub fn uninstall_apps(app_ids: Vec<String>) -> Result<DebloatResult, String> {
    let mut removed_count = 0;
    let mut failed_apps = Vec::new();
    
    for app_id in app_ids {
        // Try to uninstall as desktop app first
        let script = format!(
            r#"
            $removed = $false
            $error = $null
            
            # Try desktop app uninstall
            $app = Get-ItemProperty 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\{}' -ErrorAction SilentlyContinue
            if (-not $app) {{
                $app = Get-ItemProperty 'HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\{}' -ErrorAction SilentlyContinue
            }}
            
            if ($app -and $app.UninstallString) {{
                try {{
                    # Parse uninstall string and execute
                    $uninstallCmd = $app.UninstallString
                    if ($uninstallCmd -like 'MsiExec.exe*') {{
                        $uninstallCmd += " /quiet /norestart"
                    }} elseif ($uninstallCmd -like '*.exe*') {{
                        # Try to run with silent flags
                        $uninstallCmd = $uninstallCmd -replace '"', ''
                        $exePath = ($uninstallCmd -split ' ')[0]
                        $args = ($uninstallCmd -split ' ')[1..($uninstallCmd.Split(' ').Length-1)] -join ' '
                        if ($args -notmatch '/quiet|/S|/s') {{
                            $args += " /quiet"
                        }}
                        Start-Process $exePath -ArgumentList $args -Wait -NoNewWindow
                        $removed = $true
                    }} else {{
                        Start-Process $uninstallCmd -Wait -NoNewWindow
                        $removed = $true
                    }}
                }} catch {{
                    $error = $_.Exception.Message
                }}
            }}
            
            # Try Store app removal if desktop failed
            if (-not $removed) {{
                try {{
                    Get-AppxPackage -AllUsers | Where-Object {{ $_.Name -eq '{}' }} | Remove-AppxPackage -ErrorAction SilentlyContinue
                    $removed = $true
                }} catch {{
                    if (-not $error) {{ $error = $_.Exception.Message }}
                }}
            }}
            
            if ($removed) {{
                "success"
            }} elseif ($error) {{
                "error: $error"
            }} else {{
                "not_found"
            }}
            "#,
            app_id.replace("\\", "\\\\"),
            app_id.replace("\\", "\\\\"),
            app_id.replace("\\", "\\\\")
        );
        
        match crate::services::file_io::run_powershell(&script, &[]) {
            Ok(output) => {
                if output.contains("success") {
                    removed_count += 1;
                } else {
                    failed_apps.push(format!("{}: {}", app_id, output.trim()));
                }
            }
            Err(e) => {
                failed_apps.push(format!("{}: {}", app_id, e.to_string()));
            }
        }
    }
    
    let message = if failed_apps.is_empty() {
        format!("Successfully uninstalled {} applications", removed_count)
    } else {
        format!("Successfully uninstalled {} applications. Failed to remove: {}", 
                removed_count, failed_apps.join(", "))
    };
    
    Ok(DebloatResult {
        success: removed_count > 0,
        message,
        removed_count,
    })
}

#[command]
pub fn auto_debloat() -> Result<DebloatResult, String> {
    // Common Windows bloatware to remove
    let bloatware = vec![
        "Microsoft.3DBuilder",
        "Microsoft.BingWeather",
        "Microsoft.BingNews",
        "Microsoft.GetHelp",
        "Microsoft.Getstarted",
        "Microsoft.Messaging",
        "Microsoft.MicrosoftOfficeHub",
        "Microsoft.MicrosoftSolitaireCollection",
        "Microsoft.People",
        "Microsoft.SkypeApp",
        "Microsoft.Wallet",
        "Microsoft.WindowsAlarms",
        "Microsoft.WindowsCamera",
        "microsoft.windowscommunicationsapps",
        "Microsoft.WindowsMaps",
        "Microsoft.WindowsPhone",
        "Microsoft.WindowsSoundRecorder",
        "Microsoft.XboxApp",
        "Microsoft.XboxGameOverlay",
        "Microsoft.XboxSpeechToTextOverlay",
        "Microsoft.YourPhone",
        "Microsoft.ZuneMusic",
        "Microsoft.ZuneVideo",
    ];
    
    let mut removed_count = 0;
    
    for app in bloatware {
        let script = format!(r#"Get-AppxPackage -AllUsers '{}' | Remove-AppxPackage -ErrorAction SilentlyContinue"#, app);
        let _ = crate::services::file_io::run_powershell(&script, &[]);
        removed_count += 1;
    }
    
    Ok(DebloatResult {
        success: true,
        message: format!("Auto debloat completed. Removed {} bloatware items.", removed_count),
        removed_count,
    })
}

#[command]
pub fn get_bloatware_list() -> Result<Vec<App>, String> {
    get_installed_store_apps()
}

#[command]
pub fn remove_bloatware(items: Vec<String>) -> Result<DebloatResult, String> {
    uninstall_apps(items)
}

#[command]
pub fn scan_system_bloatware() -> Result<Vec<App>, String> {
    get_installed_store_apps()
}
