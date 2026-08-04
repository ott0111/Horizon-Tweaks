use std::os::windows::process::CommandExt;
use windows_sys::Win32::Foundation::CloseHandle;
use windows_sys::Win32::Security::{GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY};
use windows_sys::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[tauri::command]
pub fn is_admin() -> bool {
    unsafe {
        let mut token_handle = 0;
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token_handle) == 0 {
            return false;
        }

        let mut elevation = TOKEN_ELEVATION { TokenIsElevated: 0 };
        let mut returned_size = 0;
        let is_elevated = GetTokenInformation(
            token_handle,
            TokenElevation,
            &mut elevation as *mut _ as *mut _,
            std::mem::size_of::<TOKEN_ELEVATION>() as u32,
            &mut returned_size,
        ) != 0;

        CloseHandle(token_handle);
        is_elevated && elevation.TokenIsElevated != 0
    }
}

#[tauri::command]
pub fn restart_as_admin() -> Result<(), String> {
    let exe = std::env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))?;

    std::process::Command::new("powershell")
        .args([
            "-Command",
            &format!("Start-Process '{}' -Verb RunAs", exe.to_string_lossy()),
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| format!("Failed to restart as admin: {}", e))?;

    std::process::exit(0);
}
