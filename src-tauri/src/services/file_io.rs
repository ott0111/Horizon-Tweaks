use std::io::{self, Write};
use std::path::PathBuf;
use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

fn hide_window(cmd: &mut Command) -> &mut Command {
    #[cfg(windows)]
    {
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    #[cfg(not(windows))]
    {
        let _ = cmd;
    }
    cmd
}

fn get_temp_script_path() -> io::Result<PathBuf> {
    let tmp = std::env::temp_dir().join(format!("opencode_{}.ps1", std::process::id()));
    Ok(tmp)
}

pub fn run_powershell(script: &str, args: &[&str]) -> io::Result<String> {
    let script_len = script.len();

    let output = if script_len > 4000 {
        let script_path = get_temp_script_path()?;
        let mut file = std::fs::File::create(&script_path)?;
        file.write_all(script.as_bytes())?;
        drop(file);

        let result = hide_window(
            Command::new("powershell.exe")
                .arg("-ExecutionPolicy")
                .arg("Bypass")
                .arg("-NoProfile")
                .arg("-NonInteractive")
                .arg("-WindowStyle")
                .arg("Hidden")
                .arg("-File")
                .arg(&script_path)
                .args(args)
        ).output();

        let _ = std::fs::remove_file(&script_path);
        result?
    } else {
        hide_window(
            Command::new("powershell.exe")
                .arg("-ExecutionPolicy")
                .arg("Bypass")
                .arg("-NoProfile")
                .arg("-NonInteractive")
                .arg("-WindowStyle")
                .arg("Hidden")
                .arg("-Command")
                .arg(script)
                .args(args)
        ).output()?
    };

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        if !stdout.is_empty() {
            Ok(stdout.to_string())
        } else {
            Err(io::Error::new(io::ErrorKind::Other, stderr.to_string()))
        }
    }
}
