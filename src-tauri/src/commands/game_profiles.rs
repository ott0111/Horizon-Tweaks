use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::command;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GameProfile {
    pub id: String,
    pub name: String,
    #[serde(rename = "executable_path", alias = "executable")]
    pub executable_path: String,
    pub path: String,
    pub detected: bool,
    pub last_played: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProfileResult {
    pub success: bool,
    pub message: String,
}

static PROFILES: once_cell::sync::Lazy<Mutex<HashMap<String, GameProfile>>> =
    once_cell::sync::Lazy::new(|| Mutex::new(HashMap::new()));

#[command]
pub async fn get_game_profiles() -> Result<Vec<GameProfile>, String> {
    let script = r#"
$results = @()

function Add-Game($id, $name, $executable, $path, $detected) {
    $script:results += [PSCustomObject]@{
        id = $id
        name = $name
        executable = $executable
        path = $path
        detected = $detected
        last_played = $null
    }
}

$drives = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DriveType=3" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty DeviceID
if (-not $drives) { $drives = @("C:") }

foreach ($d in $drives) {
    $base = $d.TrimEnd('\')
    $checks = @(
        @{ id = "Epic-Fortnite"; n = "Fortnite"; e = "$base\Fortnite\FortniteGame\Binaries\Win64\FortniteClient-Win64-Shipping.exe"; p = "$base\Fortnite" }
        @{ id = "Epic-Fortnite-2"; n = "Fortnite"; e = "$base\Program Files\Epic Games\Fortnite\FortniteGame\Binaries\Win64\FortniteClient-Win64-Shipping.exe"; p = "$base\Program Files\Epic Games\Fortnite" }
        @{ id = "Standalone-Minecraft"; n = "Minecraft"; e = "$base\Program Files (x86)\Minecraft\MinecraftLauncher.exe"; p = "$base\Program Files (x86)\Minecraft" }
        @{ id = "Standalone-Minecraft-2"; n = "Minecraft"; e = "$base\Program Files\Minecraft\MinecraftLauncher.exe"; p = "$base\Program Files\Minecraft" }
        @{ id = "Xbox-Minecraft"; n = "Minecraft"; e = "$base\XboxGames\Minecraft\Content\Minecraft.exe"; p = "$base\XboxGames\Minecraft" }
        @{ id = "EA-Apex Legends"; n = "Apex Legends"; e = "$base\Program Files\EA Games\Apex Legends\r5apex.exe"; p = "$base\Program Files\EA Games\Apex Legends" }
        @{ id = "Riot-Valorant"; n = "Valorant"; e = "$base\Program Files\Riot Games\VALORANT\live\VALORANT.exe"; p = "$base\Program Files\Riot Games\VALORANT" }
        @{ id = "Riot-Valorant-2"; n = "Valorant"; e = "$base\Riot Games\VALORANT\live\VALORANT.exe"; p = "$base\Riot Games\VALORANT" }
        @{ id = "Riot-League of Legends"; n = "League of Legends"; e = "$base\Riot Games\League of Legends\LeagueClient.exe"; p = "$base\Riot Games\League of Legends" }
        @{ id = "Steam-Counter-Strike 2"; n = "Counter-Strike 2"; e = "$base\Program Files (x86)\Steam\steamapps\common\Counter-Strike Global Offensive\cs2.exe"; p = "$base\Program Files (x86)\Steam\steamapps\common\Counter-Strike Global Offensive" }
        @{ id = "Steam-CS2"; n = "Counter-Strike 2"; e = "$base\SteamLibrary\steamapps\common\Counter-Strike Global Offensive\cs2.exe"; p = "$base\SteamLibrary\steamapps\common\Counter-Strike Global Offensive" }
        @{ id = "BattleNet-Overwatch 2"; n = "Overwatch 2"; e = "$base\Program Files\Overwatch\Overwatch.exe"; p = "$base\Program Files\Overwatch" }
        @{ id = "Steam-Cyberpunk 2077"; n = "Cyberpunk 2077"; e = "$base\SteamLibrary\steamapps\common\Cyberpunk 2077\bin\x64\Cyberpunk2077.exe"; p = "$base\SteamLibrary\steamapps\common\Cyberpunk 2077" }
        @{ id = "Steam-Elden Ring"; n = "Elden Ring"; e = "$base\SteamLibrary\steamapps\common\ELDEN RING\Game\eldenring.exe"; p = "$base\SteamLibrary\steamapps\common\ELDEN RING" }
        @{ id = "Steam-Baldur's Gate 3"; n = "Baldur's Gate 3"; e = "$base\SteamLibrary\steamapps\common\Baldurs Gate 3\bg3.exe"; p = "$base\SteamLibrary\steamapps\common\Baldurs Gate 3" }
        @{ id = "Steam-Hogwarts Legacy"; n = "Hogwarts Legacy"; e = "$base\SteamLibrary\steamapps\common\Hogwarts Legacy\HogwartsLegacy.exe"; p = "$base\SteamLibrary\steamapps\common\Hogwarts Legacy" }
        @{ id = "Steam-PUBG"; n = "PUBG: Battlegrounds"; e = "$base\SteamLibrary\steamapps\common\PUBG\TslGame.exe"; p = "$base\SteamLibrary\steamapps\common\PUBG" }
        @{ id = "Steam-Dota 2"; n = "Dota 2"; e = "$base\SteamLibrary\steamapps\common\dota 2 beta\game\bin\win64\dota2.exe"; p = "$base\SteamLibrary\steamapps\common\dota 2 beta" }
        @{ id = "Epic-Rocket League"; n = "Rocket League"; e = "$base\Program Files\Epic Games\RocketLeague\Binaries\Win64\RocketLeague.exe"; p = "$base\Program Files\Epic Games\RocketLeague" }
        @{ id = "Steam-Destiny 2"; n = "Destiny 2"; e = "$base\SteamLibrary\steamapps\common\Destiny 2\destiny2.exe"; p = "$base\SteamLibrary\steamapps\common\Destiny 2" }
        @{ id = "Steam-The Witcher 3"; n = "The Witcher 3"; e = "$base\SteamLibrary\steamapps\common\The Witcher 3\bin\x64\witcher3.exe"; p = "$base\SteamLibrary\steamapps\common\The Witcher 3" }
        @{ id = "Steam-RDR2"; n = "Red Dead Redemption 2"; e = "$base\SteamLibrary\steamapps\common\Red Dead Redemption 2\RDR2.exe"; p = "$base\SteamLibrary\steamapps\common\Red Dead Redemption 2" }
        @{ id = "Steam-Forza Horizon 5"; n = "Forza Horizon 5"; e = "$base\SteamLibrary\steamapps\common\ForzaHorizon5\ForzaHorizon5.exe"; p = "$base\SteamLibrary\steamapps\common\ForzaHorizon5" }
        @{ id = "Steam-DOOM Eternal"; n = "DOOM Eternal"; e = "$base\SteamLibrary\steamapps\common\DOOM Eternal\DOOMEternal.exe"; p = "$base\SteamLibrary\steamapps\common\DOOM Eternal" }
        @{ id = "Standalone-Genshin Impact"; n = "Genshin Impact"; e = "$base\Program Files\Genshin Impact\Genshin Impact Game\GenshinImpact.exe"; p = "$base\Program Files\Genshin Impact" }
        @{ id = "Rockstar-GTA V"; n = "Grand Theft Auto V"; e = "$base\Program Files\Rockstar Games\Grand Theft Auto V\GTA5.exe"; p = "$base\Program Files\Rockstar Games\Grand Theft Auto V" }
        @{ id = "Ubisoft-Rainbow Six Siege"; n = "Rainbow Six Siege"; e = "$base\Program Files\Ubisoft\Ubisoft Game Launcher\games\Rainbow Six Siege\RainbowSix.exe"; p = "$base\Program Files\Ubisoft\Ubisoft Game Launcher\games\Rainbow Six Siege" }
        @{ id = "D-Games-Fortnite"; n = "Fortnite"; e = "$base\Aayan\Fortnite\FortniteGame\Binaries\Win64\FortniteClient-Win64-Shipping.exe"; p = "$base\Aayan\Fortnite" }
    )
    foreach ($c in $checks) {
        if (Test-Path $c.e) {
            Add-Game $c.id $c.n $c.e $c.p $true
        } else {
            Add-Game $c.id $c.n "" $c.p $false
        }
    }
}

$results | ConvertTo-Json -Depth 4
"#;

    let script_owned = script.to_string();
    let output = tokio::time::timeout(
        std::time::Duration::from_secs(15),
        tokio::task::spawn_blocking(move || {
            crate::services::file_io::run_powershell(&script_owned, &[])
        }),
    )
    .await
    .map_err(|_| "get_game_profiles timed out (over 15s)".to_string())?
    .map_err(|e| e.to_string())?
    .map_err(|e| format!("PowerShell error: {}", e))?;

    let games: Vec<GameProfile> = serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse game profiles: {}", e))?;

    Ok(games)
}

#[command]
pub fn create_game_profile(profile: GameProfile) -> Result<ProfileResult, String> {
    let mut profiles = PROFILES
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    let id = if profile.id.is_empty() {
        Uuid::new_v4().to_string()
    } else {
        profile.id.clone()
    };
    let entry = GameProfile {
        id: id.clone(),
        ..profile
    };
    profiles.insert(id.clone(), entry);
    Ok(ProfileResult {
        success: true,
        message: format!("Game profile '{}' created successfully", id),
    })
}

#[command]
pub fn update_game_profile(profile: GameProfile) -> Result<ProfileResult, String> {
    let mut profiles = PROFILES
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    if profiles.contains_key(&profile.id) {
        profiles.insert(profile.id.clone(), profile.clone());
        Ok(ProfileResult {
            success: true,
            message: format!("Game profile '{}' updated successfully", profile.name),
        })
    } else {
        Err(format!("Game profile '{}' not found", profile.id))
    }
}

#[command]
pub fn delete_game_profile(profile_id: String) -> Result<ProfileResult, String> {
    let mut profiles = PROFILES
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    if profiles.remove(&profile_id).is_some() {
        Ok(ProfileResult {
            success: true,
            message: format!("Game profile '{}' deleted", profile_id),
        })
    } else {
        Err(format!("Game profile '{}' not found", profile_id))
    }
}

#[command]
pub fn activate_game_profile(profile_id: String) -> Result<ProfileResult, String> {
    let script = format!(
        r#"
        $profileId = "{}"
        
        try {{
            powercfg /setactive SCHEME_MIN | Out-Null
            Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' -Name 'AppCaptureEnabled' -Value 0 -Type DWord -ErrorAction SilentlyContinue
            Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' -Name 'GameDVR_Enabled' -Value 0 -Type DWord -ErrorAction SilentlyContinue
            Set-ItemProperty -Path 'HKCU:\System\GameConfigStore' -Name 'GameDVR_Enabled' -Value 0 -Type DWord -ErrorAction SilentlyContinue
            Set-ItemProperty -Path 'HKCU:\System\GameConfigStore' -Name 'GameDVR_FSEBehavior' -Value 2 -Type DWord -ErrorAction SilentlyContinue
            Set-ItemProperty -Path 'HKCU:\System\GameConfigStore' -Name 'GameDVR_FSEBehaviorMode' -Value 2 -Type DWord -ErrorAction SilentlyContinue
            Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters' -Name 'TcpAckFrequency' -Value 1 -Type DWord -ErrorAction SilentlyContinue
            Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters' -Name 'TcpDelAckTicks' -Value 0 -Type DWord -ErrorAction SilentlyContinue
            Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' -Name 'NetworkThrottlingIndex' -Value 0xffffffff -Type DWord -ErrorAction SilentlyContinue
            Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' -Name 'SystemResponsiveness' -Value 0 -Type DWord -ErrorAction SilentlyContinue
            Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects' -Name 'VisualFXSetting' -Value 2 -Type DWord -ErrorAction SilentlyContinue
            Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' -Name 'ClearPageFileAtShutdown' -Value 0 -Type DWord -ErrorAction SilentlyContinue
            Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters' -Name 'EnablePrefetcher' -Value 3 -Type DWord -ErrorAction SilentlyContinue
            Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' -Name 'HwSchMode' -Value 2 -Type DWord -ErrorAction SilentlyContinue
            powercfg /change standby-timeout-ac 0 | Out-Null
            powercfg /change hibernate-timeout-ac 0 | Out-Null
            Set-ItemProperty -Path 'HKCU:\Control Panel\Mouse' -Name 'MouseSpeed' -Value 0 -Type String -ErrorAction SilentlyContinue
            Set-ItemProperty -Path 'HKCU:\Control Panel\Mouse' -Name 'MouseThreshold1' -Value 0 -Type String -ErrorAction SilentlyContinue
            Set-ItemProperty -Path 'HKCU:\Control Panel\Mouse' -Name 'MouseThreshold2' -Value 0 -Type String -ErrorAction SilentlyContinue
            Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update' -Name 'AUOptions' -Value 2 -Type DWord -ErrorAction SilentlyContinue
            Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' -Name 'NtfsDisableLastAccessUpdate' -Value 1 -Type DWord -ErrorAction SilentlyContinue
            Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
            Start-Process explorer -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            @{{
                success = $true
                message = "Game profile '$profileId' activated successfully. Gaming optimizations applied."
            }} | ConvertTo-Json
        }} catch {{
            @{{
                success = $false
                message = "Failed to activate game profile: $($_.Exception.Message)"
            }} | ConvertTo-Json
        }}
        "#,
        profile_id.replace("\"", "\\\"")
    );

    let output = crate::services::file_io::run_powershell(&script, &[])
        .map_err(|e| e.to_string())?;

    let result: serde_json::Value = serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse activation result: {}", e))?;

    Ok(ProfileResult {
        success: result["success"].as_bool().unwrap_or(false),
        message: result["message"]
            .as_str()
            .unwrap_or("Unknown result")
            .to_string(),
    })
}

#[command]
pub async fn detect_installed_games() -> Result<Vec<GameProfile>, String> {
    let script = r#"
$detectedGames = @()
$checkedExes = @{}

function Add-Game($id, $name, $executable, $path) {
    if ($executable -and (Test-Path $executable) -and -not $checkedExes.ContainsKey($executable)) {
        $checkedExes[$executable] = $true
        $script:detectedGames += [PSCustomObject]@{
            id = $id
            name = $name
            executable = $executable
            path = $path
            detected = $true
            last_played = $null
        }
    } elseif (-not $executable -or -not (Test-Path $executable)) {
        $script:detectedGames += [PSCustomObject]@{
            id = $id
            name = $name
            executable = ""
            path = $path
            detected = $false
            last_played = $null
        }
    }
}

function Find-MainExe($dir) {
    if (-not (Test-Path $dir)) { return $null }
    $exes = @(Get-ChildItem $dir -Filter "*.exe" -Depth 2 -ErrorAction SilentlyContinue)
    if ($exes.Count -eq 0) {
        $exes = @(Get-ChildItem $dir -Filter "*.exe" -Depth 4 -ErrorAction SilentlyContinue)
    }
    return $exes | Where-Object { $_.Length -gt 512KB -and $_.Name -notmatch '(?i)(unins|setup|install|redist|vc_redist|dxwebsetup|dotnet|_CommonRedist|crash|report|error|UE4Prereq)' } |
        Sort-Object Length -Descending | Select-Object -First 1
}

$checkedGames = @{}

# ---- 1. STEAM: parse libraryfolders.vdf ----
$steamRoots = @(
    "C:\Program Files (x86)\Steam",
    "C:\Program Files\Steam"
)
Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DriveType=3" -ErrorAction SilentlyContinue | ForEach-Object {
    $d = $_.DeviceID.TrimEnd('\')
    $steamRoots += "$d\Program Files (x86)\Steam"
    $steamRoots += "$d\Program Files\Steam"
    $steamRoots += "$d\Steam"
    $steamRoots += "$d\SteamLibrary"
    $steamRoots += "$d\Games\Steam"
}

$steamLibs = @{}
foreach ($root in $steamRoots) {
    foreach ($vdfPath in @("$root\config\libraryfolders.vdf", "$root\steamapps\libraryfolders.vdf")) {
        if (Test-Path $vdfPath -and -not $steamLibs.ContainsKey($root)) {
            $steamLibs[$root] = $true
            $content = Get-Content $vdfPath -Raw -ErrorAction SilentlyContinue
            if ($content) {
                $lines = $content -split "`n"
                $inLib = $false
                foreach ($line in $lines) {
                    if ($line -match '^\s*"\d+"\s*$') { $inLib = $true; continue }
                    if ($inLib -and $line -match '"path"\s*"(.+)"') {
                        $libPath = $matches[1] -replace '\\\\', '\'
                        $commonDir = "$libPath\steamapps\common"
                        if (Test-Path $commonDir) {
                            Get-ChildItem $commonDir -Directory -ErrorAction SilentlyContinue | ForEach-Object {
                                $gKey = "Steam-$($_.Name)"
                                if (-not $checkedGames.ContainsKey($gKey)) {
                                    $checkedGames[$gKey] = $true
                                    $exe = Find-MainExe $_.FullName
                                    if ($exe) { Add-Game $gKey $_.Name $exe.FullName $_.FullName }
                                }
                            }
                        }
                        $inLib = $false
                    }
                    if ($line -match '^\s*\}') { $inLib = $false }
                }
            }
        }
    }
    $common = "$root\steamapps\common"
    if (Test-Path $common) {
        Get-ChildItem $common -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            $gKey = "Steam-$($_.Name)"
            if (-not $checkedGames.ContainsKey($gKey)) {
                $checkedGames[$gKey] = $true
                $exe = Find-MainExe $_.FullName
                if ($exe) { Add-Game $gKey $_.Name $exe.FullName $_.FullName }
            }
        }
    }
}

# ---- 2. EPIC GAMES: LauncherInstalled.dat ----
try {
    $epicPaths = @(
        "$env:ProgramData\Epic\UnrealEngineLauncher\LauncherInstalled.dat",
        "$env:LOCALAPPDATA\Epic\UnrealEngineLauncher\LauncherInstalled.dat"
    )
    foreach ($ep in $epicPaths) {
        if (Test-Path $ep) {
            $data = Get-Content $ep -Raw | ConvertFrom-Json
            foreach ($inst in $data.InstallationList) {
                $dir = $inst.InstallLocation
                if ($dir -and (Test-Path $dir)) {
                    $appName = $inst.AppName
                    $gKey = "Epic-$appName"
                    if (-not $checkedGames.ContainsKey($gKey)) {
                        $checkedGames[$gKey] = $true
                        $exe = Find-MainExe $dir
                        $displayName = if ($inst.DisplayName) { $inst.DisplayName } else { $appName }
                        if ($exe) { Add-Game $gKey $displayName $exe.FullName $dir }
                    }
                }
            }
        }
    }
    # Scan D:\Aayan\Fortnite specifically (deep search for Fortnite exes)
    $fortnitePaths = @(
        "D:\Aayan\Fortnite\FortniteGame\Binaries\Win64\FortniteClient-Win64-Shipping.exe",
        "D:\Aayan\Fortnite\FortniteGame\Binaries\Win64\FortniteLauncher.exe",
        "D:\Aayan\Fortnite\FortniteGame\Binaries\Win64\*.exe",
        "D:\Aayan\Fortnite\*.exe",
        "$env:ProgramData\Epic\Fortnite\*.exe",
        "C:\Program Files\Epic Games\Fortnite\FortniteGame\Binaries\Win64\FortniteClient-Win64-Shipping.exe"
    )
    if (-not $checkedGames.ContainsKey("Epic-Fortnite")) {
        $checkedGames["Epic-Fortnite"] = $true
        $fortExe = $null
        foreach ($fp in $fortnitePaths) {
            $matches = Get-ChildItem $fp -ErrorAction SilentlyContinue | Sort-Object Length -Descending
            if ($matches) { $fortExe = $matches[0]; break }
        }
        $fortDir = if (Test-Path "D:\Aayan\Fortnite") { "D:\Aayan\Fortnite" } else { "" }
        Add-Game "Epic-Fortnite" "Fortnite" $(if ($fortExe) { $fortExe.FullName } else { "" }) $fortDir
    }
} catch {}

# ---- 3. BATTLE.NET ----
try {
    $bnDirs = @()
    Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DriveType=3" -ErrorAction SilentlyContinue | ForEach-Object {
        $d = $_.DeviceID.TrimEnd('\')
        $bnDirs += "$d\Program Files (x86)\Battle.net"; $bnDirs += "$d\Program Files\Battle.net"
        $bnDirs += "$d\Battle.net"; $bnDirs += "$d\Games\Battle.net"
    }
    foreach ($bn in $bnDirs) {
        if (Test-Path $bn) {
            $bnParent = Split-Path $bn -Parent
            Get-ChildItem $bnParent -Directory -ErrorAction SilentlyContinue | ForEach-Object {
                $gName = $_.Name
                if ($gName -ne "Battle.net" -and $gName -ne "Agent") {
                    $gKey = "BattleNet-$gName"
                    if (-not $checkedGames.ContainsKey($gKey)) {
                        $checkedGames[$gKey] = $true
                        $exe = Find-MainExe $_.FullName
                        if ($exe) { Add-Game $gKey $gName $exe.FullName $_.FullName }
                    }
                }
            }
        }
    }
} catch {}

# ---- 4. GOG GALAXY ----
try {
    $gogDirs = @()
    Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DriveType=3" -ErrorAction SilentlyContinue | ForEach-Object {
        $d = $_.DeviceID.TrimEnd('\')
        $gogDirs += "$d\Program Files (x86)\GOG Galaxy"; $gogDirs += "$d\Program Files\GOG Galaxy"
        $gogDirs += "$d\GOG Galaxy"; $gogDirs += "$d\GOG Games"; $gogDirs += "$d\Games\GOG"
    }
    foreach ($gog in $gogDirs) {
        if (Test-Path $gog) {
            Get-ChildItem $gog -Directory -ErrorAction SilentlyContinue | ForEach-Object {
                if ($_.Name -notmatch '(?i)(galaxy|galaxyclient|galaxycommunication|games)') {
                    $gKey = "GOG-$($_.Name)"
                    if (-not $checkedGames.ContainsKey($gKey)) {
                        $checkedGames[$gKey] = $true
                        $exe = Find-MainExe $_.FullName
                        if ($exe) { Add-Game $gKey $_.Name $exe.FullName $_.FullName }
                    }
                }
            }
        }
    }
} catch {}

# ---- 5. REGISTRY SCAN (HKLM + HKCU Uninstall) ----
$gameKeywords = @('game', 'call of duty', 'fortnite', 'minecraft', 'apex', 'valorant', 'league of legend', 'overwatch', 'rocket league', 'destiny', 'cyberpunk', 'elden ring', 'baldur', 'witcher', 'red dead', 'grand theft auto', 'battlefield', 'assassin', 'far cry', 'watch dogs', 'rainbow six', 'the division', 'ghost recon', 'doom', 'fallout', 'skyrim', 'starfield', 'diablo', 'warcraft', 'starcraft', 'hearthstone', 'half-life', 'portal', 'left 4 dead', 'team fortress', 'dota', 'counter-strike', 'pubg', 'dayz', 'rust', 'impulse', 'subnautica', 'dark souls', 'sekiro', 'hollow knight', 'ori', 'forza', 'horizon', 'spider-man', 'god of war', 'final fantasy', 'resident evil', 'monster hunter', 'street fighter', 'tekken', 'mortal kombat', 'nba 2k', 'fifa', 'madden', 'star wars', 'hogwarts legacy', 'dragon age', 'mass effect', 'borderlands', 'bioShock', 'crisis', 'metro', 'tomb raider', 'hitman', 'splinter cell', 'medal of honor', 'need for speed', 'nfs', 'gta', 'mafia', 'saints row', 'satisfactory', 'factorio', 'rimworld', 'cities skylines', 'planet coaster', 'planet zoo', 'euro truck', 'american truck', 'train simulator', 'flight simulator', 'x-plane', 'msfs', 'minecraft launcher', 'minecraft education', 'roblox', 'epic games', 'ubisoft connect', 'origin', 'ea app', 'battle.net', 'steam', 'gog galaxy', 'rockstar', 'riot games', 'valorant', 'league client', 'genshin impact', 'honkai', 'star rail', 'zenless', 'wuthering waves', 'palworld', 'helldivers', 'dave the diver', 'stray', 'cult of the lamb', 'hades', 'dead cells', 'celeste', 'stardew valley', 'terraria', "don't starve", 'oxygen not included', 'slay the spire')

$regPaths = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*"
)

foreach ($regPath in $regPaths) {
    try {
        $items = Get-ChildItem $regPath -ErrorAction SilentlyContinue | Get-ItemProperty -Name DisplayName, InstallLocation -ErrorAction SilentlyContinue
        foreach ($item in $items) {
            $displayName = $item.DisplayName
            if (-not $displayName) { continue }
            $installPath = $item.InstallLocation
            $lowerName = $displayName.ToLower()
            $isGame = $false
            foreach ($kw in $gameKeywords) {
                if ($lowerName -match [regex]::Escape($kw)) { $isGame = $true; break }
            }
            if (-not $isGame -and $installPath -and (Test-Path $installPath)) {
                $exeCount = (Get-ChildItem $installPath -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Length -gt 1MB }).Count
                if ($exeCount -ge 1) { $isGame = $true }
            }
            if ($isGame) {
                $safeId = $displayName -replace '[^a-zA-Z0-9 ]', ''
                $gKey = "Reg-$safeId"
                if (-not $checkedGames.ContainsKey($gKey)) {
                    $checkedGames[$gKey] = $true
                    if ($installPath -and (Test-Path $installPath)) {
                        $exe = Find-MainExe $installPath
                        if ($exe) { Add-Game $gKey $displayName $exe.FullName $installPath }
                        else { Add-Game $gKey $displayName "" $installPath }
                    } else { Add-Game $gKey $displayName "" "" }
                }
            }
        }
    } catch {}
}

# ---- 6. SCAN D:\Aayan\ and common game directories ----
$scanRoots = @()
Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DriveType=3" -ErrorAction SilentlyContinue | ForEach-Object {
    $d = $_.DeviceID.TrimEnd('\')
    $scanRoots += "$d\Aayan"; $scanRoots += "$d\Games"; $scanRoots += "$d\Game"; $scanRoots += "$d\Gaming"
    $scanRoots += "$d\Program Files\Epic Games"; $scanRoots += "$d\Program Files (x86)\Epic Games"
}

foreach ($root in $scanRoots) {
    if (Test-Path $root) {
        Get-ChildItem $root -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            $gKey = "Local-$($_.Name)"
            if (-not $checkedGames.ContainsKey($gKey)) {
                $checkedGames[$gKey] = $true
                $exe = Find-MainExe $_.FullName
                if ($exe) { Add-Game $gKey $_.Name $exe.FullName $_.FullName }
            }
        }
    }
}

# ---- 7. Scan all fixed drives for common game folder names ----
$commonGameFolders = @("Riot Games", "Epic Games", "Ubisoft", "EA Games", "Electronic Arts", "Blizzard Entertainment", "Battle.net", "GOG Galaxy", "GOG Games", "Rockstar Games", "CD Projekt Red", "Bethesda", "XboxGames", "Xbox Games", "Mojang", "Minecraft", "Valve", "Steam", "SteamLibrary", "Origin", "Unity", "Unreal Engine", "GameMaker", "Focus Home", "THQ", "Deep Silver", "Square Enix", "Capcom", "Bandai Namco", "Sega", "Konami", "Activision", "2K Games", "505 Games", "Paradox Interactive", "Devolver Digital", "Fortnite")

Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DriveType=3" -ErrorAction SilentlyContinue | ForEach-Object {
    $d = $_.DeviceID.TrimEnd('\')
    foreach ($f in $commonGameFolders) {
        $fDir = "$d\$f"
        if (Test-Path $fDir) {
            Get-ChildItem $fDir -Directory -ErrorAction SilentlyContinue | ForEach-Object {
                $gKey = "$f-$($_.Name)"
                if (-not $checkedGames.ContainsKey($gKey)) {
                    $checkedGames[$gKey] = $true
                    $exe = Find-MainExe $_.FullName
                    if ($exe) { Add-Game $gKey $_.Name $exe.FullName $_.FullName }
                }
            }
            # Also check if the folder itself is a game (e.g. D:\Epic Games\Fortnite)
            $gKey = "Root-$f"
            if (-not $checkedGames.ContainsKey($gKey)) {
                $checkedGames[$gKey] = $true
                $exe = Find-MainExe $fDir
                if ($exe) { Add-Game $gKey $f $exe.FullName $fDir }
            }
        }
    }
}

$detectedGames | ConvertTo-Json -Depth 4
"#;

    let script_owned = script.to_string();
    let output = tokio::time::timeout(
        std::time::Duration::from_secs(90),
        tokio::task::spawn_blocking(move || {
            crate::services::file_io::run_powershell(&script_owned, &[])
        }),
    )
    .await
    .map_err(|_| "Game detection timed out (over 90s)".to_string())?
    .map_err(|e| e.to_string())?
    .map_err(|e| format!("PowerShell error: {}", e))?;

    let games: Vec<GameProfile> = serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse game profiles: {}", e))?;

    Ok(games)
}
