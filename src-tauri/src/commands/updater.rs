use std::io::Write;
use std::os::windows::process::CommandExt;

use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Serialize, Deserialize, Clone)]
pub struct UpdateInfo {
    pub version: String,
    pub body: String,
    pub download_url: String,
    pub size: u64,
}

#[derive(Deserialize)]
struct GithubRelease {
    tag_name: String,
    body: Option<String>,
    assets: Vec<GithubAsset>,
}

#[derive(Deserialize)]
struct GithubAsset {
    name: String,
    browser_download_url: String,
    size: u64,
}

#[tauri::command]
pub async fn check_for_update(app: AppHandle) -> Result<Option<UpdateInfo>, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {e}"))?;

    let resp = client
        .get("https://api.github.com/repos/HBAABA119/Horizon-Optimizer/releases/latest")
        .header("User-Agent", "Impulse-Tweaks")
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "Update check timed out. Check your internet connection.".to_string()
            } else if e.is_connect() {
                "Cannot connect to GitHub. Check your internet connection.".to_string()
            } else {
                format!("Failed to check for updates: {e}")
            }
        })?;

    let status = resp.status();
    if status == 403 || status == 429 {
        return Err("GitHub API rate limit exceeded. Try again in a few minutes.".to_string());
    }
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API returned {}: {}", status, body));
    }

    let release: GithubRelease = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse release info: {e}"))?;

    let current = app.package_info().version.to_string();
    let remote = release.tag_name.trim_start_matches('v').to_string();

    if !is_newer(&remote, &current) {
        return Ok(None);
    }

    // Prefer MSI, fallback to portable exe
    let asset = release
        .assets
        .iter()
        .find(|a| a.name.ends_with(".msi"))
        .or_else(|| release.assets.iter().find(|a| a.name.ends_with(".exe")))
        .ok_or_else(|| format!("No downloadable installer found in latest release v{}", remote))?;

    Ok(Some(UpdateInfo {
        version: remote,
        body: release.body.unwrap_or_default(),
        download_url: asset.browser_download_url.clone(),
        size: asset.size,
    }))
}

#[tauri::command]
pub async fn download_update(url: String, app: AppHandle) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {e}"))?;
    let resp = client
        .get(&url)
        .header("User-Agent", "Horizon-Optimizer")
        .send()
        .await
        .map_err(|e| format!("Download failed: {e}"))?;

    let total = resp.content_length().unwrap_or(0);
    let temp = std::env::temp_dir().join("Impulse-Update.msi");
    let mut file =
        std::fs::File::create(&temp).map_err(|e| format!("Failed to create temp file: {e}"))?;

    let mut stream = resp.bytes_stream();
    let mut downloaded: u64 = 0;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Download error: {e}"))?;
        file.write_all(&chunk)
            .map_err(|e| format!("Failed to write to temp file: {e}"))?;
        downloaded += chunk.len() as u64;
        if total > 0 {
            let _ = app.emit(
                "update:progress",
                serde_json::json!({ "downloaded": downloaded, "total": total }),
            );
        }
    }

    Ok(temp.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn install_update(path: String) -> Result<(), String> {
    let temp = std::env::temp_dir();
    let msi_path = std::path::Path::new(&path);
    let bat_path = temp.join("impulse-update.bat");
    let log_path = temp.join("impulse-update.log");

    let current_exe = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from(r"C:\Program Files\Horizon Tweaks Optimization"));

    let fallback_dir = current_exe.to_string_lossy().replace("/", "\\");
    let fallback_exe = format!(r"{}\Impulse-Optimization.exe", fallback_dir);
    let msi_display = msi_path.display().to_string().replace("/", "\\");
    let log_display = log_path.display().to_string().replace("/", "\\");

    // Try to get the original install directory from registry first,
    // fall back to the current exe's parent directory
    let install_dir = get_install_dir_from_registry()
        .unwrap_or_else(|| fallback_dir.clone());
    let install_dir_display = install_dir.replace("/", "\\");
    let install_exe = format!(r"{}\Impulse-Optimization.exe", install_dir_display);

    let bat = format!(
        r#"@echo off
echo [%date% %time%] Impulse Updater started >> "{log_display}"
echo [%date% %time%] Install dir: {install_dir} >> "{log_display}"
echo [%date% %time%] MSI path: {msi_display} >> "{log_display}"

:wait
%SystemRoot%\System32\tasklist.exe /FI "IMAGENAME eq Impulse-Optimization.exe" 2>nul | %SystemRoot%\System32\find.exe /I "Impulse-Optimization.exe" >nul
if not errorlevel 1 (
    echo [%date% %time%] Waiting for app to close... >> "{log_display}"
    %SystemRoot%\System32\timeout.exe /t 1 /nobreak >nul
    goto wait
)

echo [%date% %time%] App closed, starting msiexec... >> "{log_display}"
:: Install to the same location as the previous version
msiexec /i "{msi_display}" INSTALLDIR="{install_dir}" /qn /norestart /l*v "{log_display}"
set MSI_EXIT=%ERRORLEVEL%
echo [%date% %time%] msiexec exited with code %MSI_EXIT% >> "{log_display}"

echo [%date% %time%] Relaunching app from {install_dir}... >> "{log_display}"
if exist "{install_exe}" (
    start "" "{install_exe}"
) else if exist "{fallback_exe}" (
    start "" "{fallback_exe}"
) else (
    echo [%date% %time%] Trying default locations... >> "{log_display}"
    if exist "%ProgramFiles%\Horizon Tweaks Optimization\Impulse-Optimization.exe" (
        start "" "%ProgramFiles%\Horizon Tweaks Optimization\Impulse-Optimization.exe"
    ) else if exist "%LocalAppData%\Programs\Horizon Tweaks Optimization\Impulse-Optimization.exe" (
        start "" "%LocalAppData%\Programs\Horizon Tweaks Optimization\Impulse-Optimization.exe"
    )
)
echo [%date% %time%] Done. >> "{log_display}"
"#,
        msi_display = msi_display,
        install_dir = install_dir_display,
        install_exe = install_exe,
        fallback_exe = fallback_exe,
        log_display = log_display,
    );

    std::fs::write(&bat_path, bat.as_bytes())
        .map_err(|e| format!("Failed to write update script: {e}"))?;

    // Run the batch script elevated via PowerShell Start-Process -Verb RunAs
    // This ensures msiexec has admin privileges to install to Program Files
    let ps_script = format!(
        "Start-Process cmd -ArgumentList '/c', '\"{}\"' -Verb RunAs -Wait",
        bat_path.display().to_string().replace("\\", "\\\\")
    );

    std::process::Command::new("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-Command", &ps_script])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| format!("Failed to start elevated update: {e}"))?;

    std::process::exit(0);
}

fn is_newer(remote: &str, current: &str) -> bool {
    let r = parse_semver(remote);
    let c = parse_semver(current);
    match (r, c) {
        (Some(rv), Some(cv)) => rv > cv,
        (Some(_), None) => true,
        (None, Some(_)) => false,
        _ => normalize_version(remote) > normalize_version(current),
    }
}

fn parse_semver(v: &str) -> Option<(u32, u32, u32)> {
    let version = normalize_version(v);
    let version = version
        .split(|c: char| c == '+' || c == '-')
        .next()
        .unwrap_or("");

    let parts: Vec<&str> = version.split('.').collect();
    if parts.len() < 3 {
        return None;
    }

    let major = parts[0].parse().ok()?;
    let minor = parts[1].parse().ok()?;
    let patch_text = parts[2].trim();
    let patch_digits: String = patch_text.chars().take_while(|c| c.is_ascii_digit()).collect();
    let patch = patch_digits.parse().ok()?;

    Some((major, minor, patch))
}

fn normalize_version(v: &str) -> String {
    let trimmed = v.trim();
    let stripped = trimmed
        .strip_prefix('v')
        .or_else(|| trimmed.strip_prefix('V'))
        .unwrap_or(trimmed);
    stripped.trim().to_string()
}

/// Read the previously installed Horizon Tweaks Optimization path from the Windows registry.
/// The installer writes this to HKCU\Software\Horizon Tweaks Optimization\install_path during install.
fn get_install_dir_from_registry() -> Option<String> {
    let path = r"Software\Horizon Tweaks Optimization";
    let hkcu = winreg::RegKey::predef(winreg::enums::HKEY_CURRENT_USER);
    hkcu.open_subkey_with_flags(path, winreg::enums::KEY_READ).ok().and_then(|key| {
        key.get_value::<String, _>("install_path").ok()
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_semver_standard() {
        assert_eq!(parse_semver("1.0.93"), Some((1, 0, 93)));
    }

    #[test]
    fn test_parse_semver_with_v_prefix() {
        assert_eq!(parse_semver("v1.0.93"), Some((1, 0, 93)));
    }

    #[test]
    fn test_parse_semver_with_v_prefix_upper() {
        assert_eq!(parse_semver("V2.1.0"), Some((2, 1, 0)));
    }

    #[test]
    fn test_parse_semver_with_prerelease() {
        assert_eq!(parse_semver("1.0.93-beta"), Some((1, 0, 93)));
    }

    #[test]
    fn test_parse_semver_with_build_metadata() {
        assert_eq!(parse_semver("1.0.93+build.123"), Some((1, 0, 93)));
    }

    #[test]
    fn test_parse_semver_two_parts() {
        assert_eq!(parse_semver("1.0"), None);
    }

    #[test]
    fn test_parse_semver_invalid() {
        assert_eq!(parse_semver("not-a-version"), None);
    }

    #[test]
    fn test_parse_semver_empty() {
        assert_eq!(parse_semver(""), None);
    }

    #[test]
    fn test_normalize_version_strips_v() {
        assert_eq!(normalize_version("v1.0.93"), "1.0.93");
    }

    #[test]
    fn test_normalize_version_strips_V() {
        assert_eq!(normalize_version("V2.0.0"), "2.0.0");
    }

    #[test]
    fn test_normalize_version_trims_whitespace() {
        assert_eq!(normalize_version("  1.0.93  "), "1.0.93");
    }

    #[test]
    fn test_normalize_version_no_prefix() {
        assert_eq!(normalize_version("1.0.93"), "1.0.93");
    }

    #[test]
    fn test_is_newer_major() {
        assert!(is_newer("2.0.0", "1.0.93"));
    }

    #[test]
    fn test_is_newer_minor() {
        assert!(is_newer("1.1.0", "1.0.93"));
    }

    #[test]
    fn test_is_newer_patch() {
        assert!(is_newer("1.0.94", "1.0.93"));
    }

    #[test]
    fn test_is_newer_same() {
        assert!(!is_newer("1.0.93", "1.0.93"));
    }

    #[test]
    fn test_is_newer_older() {
        assert!(!is_newer("1.0.92", "1.0.93"));
    }

    #[test]
    fn test_is_newer_with_v_prefix() {
        assert!(is_newer("v2.0.0", "1.0.93"));
    }

    #[test]
    fn test_is_newer_unparseable_remote_with_valid_current() {
        assert!(!is_newer("abc", "1.0.93"), "unparseable remote with valid current returns false");
    }

    #[test]
    fn test_is_newer_current_non_semver() {
        assert!(is_newer("1.0.93", "abc"));
    }

    #[test]
    fn test_update_info_serialization() {
        let info = UpdateInfo {
            version: "1.0.94".to_string(),
            body: "Bug fixes".to_string(),
            download_url: "https://example.com/update.msi".to_string(),
            size: 50_000_000,
        };
        let json = serde_json::to_string(&info).unwrap();
        assert!(json.contains("1.0.94"));
        assert!(json.contains("Bug fixes"));
        assert!(json.contains("50000000"));
    }
}
