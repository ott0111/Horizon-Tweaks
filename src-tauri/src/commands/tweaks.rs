use crate::services::rollback_manager::RollbackManager;
use crate::ffi::core_engine::CoreEngine;
use serde::{Deserialize, Serialize};
use std::sync::Impulse;
use tauri::{command, State};
use tokio::sync::Mutex;

#[derive(Serialize, Deserialize, Clone)]
pub struct Tweak {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub risk: String,
    pub script: String,
    pub rollbackable: bool,
    pub requires_restart: bool,
}

fn get_rollback_script(id: &str) -> Option<String> {
    match id {
        "gt-disable-game-bar" => Some("Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\GameBar' -Name 'AllowAutoGameMode' -ErrorAction SilentlyContinue".into()),
        "gt-high-performance-power" => Some("powercfg -setactive 381b4222-f694-41f0-9685-ff5bb260df2e".into()),
        "gt-disable-background-apps" => Some("Get-ChildItem 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications' | Set-ItemProperty -Name 'Disabled' -Value 0".into()),
        "gt-enable-game-mode" => Some("Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\GameBar' -Name 'AutoGameModeEnabled' -ErrorAction SilentlyContinue".into()),
        "gt-disable-search-indexing" | "gt-disable-search-indexing-extra" => Some("Set-Service WSearch -StartupType Automatic; Start-Service WSearch -ErrorAction SilentlyContinue".into()),
        "gt-fixed-pagefile" => Some("wmic pagefileset where name='C:\\pagefile.sys' set InitialSize=0,MaximumSize=0".into()),
        "gt-limit-system-restore" => Some("vssadmin Resize ShadowStorage /For=C: /On=C: /MaxSize=Unbounded".into()),
        "gt-optimize-folder-views" => Some("Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name 'LaunchTo' -ErrorAction SilentlyContinue".into()),
        "gt-disable-hibernate" => Some("powercfg -h on".into()),
        "gt-reduce-icon-cache" => Some("Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name 'Max Cached Icons' -ErrorAction SilentlyContinue".into()),
        "gt-disable-aero-shake" => Some("Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name 'DisallowShaking' -ErrorAction SilentlyContinue".into()),
        "gt-disable-tablet-mode" => Some("Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name 'TabletMode' -ErrorAction SilentlyContinue".into()),
        "gt-disable-startup-apps" => Some("Write-Output 'Startup apps cannot be auto-restored. Use Rollback Manager.'".into()),
        "gt-disable-notifications" => Some("Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings' -Name 'NOC_GLOBAL_SETTING_TOASTS_ENABLED' -ErrorAction SilentlyContinue".into()),
        "gt-disable-delivery-optimization" => Some("Remove-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\DeliveryOptimization\\Settings' -Name 'DownloadMode' -ErrorAction SilentlyContinue".into()),
        "gt-disable-tips" => Some("Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager' -Name 'SoftLandingEnabled' -ErrorAction SilentlyContinue".into()),
        "gt-disable-bluetooth" => Some("Get-PnpDevice -Class Bluetooth | Enable-PnpDevice -Confirm:$false".into()),
        "gt-disable-onedrive" | "gt-disable-onedrive-extra" => Some("Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name 'OneDrive' -ErrorAction SilentlyContinue; Remove-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\OneDrive' -Name 'DisableFileSyncNGSC' -ErrorAction SilentlyContinue".into()),
        "gt-disable-news-interests" => Some("Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Feeds' -Name 'ShellFeedsTaskbarViewMode' -ErrorAction SilentlyContinue".into()),
        "gt-disable-sticky-keys" | "gt-disable-sticky-keys-extra" => Some("Set-ItemProperty -Path 'HKCU:\\Control Panel\\Accessibility\\StickyKeys' -Name 'Flags' -Value 510".into()),
        "gt-enable-storage-sense" => Some("Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy' -Name '01' -Value 0".into()),
        "gt-disable-sound-schemes" => Some("Remove-ItemProperty -Path 'HKCU:\\AppEvents\\Schemes' -Name '(Default)' -ErrorAction SilentlyContinue".into()),
        "gt-turn-off-autoplay" => Some("Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\AutoplayHandlers' -Name 'DisableAutoplay' -ErrorAction SilentlyContinue".into()),
        "gt-adjust-mouse-sensitivity" => Some("Set-ItemProperty -Path 'HKCU:\\Control Panel\\Mouse' -Name 'MouseSpeed' -Value 1; Set-ItemProperty -Path 'HKCU:\\Control Panel\\Mouse' -Name 'MouseThreshold1' -Value 6; Set-ItemProperty -Path 'HKCU:\\Control Panel\\Mouse' -Name 'MouseThreshold2' -Value 10".into()),
        "gt-disable-print-spooler" => Some("Set-Service Spooler -StartupType Automatic; Start-Service Spooler -ErrorAction SilentlyContinue".into()),
        "gt-disable-auto-update-apps" => Some("Remove-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\WindowsUpdate\\UX\\Settings' -Name 'BranchReadinessLevel' -ErrorAction SilentlyContinue".into()),
        "gt-disable-feedback" => Some("Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Siuf\\Rules' -Name 'NumberOfSIUFInPeriod' -ErrorAction SilentlyContinue".into()),
        "gt-remove-windows-features" => Some("Enable-WindowsOptionalFeature -Online -FeatureName Internet-Explorer-optional-amd64 -NoRestart".into()),
        "gt-turn-off-offline-maps" => Some("Remove-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GeoLocation\\OfflineMaps' -Name 'AutoDownload' -ErrorAction SilentlyContinue".into()),
        "gt-disable-startup-sound" => Some("Remove-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Authentication\\LogonUI\\BootSwitch' -Name 'BootSound' -ErrorAction SilentlyContinue".into()),
        "gt-disable-shared-experiences" => Some("Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\CDP' -Name 'RomeSdkChannelUserAuthzPolicy' -ErrorAction SilentlyContinue".into()),
        "gt-disable-transparency" => Some("Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' -Name 'EnableTransparency' -Value 1".into()),
        "gt-disable-hardware-acceleration" => Some("Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Internet Explorer\\Main' -Name 'UseSWRender' -ErrorAction SilentlyContinue".into()),
        "gt-turn-off-animations" => Some("Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects' -Name 'VisualFXSetting' -ErrorAction SilentlyContinue".into()),
        "gt-turn-off-location" => Some("Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location' -Name 'Value' -Value 'Allow'".into()),
        "gt-disable-cortana" | "gt-disable-cortana-extra" => Some("Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Search' -Name 'CortanaConsent' -ErrorAction SilentlyContinue; Remove-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search' -Name 'AllowCortana' -ErrorAction SilentlyContinue".into()),
        "gt-disable-remote-assistance" => Some("Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Remote Assistance' -Name 'fAllowToGetHelp' -Value 1".into()),
        "gt-set-privacy-basic" | "gt-disable-telemetry" => Some("Remove-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Name 'AllowTelemetry' -ErrorAction SilentlyContinue".into()),
        "gt-disable-find-my-device" => Some("Remove-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\FindMyDevice' -Name 'LocationEnabled' -ErrorAction SilentlyContinue".into()),
        "gt-disable-uac" => Some("Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System' -Name 'EnableLUA' -Value 1".into()),
        "gt-disable-tailored-experiences" => Some("Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Privacy' -Name 'TailoredExperiencesDiagnosticData' -ErrorAction SilentlyContinue".into()),
        "gt-disable-advertising-id" => Some("Remove-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo' -Name 'Enabled' -ErrorAction SilentlyContinue".into()),
        "gt-disable-camera-access" => Some("Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam' -Name 'Value' -Value 'Allow'".into()),
        "gt-disable-microphone-access" => Some("Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone' -Name 'Value' -Value 'Allow'".into()),
        "gt-disable-sync-settings" => Some("Remove-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\SettingSync' -Name 'DisableSettingSync' -ErrorAction SilentlyContinue".into()),
        "gt-disable-core-parking" => Some("powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR CPMINCORES 0; powercfg -setactive SCHEME_CURRENT".into()),
        "gt-cpu-priority-boost" => Some("Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile' -Name 'SystemResponsiveness' -Value 10".into()),
        "gt-cpu-thread-optimize" => Some("Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Name 'Win32PrioritySeparation' -Value 2".into()),
        "gt-cpu-thermal-control" => Some("Remove-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerSettings\\54533251-82be-4824-96c1-47b60b740d00\\be337238-0d82-4146-a960-4f3749d470c7' -Name 'ValueMax' -ErrorAction SilentlyContinue".into()),
        "gt-disable-background-apps-extra" => Some("Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications' -Name 'GlobalUserDisabled' -ErrorAction SilentlyContinue".into()),
        "gt-disable-startup-delay" => Some("Remove-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize' -Name 'StartupDelayInMSec' -ErrorAction SilentlyContinue".into()),
        "gt-disable-xbox-gamebar" => Some("Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR' -Name 'AppCaptureEnabled' -ErrorAction SilentlyContinue".into()),
        "gt-disable-xbox-gamemode" => Some("Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR' -Name 'GameDVR_Enabled' -ErrorAction SilentlyContinue".into()),
        "gt-enable-compact-os" => Some("Compact.exe /CompactOS:never".into()),
        "gt-disable-notification-center" => Some("Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings' -Name 'NOC_GLOBAL_SETTING_ALLOW_TOASTS_ABOVE_LOCK' -ErrorAction SilentlyContinue".into()),
        "gt-disable-lock-screen" => Some("Remove-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Personalization' -Name 'NoLockScreen' -ErrorAction SilentlyContinue".into()),
        "gt-enable-hw-gpu-sched" => Some("Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers' -Name 'HwSchMode' -Value 1".into()),
        "gt-disable-menu-animations" => Some("Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name 'MenuShowDelay' -Value 400".into()),
        "gt-disable-animations" => Some("Remove-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name 'UserPreferencesMask' -ErrorAction SilentlyContinue".into()),
        "gt-disable-thumbnail-cache" => Some("Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer' -Name 'DisableThumbnails' -ErrorAction SilentlyContinue".into()),
        "gt-disable-windows-tips" => Some("Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager' -Name 'SubscribedContent-338388Enabled' -ErrorAction SilentlyContinue".into()),
        "gt-disable-pointer-precision" => Some("Set-ItemProperty -Path 'HKCU:\\Control Panel\\Mouse' -Name 'MouseSpeed' -Value 1".into()),
        "gt-increase-icon-cache" => Some("Remove-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer' -Name 'Max Cached Icons' -ErrorAction SilentlyContinue".into()),
        "gt-cpu-set-ht-off" => Some("Remove-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Executive' -Name 'MaximumNumberOfCores' -ErrorAction SilentlyContinue".into()),
        "gt-cpu-boost-mode" => Some("powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR PERFINCPOL 0; powercfg -setdcvalueindex SCHEME_CURRENT SUB_PROCESSOR PERFINCPOL 0; powercfg -setactive SCHEME_CURRENT".into()),
        "gt-cpu-disable-cstates" => Some("powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR IDLEDISABLE 0; powercfg -setactive SCHEME_CURRENT".into()),
        "gt-cpu-set-affinity" => Some("Remove-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Executive' -Name 'ProcessorAffinityMask' -ErrorAction SilentlyContinue".into()),
        "gt-disable-set-default-apps" => Some("Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\.html\\UserChoice' -Name 'ProgId' -ErrorAction SilentlyContinue".into()),
        _ => None,
    }
}

#[command]
pub fn get_tweak_catalog() -> Vec<Tweak> {
    vec![
        // PERFORMANCE (13 tweaks)
        Tweak {
            id: "gt-disable-startup-apps".to_string(),
            name: "Disable Startup Apps".to_string(),
            description: "Prevent unnecessary programs from launching at boot.".to_string(),
            category: "Performance".to_string(),
            risk: "Low".to_string(),
            script: "Get-StartupApps | ForEach-Object { Disable-StartupApp $_.Name }".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-game-bar".to_string(),
            name: "Disable Game Bar".to_string(),
            description: "Stops background recording services.".to_string(),
            category: "Performance".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\GameBar' -Name 'AllowAutoGameMode' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-high-performance-power".to_string(),
            name: "Set Power Plan to High Performance".to_string(),
            description: "Prioritizes speed over energy saving.".to_string(),
            category: "Performance".to_string(),
            risk: "Low".to_string(),
            script: "powercfg -setactive 8c5e7fda-e8bf-45a6-a6cc-4b3c3f300d00".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-background-apps".to_string(),
            name: "Disable Background Apps".to_string(),
            description: "Stops apps from running when not in use.".to_string(),
            category: "Performance".to_string(),
            risk: "Low".to_string(),
            script: "Get-ChildItem 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications' | Set-ItemProperty -Name 'Disabled' -Value 1".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-enable-game-mode".to_string(),
            name: "Enable Game Mode".to_string(),
            description: "Optimizes system resources for active gaming.".to_string(),
            category: "Performance".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\GameBar' -Name 'AutoGameModeEnabled' -Value 1".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-search-indexing".to_string(),
            name: "Disable Search Indexing (on SSDs)".to_string(),
            description: "Reduces background disk activity.".to_string(),
            category: "Performance".to_string(),
            risk: "Low".to_string(),
            script: "Set-Service WSearch -StartupType Disabled; Stop-Service WSearch -Force".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-fixed-pagefile".to_string(),
            name: "Set Virtual Memory to Fixed Size".to_string(),
            description: "Prevents fragmentation.".to_string(),
            category: "Performance".to_string(),
            risk: "Medium".to_string(),
            script: "wmic pagefileset where name='C:\\pagefile.sys' set InitialSize=4096,MaximumSize=4096".to_string(),
            rollbackable: true,
            requires_restart: true,
        },
        Tweak {
            id: "gt-limit-system-restore".to_string(),
            name: "Limit System Restore Space".to_string(),
            description: "Prevents the OS from eating too much HDD space.".to_string(),
            category: "Performance".to_string(),
            risk: "Medium".to_string(),
            script: "vssadmin Resize ShadowStorage /For=C: /On=C: /MaxSize=5GB".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-optimize-folder-views".to_string(),
            name: "Optimize Folder Views".to_string(),
            description: "Sets all folders to General Items for faster loading.".to_string(),
            category: "Performance".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name 'LaunchTo' -Value 1".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-hibernate".to_string(),
            name: "Disable Hibernate".to_string(),
            description: "Deletes hiberfil.sys to save disk space.".to_string(),
            category: "Performance".to_string(),
            risk: "Low".to_string(),
            script: "powercfg -h off".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-reduce-icon-cache".to_string(),
            name: "Reduce Icon Cache Size".to_string(),
            description: "Speeds up Desktop and Explorer loading.".to_string(),
            category: "Performance".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name 'Max Cached Icons' -Value 500".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-aero-shake".to_string(),
            name: "Disable Aero Shake".to_string(),
            description: "Stops windows from minimizing when moved quickly.".to_string(),
            category: "Performance".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name 'DisallowShaking' -Value 1".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-tablet-mode".to_string(),
            name: "Disable Tablet Mode".to_string(),
            description: "Keeps the UI in desktop-only mode.".to_string(),
            category: "Performance".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name 'TabletMode' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        // SYSTEM (20 tweaks)
        Tweak {
            id: "gt-clear-temp-files".to_string(),
            name: "Clear Temporary Files".to_string(),
            description: "Deletes %TEMP% and Prefetch folders.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Remove-Item $env:TEMP\\* -Recurse -Force; Remove-Item C:\\Windows\\Prefetch\\* -Recurse -Force".to_string(),
            rollbackable: false,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-notifications".to_string(),
            name: "Disable Notifications & Focus Assist".to_string(),
            description: "Reduces background polling.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings' -Name 'NOC_GLOBAL_SETTING_TOASTS_ENABLED' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-delivery-optimization".to_string(),
            name: "Disable Delivery Optimization".to_string(),
            description: "Stops Windows from sharing updates with other PCs.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\DeliveryOptimization\\Settings' -Name 'DownloadMode' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-optimize-drives".to_string(),
            name: "Optimize Drives (Defrag/Trim)".to_string(),
            description: "Ensures storage is running at peak speed.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Optimize-Volume -DriveLetter C -Defrag -Verbose".to_string(),
            rollbackable: false,
            requires_restart: false,
        },
        Tweak {
            id: "gt-clean-recycle-bin".to_string(),
            name: "Clean Recycle Bin".to_string(),
            description: "Automated empty on a schedule.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Clear-RecycleBin -Force".to_string(),
            rollbackable: false,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-tips".to_string(),
            name: "Disable Tips and Suggestions".to_string(),
            description: "Removes background UI monitoring.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager' -Name 'SoftLandingEnabled' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-bluetooth".to_string(),
            name: "Disable Bluetooth".to_string(),
            description: "Stops radio polling.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Get-PnpDevice -Class Bluetooth | Disable-PnpDevice -Confirm:$false".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-onedrive".to_string(),
            name: "Disable OneDrive Sync".to_string(),
            description: "Frees up network and CPU.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name 'OneDrive' -Value ''".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-update-drivers".to_string(),
            name: "Update Windows Drivers".to_string(),
            description: "Automated check for outdated components.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Get-WindowsDriver -Online | Where-Object { $_.Version -lt (Get-WindowsDriver -Online | Select-Object -First 1).Version }".to_string(),
            rollbackable: false,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-news-interests".to_string(),
            name: "Disable News and Interests on Taskbar".to_string(),
            description: "Removes a web-rendered widget.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Feeds' -Name 'ShellFeedsTaskbarViewMode' -Value 2".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-clear-browser-cache".to_string(),
            name: "Clear Browser Cache".to_string(),
            description: "Removes junk from Chrome/Edge/Firefox.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Get-ChildItem $env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Cache | Remove-Item -Recurse -Force".to_string(),
            rollbackable: false,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-sticky-keys".to_string(),
            name: "Disable Sticky Keys".to_string(),
            description: "Avoids accidental pop-ups during gaming.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Control Panel\\Accessibility\\StickyKeys' -Name 'Flags' -Value 506".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-enable-storage-sense".to_string(),
            name: "Enable Storage Sense".to_string(),
            description: "Automatically cleans up system junk.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy' -Name '01' -Value 1".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-sound-schemes".to_string(),
            name: "Disable Windows Sound Schemes".to_string(),
            description: "Minor reduction in audio driver load.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\AppEvents\\Schemes' -Name '(Default)' -Value '.None'".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-turn-off-autoplay".to_string(),
            name: "Turn Off Auto-Play".to_string(),
            description: "Prevents scanning of inserted media.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\AutoplayHandlers' -Name 'DisableAutoplay' -Value 1".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-adjust-mouse-sensitivity".to_string(),
            name: "Adjust Mouse Sensitivity (Raw Input)".to_string(),
            description: "Disables Enhance Pointer Precision.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Control Panel\\Mouse' -Name 'MouseSpeed' -Value 0; Set-ItemProperty -Path 'HKCU:\\Control Panel\\Mouse' -Name 'MouseThreshold1' -Value 0; Set-ItemProperty -Path 'HKCU:\\Control Panel\\Mouse' -Name 'MouseThreshold2' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-print-spooler".to_string(),
            name: "Disable Print Spooler".to_string(),
            description: "Stops a constant background service.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Set-Service Spooler -StartupType Disabled; Stop-Service Spooler -Force".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-auto-update-apps".to_string(),
            name: "Turn Off Auto-Update for Apps".to_string(),
            description: "Manual control over Microsoft Store updates.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\WindowsUpdate\\UX\\Settings' -Name 'BranchReadinessLevel' -Value 32".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-feedback".to_string(),
            name: "Disable Feedback Frequency".to_string(),
            description: "Stops How are we doing? prompts.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Siuf\\Rules' -Name 'NumberOfSIUFInPeriod' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-remove-windows-features".to_string(),
            name: "Remove Unused Windows Features".to_string(),
            description: "Removes Internet Explorer, Legacy Components.".to_string(),
            category: "System".to_string(),
            risk: "Medium".to_string(),
            script: "Disable-WindowsOptionalFeature -Online -FeatureName Internet-Explorer-optional-amd64 -NoRestart".to_string(),
            rollbackable: true,
            requires_restart: true,
        },
        Tweak {
            id: "gt-clear-dns-cache".to_string(),
            name: "Clear DNS Cache".to_string(),
            description: "Refreshes internet connectivity.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Clear-DnsClientCache".to_string(),
            rollbackable: false,
            requires_restart: false,
        },
        Tweak {
            id: "gt-turn-off-offline-maps".to_string(),
            name: "Turn Off Offline Maps".to_string(),
            description: "Stops background map data syncing.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GeoLocation\\OfflineMaps' -Name 'AutoDownload' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-set-default-apps".to_string(),
            name: "Set Default Apps".to_string(),
            description: "Removes Open with confusion.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\.html\\UserChoice' -Name 'ProgId' -Value 'ChromeHTML'".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-startup-sound".to_string(),
            name: "Disable Startup Sound".to_string(),
            description: "Slight speed up for the login screen.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Authentication\\LogonUI\\BootSwitch' -Name 'BootSound' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-shared-experiences".to_string(),
            name: "Turn Off Shared Experiences".to_string(),
            description: "Prevents cross-device syncing.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\CDP' -Name 'RomeSdkChannelUserAuthzPolicy' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        // GRAPHICS (4 tweaks)
        Tweak {
            id: "gt-disable-transparency".to_string(),
            name: "Turn Off Transparency Effects".to_string(),
            description: "Reduces GPU load by making windows opaque.".to_string(),
            category: "Graphics".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' -Name 'EnableTransparency' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-hardware-acceleration".to_string(),
            name: "Disable Hardware Acceleration in Browsers".to_string(),
            description: "Frees up GPU for other tasks.".to_string(),
            category: "Graphics".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Internet Explorer\\Main' -Name 'UseSWRender' -Value 1".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-turn-off-animations".to_string(),
            name: "Turn Off Animation Effects".to_string(),
            description: "Makes the UI feel snappier.".to_string(),
            category: "Graphics".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects' -Name 'VisualFXSetting' -Value 3".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-adjust-refresh-rate".to_string(),
            name: "Adjust Display Refresh Rate".to_string(),
            description: "Ensures the monitor is at its max Hz.".to_string(),
            category: "Graphics".to_string(),
            risk: "Low".to_string(),
            script: "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen.BitsPerPixel".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        // SECURITY (13 tweaks)
        Tweak {
            id: "gt-turn-off-location".to_string(),
            name: "Turn Off Location Services".to_string(),
            description: "Reduces background tracking.".to_string(),
            category: "Security".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location' -Name 'Value' -Value 'Deny'".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-cortana".to_string(),
            name: "Disable Cortana".to_string(),
            description: "Stops the digital assistant process.".to_string(),
            category: "Security".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Search' -Name 'CortanaConsent' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-remote-assistance".to_string(),
            name: "Disable Remote Assistance".to_string(),
            description: "Closes unused connection ports.".to_string(),
            category: "Security".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Remote Assistance' -Name 'fAllowToGetHelp' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-set-privacy-basic".to_string(),
            name: "Set Windows Privacy to Basic".to_string(),
            description: "Reduces telemetry data sending.".to_string(),
            category: "Security".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Name 'AllowTelemetry' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-find-my-device".to_string(),
            name: "Disable Find My Device".to_string(),
            description: "Saves background battery and data.".to_string(),
            category: "Security".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\FindMyDevice' -Name 'LocationEnabled' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-uac".to_string(),
            name: "Disable User Account Control (UAC) Sliders".to_string(),
            description: "Reduces Yes/No pop-ups.".to_string(),
            category: "Security".to_string(),
            risk: "Medium".to_string(),
            script: "Set-ItemProperty -Path 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System' -Name 'EnableLUA' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: true,
        },
        Tweak {
            id: "gt-disable-telemetry".to_string(),
            name: "Disable Telemetry".to_string(),
            description: "Basic level blocking of user data reports.".to_string(),
            category: "Security".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Name 'AllowTelemetry' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-tailored-experiences".to_string(),
            name: "Disable Tailored Experiences".to_string(),
            description: "Blocks personalized ad tracking.".to_string(),
            category: "Security".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Privacy' -Name 'TailoredExperiencesDiagnosticData' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-advertising-id".to_string(),
            name: "Disable Advertising ID".to_string(),
            description: "Prevents apps from using your advertising ID.".to_string(),
            category: "Security".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo' -Name 'Enabled' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-camera-access".to_string(),
            name: "Disable Camera Access".to_string(),
            description: "Prevents apps from accessing camera without permission.".to_string(),
            category: "Security".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam' -Name 'Value' -Value 'Deny'".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-microphone-access".to_string(),
            name: "Disable Microphone Access".to_string(),
            description: "Prevents apps from accessing microphone without permission.".to_string(),
            category: "Security".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone' -Name 'Value' -Value 'Deny'".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-sync-settings".to_string(),
            name: "Disable Sync Settings".to_string(),
            description: "Prevents Windows from syncing settings across devices.".to_string(),
            category: "Security".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\SettingSync' -Name 'DisableSettingSync' -Value 2".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        // CPU (4 tweaks)
        Tweak {
            id: "gt-disable-core-parking".to_string(),
            name: "Disable CPU Core Parking".to_string(),
            description: "Keeps all CPU cores active and ready, reducing latency.".to_string(),
            category: "CPU".to_string(),
            risk: "Medium".to_string(),
            script: "powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR CPMINCORES 100; powercfg -setactive SCHEME_CURRENT".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-cpu-priority-boost".to_string(),
            name: "CPU Priority Boost".to_string(),
            description: "Gives foreground apps higher CPU priority for snappier response.".to_string(),
            category: "CPU".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile' -Name 'SystemResponsiveness' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-cpu-thread-optimize".to_string(),
            name: "Optimize CPU Thread Scheduling".to_string(),
            description: "Improves thread distribution across CPU cores for games.".to_string(),
            category: "CPU".to_string(),
            risk: "Medium".to_string(),
            script: "Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Name 'Win32PrioritySeparation' -Value 38".to_string(),
            rollbackable: true,
            requires_restart: true,
        },
        Tweak {
            id: "gt-cpu-thermal-control".to_string(),
            name: "CPU Thermal Throttle Control".to_string(),
            description: "Raises thermal throttle limits to sustain boost clocks longer.".to_string(),
            category: "CPU".to_string(),
            risk: "High".to_string(),
            script: "Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerSettings\\54533251-82be-4824-96c1-47b60b740d00\\be337238-0d82-4146-a960-4f3749d470c7' -Name 'ValueMax' -Value 100".to_string(),
            rollbackable: true,
            requires_restart: true,
        },
        // Extra Performance tweaks (+4, reaching ~22 total in Performance)
        Tweak {
            id: "gt-disable-search-indexing-extra".to_string(),
            name: "Disable Search Indexing (extra)".to_string(),
            description: "Stops Windows Search indexing to reduce background HDD/CPU load.".to_string(),
            category: "Performance".to_string(),
            risk: "Low".to_string(),
            script: "Stop-Service WSearch -Force; Set-Service WSearch -StartupType Disabled".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-cortana-extra".to_string(),
            name: "Disable Cortana (registry)".to_string(),
            description: "Disables Cortana assistant to reduce memory and CPU usage.".to_string(),
            category: "Performance".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search' -Name 'AllowCortana' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-background-apps-extra".to_string(),
            name: "Disable Background Apps (global)".to_string(),
            description: "Stops all modern apps from running in the background.".to_string(),
            category: "Performance".to_string(),
            risk: "Medium".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications' -Name 'GlobalUserDisabled' -Value 1".to_string(),
            rollbackable: true,
            requires_restart: true,
        },
        Tweak {
            id: "gt-disable-startup-delay".to_string(),
            name: "Disable Startup Delay".to_string(),
            description: "Removes the startup app delay for faster boot.".to_string(),
            category: "Performance".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize' -Name 'StartupDelayInMSec' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: true,
        },
        // Extra System tweaks (+6, reaching ~31 total in System)
        Tweak {
            id: "gt-disable-onedrive-extra".to_string(),
            name: "Disable OneDrive (policy)".to_string(),
            description: "Disables OneDrive file sync which can cause disk I/O.".to_string(),
            category: "System".to_string(),
            risk: "Medium".to_string(),
            script: "Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\OneDrive' -Name 'DisableFileSyncNGSC' -Value 1; Stop-Process -Name OneDrive -Force -ErrorAction SilentlyContinue".to_string(),
            rollbackable: true,
            requires_restart: true,
        },
        Tweak {
            id: "gt-disable-xbox-gamebar".to_string(),
            name: "Disable Xbox Game Bar".to_string(),
            description: "Disables Xbox Game Bar overlay and DVR recording.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR' -Name 'AppCaptureEnabled' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-xbox-gamemode".to_string(),
            name: "Disable Xbox Game Mode".to_string(),
            description: "Turns off Windows Game Mode to reduce background scheduling.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR' -Name 'GameDVR_Enabled' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-enable-compact-os".to_string(),
            name: "Enable Compact OS".to_string(),
            description: "Compresses system files to save disk space (WIMBoot style).".to_string(),
            category: "System".to_string(),
            risk: "Medium".to_string(),
            script: "Compact.exe /CompactOS:always".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-notification-center".to_string(),
            name: "Disable Notification Center".to_string(),
            description: "Disables action center notifications and toasts.".to_string(),
            category: "System".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings' -Name 'NOC_GLOBAL_SETTING_ALLOW_TOASTS_ABOVE_LOCK' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-lock-screen".to_string(),
            name: "Disable Lock Screen".to_string(),
            description: "Skips the lock screen on boot for faster login.".to_string(),
            category: "System".to_string(),
            risk: "Medium".to_string(),
            script: "Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Personalization' -Name 'NoLockScreen' -Value 1".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        // Extra Graphics tweaks (+4, reaching ~8 total in Graphics)
        Tweak {
            id: "gt-enable-hw-gpu-sched".to_string(),
            name: "Enable GPU Hardware Scheduling".to_string(),
            description: "Offloads CPU scheduling work to the GPU scheduler.".to_string(),
            category: "Graphics".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers' -Name 'HwSchMode' -Value 2".to_string(),
            rollbackable: true,
            requires_restart: true,
        },
        Tweak {
            id: "gt-disable-menu-animations".to_string(),
            name: "Disable Menu Animations".to_string(),
            description: "Disables fade/slide animations for instant UI response.".to_string(),
            category: "Graphics".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name 'MenuShowDelay' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-animations".to_string(),
            name: "Disable All Animations".to_string(),
            description: "Disables minimize/maximize animations and visual effects.".to_string(),
            category: "Graphics".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name 'UserPreferencesMask' -Value ([byte[]](0x90,0x12,0x03,0x80,0x10,0x00,0x00,0x00))".to_string(),
            rollbackable: true,
            requires_restart: true,
        },
        Tweak {
            id: "gt-disable-thumbnail-cache".to_string(),
            name: "Disable Thumbnail Cache".to_string(),
            description: "Disables thumbnail caching to reduce disk activity.".to_string(),
            category: "Graphics".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer' -Name 'DisableThumbnails' -Value 1".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        // Extra Security tweaks (+4, reaching ~16 total in Security)
        Tweak {
            id: "gt-disable-windows-tips".to_string(),
            name: "Disable Windows Tips".to_string(),
            description: "Stops Windows tips and suggestions notifications.".to_string(),
            category: "Security".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager' -Name 'SubscribedContent-338388Enabled' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-sticky-keys-extra".to_string(),
            name: "Disable Sticky Keys Prompt (registry)".to_string(),
            description: "Disables the annoying sticky/shortcut key prompts.".to_string(),
            category: "Security".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Control Panel\\Accessibility\\StickyKeys' -Name 'Flags' -Value 506".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-disable-pointer-precision".to_string(),
            name: "Disable Pointer Precision".to_string(),
            description: "Disables mouse acceleration for consistent pointer movement.".to_string(),
            category: "Security".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKCU:\\Control Panel\\Mouse' -Name 'MouseSpeed' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-increase-icon-cache".to_string(),
            name: "Increase Icon Cache Size".to_string(),
            description: "Increases icon cache size to prevent icon redraws.".to_string(),
            category: "Security".to_string(),
            risk: "Low".to_string(),
            script: "Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer' -Name 'Max Cached Icons' -Value 8192".to_string(),
            rollbackable: true,
            requires_restart: true,
        },
        // Extra CPU tweaks (+4, reaching ~8 total in CPU)
        Tweak {
            id: "gt-cpu-set-ht-off".to_string(),
            name: "Disable Hyper-Threading (via scheduler)".to_string(),
            description: "Tells Windows scheduler to prefer physical cores for gaming.".to_string(),
            category: "CPU".to_string(),
            risk: "High".to_string(),
            script: "Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Executive' -Name 'MaximumNumberOfCores' -Value ($(Get-CimInstance Win32_Processor).NumberOfCores)".to_string(),
            rollbackable: true,
            requires_restart: true,
        },
        Tweak {
            id: "gt-cpu-boost-mode".to_string(),
            name: "Enable CPU Boost Mode".to_string(),
            description: "Sets processor performance boost mode to aggressive.".to_string(),
            category: "CPU".to_string(),
            risk: "High".to_string(),
            script: "powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR PERFINCPOL 2; powercfg -setdcvalueindex SCHEME_CURRENT SUB_PROCESSOR PERFINCPOL 2; powercfg -setactive SCHEME_CURRENT".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-cpu-disable-cstates".to_string(),
            name: "Disable CPU C-States".to_string(),
            description: "Prevents CPU from entering idle states for lower latency.".to_string(),
            category: "CPU".to_string(),
            risk: "High".to_string(),
            script: "powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR IDLEDISABLE 1; powercfg -setactive SCHEME_CURRENT".to_string(),
            rollbackable: true,
            requires_restart: false,
        },
        Tweak {
            id: "gt-cpu-set-affinity".to_string(),
            name: "CPU Affinity Optimization".to_string(),
            description: "Optimizes processor affinity for multi-threaded game performance.".to_string(),
            category: "CPU".to_string(),
            risk: "Medium".to_string(),
            script: "Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Executive' -Name 'ProcessorAffinityMask' -Value 0".to_string(),
            rollbackable: true,
            requires_restart: true,
        },
    ]
}

#[command]
pub async fn apply_tweak(
    id: String,
    rollback: State<'_, Impulse<Mutex<RollbackManager>>>,
) -> Result<String, String> {
    let tweaks = get_tweak_catalog();
    let tweak = tweaks.into_iter().find(|t| t.id == id).ok_or("Tweak not found")?;

    let mut mgr = rollback.lock().await;
    let snapshot = if tweak.rollbackable { mgr.create_snapshot(&id).ok() } else { None };

    // If the tweak is rollbackable, also save registry state to the UI-visible snapshots location
    if tweak.rollbackable {
        let date = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let snapshot_ps = format!(r#"
            $id = "{id}"
            $name = "{name}"
            $desc = "Pre-tweak backup for: {name}"
            $date = "{date}"
            $backupPath = "$env:USERPROFILE\Horizon Tweaks Optimization\Snapshots\$id"
            New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
            
            # Export key registry paths
            $regKeys = @(
                "HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
                "HKCU\Software\Microsoft\Windows\CurrentVersion\RunOnce",
                "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
                "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce",
                "HKCU\Control Panel\Desktop",
                "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
            )
            $exported = 0
            foreach ($key in $regKeys) {{
                try {{
                    $safeName = ($key -split '\\')[-1] -replace '[^a-zA-Z0-9]','_'
                    $regCmd = "reg export `"$key`" `"$backupPath\$safeName.reg`" /y 2>`$null"
                    Invoke-Expression $regCmd 2>$null | Out-Null
                    if (Test-Path "$backupPath\$safeName.reg") {{ $exported++ }}
                }} catch {{ }}
            }}

            # Write metadata so the RollbackPanel UI picks it up
            $metadata = @{{
                id = "$id"
                name = "$name"
                description = "$desc"
                date = "$date"
                status = "Available"
                type = "Tweak Snapshot"
            }}
            $metadata | ConvertTo-Json -Depth 4 | Out-File "$backupPath\metadata.json" -Force
        "#, id = id, name = tweak.name, date = date);
        let _ = crate::services::file_io::run_powershell(&snapshot_ps, &[]);
    }

    let engine = CoreEngine::new().ok();

    let ok = match id.as_str() {
        id if id.starts_with("net-") => {
            if let Some(ref eng) = engine { eng.apply_network_tweaks() } else { return Err("CoreEngine not available for network tweaks.".into()); }
        }
        id if id.starts_with("mem-") => {
            if let Some(ref eng) = engine { eng.apply_memory_tweaks() } else { return Err("CoreEngine not available for memory tweaks.".into()); }
        }
        id if id.starts_with("kernel-") => {
            if let Some(ref eng) = engine { eng.apply_kernel_tweaks() } else { return Err("CoreEngine not available for kernel tweaks.".into()); }
        }
        _ => {
            crate::services::file_io::run_powershell(&tweak.script, &[])
                .map(|_| true)
                .map_err(|e| e.to_string())?
        }
    };

    if ok {
        if let Some(snap) = snapshot {
            let _ = mgr.register_applied(&id, snap);
        }
        Ok(format!("Tweak {} applied successfully.", tweak.name))
    } else {
        Err(format!("Failed to apply tweak {}.", tweak.name))
    }
}


#[command]
pub async fn rollback_tweak(
    id: String,
    rollback: State<'_, Impulse<Mutex<RollbackManager>>>,
) -> Result<String, String> {
    let tweaks = get_tweak_catalog();
    let tweak = tweaks.into_iter().find(|t| t.id == id).ok_or("Tweak not found")?;
    
    if !tweak.rollbackable {
        return Err("This tweak does not support rollback.".into());
    }
    
    let rb_script = get_rollback_script(&id);
    
    if let Some(script) = rb_script {
        crate::services::file_io::run_powershell(&script, &[])
            .map_err(|e| format!("Rollback failed for '{}': {}", tweak.name, e))?;
        let mut mgr = rollback.lock().await;
        let _ = mgr.delete(&id);
        Ok(format!("Tweak '{}' has been successfully reverted.", tweak.name))
    } else {
        Err(format!("No rollback script available for '{}'. Use the Rollback Manager for a full system restore.", tweak.name))
    }
}

#[command]
pub async fn get_applied_tweaks(
    rollback: State<'_, Impulse<Mutex<RollbackManager>>>,
) -> Result<Vec<String>, String> {
    let mgr = rollback.lock().await;
    let snapshots = mgr.list_snapshots().map_err(|e| e.to_string())?;
    Ok(snapshots.into_iter().map(|s| {
        let parts: Vec<&str> = s.split(" | ").collect();
        if parts.len() >= 2 { parts[1].to_string() } else { s }
    }).collect())
}

#[command]
pub fn reset_all_tweaks() -> Result<String, String> {
    let script = r#"
# Revert common performance tweaks to defaults
$errors = @()
try { Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl' -Name 'Win32PrioritySeparation' -Value 2 -Type DWord -ErrorAction SilentlyContinue } catch { $errors += 'PrioritySeparation' }
try { Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' -Name 'SystemResponsiveness' -Value 10 -Type DWord -ErrorAction SilentlyContinue } catch {}
try { Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces' -Name 'TcpAckFrequency' -Value 2 -Type DWord -ErrorAction SilentlyContinue -ErrorVariable ev 2>$null } catch {}
try { Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters' -Name 'Tcp1323Opts' -Value 1 -Type DWord -ErrorAction SilentlyContinue } catch {}
try { Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' -Name 'LargeSystemCache' -Value 0 -Type DWord -ErrorAction SilentlyContinue } catch {}
try { Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' -Name 'DisablePagingExecutive' -Value 0 -Type DWord -ErrorAction SilentlyContinue } catch {}
try { Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' -Name 'NtfsDisableLastAccessUpdate' -Value 0 -Type DWord -ErrorAction SilentlyContinue } catch {}
try { Set-Service WSearch -StartupType Manual -ErrorAction SilentlyContinue } catch {}
try { powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR CPMINCORES 0 -ErrorAction SilentlyContinue; powercfg -setactive SCHEME_CURRENT -ErrorAction SilentlyContinue } catch {}
try { powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR IDLEDISABLE 0 -ErrorAction SilentlyContinue; powercfg -setactive SCHEME_CURRENT -ErrorAction SilentlyContinue } catch {}
if ($errors.Count -gt 0) { Write-Output "Reset completed with errors in: $($errors -join ', ')" }
else { Write-Output "All tweaks reset to defaults. Restart recommended." }
"#;
    crate::services::file_io::run_powershell(script, &[])
        .map_err(|e| format!("Reset failed: {}", e))?;
    Ok("All tweaks reset to defaults. Restart recommended.".to_string())
}
