#![allow(dead_code)]

use crate::services::firebase_client::{FirebaseClient, LogEntry};
use chrono::Utc;

static CRASH_LOG_FILE: &str = "crash_log.json";

pub fn init_panic_hook() {
    std::panic::set_hook(Box::new(|panic_info| {
        let payload = panic_info.payload();
        let msg: String = if let Some(s) = payload.downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = payload.downcast_ref::<String>() {
            s.clone()
        } else if let Some(s) = payload.downcast_ref::<Box<dyn std::any::Any + Send>>() {
            format!("Any: {:?}", s.type_id())
        } else {
            format!("{:?}", payload)
        };

        let location = panic_info
            .location()
            .map(|l| format!("{}:{}", l.file(), l.line()))
            .unwrap_or_else(|| "unknown".to_string());

        // Capture native stack trace (available since Rust 1.65)
        let bt = std::backtrace::Backtrace::force_capture();
        let bt_str = format!("{}", bt);
        let stack_trace = if bt_str.contains("disabled") || bt_str.is_empty() {
            // Backtrace capture may be unavailable on some Windows toolchains
            match std::env::var("RUST_BACKTRACE") {
                Ok(val) if !val.is_empty() && val != "0" => format!("{} (RUST_BACKTRACE={} — native backtrace capture unavailable, using env)", location, val),
                _ => format!("{} (set RUST_BACKTRACE=1 for detailed stack trace)", location),
            }
        } else {
            format!("{}\n\nBacktrace:\n{}", location, bt_str)
        };

        // Try to get OS-level last error for context
        let os_error = std::io::Error::last_os_error();
        let os_error_str = if os_error.raw_os_error().is_some() {
            format!("OS Error: {} (code: {:?})", os_error, os_error.raw_os_error())
        } else {
            "No OS error".to_string()
        };

        let entry = serde_json::json!({
            "message": msg,
            "source": format!("rust_panic:{}", location),
            "stack": stack_trace,
            "os_error": os_error_str,
            "timestamp": Utc::now().to_rfc3339(),
        });

        // Write to app data directory instead of cwd (more reliable across installations)
        let crash_dir = dirs::data_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("."))
            .join("Horizon Tweaks Optimization")
            .join("logs");
        let _ = std::fs::create_dir_all(&crash_dir);
        let crash_path = crash_dir.join(CRASH_LOG_FILE);
        let _ = std::fs::write(&crash_path, serde_json::to_string_pretty(&entry).unwrap_or_default());

        eprintln!("[CRASH] {} at {} | {}", msg, location, os_error_str);
    }));
}

pub async fn send_pending_crash(firebase: &FirebaseClient) {
    // Check both old and new crash log locations
    let crash_dir = dirs::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("Horizon Tweaks Optimization")
        .join("logs");
    let _ = std::fs::create_dir_all(&crash_dir);

    let paths = [
        std::env::current_dir().ok().map(|p| p.join(CRASH_LOG_FILE)),
        Some(crash_dir.join(CRASH_LOG_FILE)),
    ];

    for opt_path in paths.iter().flatten() {
        let content = match std::fs::read_to_string(opt_path) {
            Ok(c) if !c.is_empty() => c,
            _ => continue,
        };
        let val: serde_json::Value = match serde_json::from_str(&content) {
            Ok(v) => v,
            Err(_) => continue,
        };
        let entry = LogEntry {
            id: None,
            user_id: "system".to_string(),
            log_type: "crash".to_string(),
            source: val["source"].as_str().unwrap_or("rust_panic").to_string(),
            message: val["message"].as_str().unwrap_or("Unknown crash").to_string(),
            stack: Some(format!(
                "Stack: {} | OS Error: {}",
                val["stack"].as_str().unwrap_or("N/A"),
                val["os_error"].as_str().unwrap_or("N/A")
            )),
            timestamp: val["timestamp"].as_str().unwrap_or("").to_string(),
        };
        let _ = firebase.write_log(&entry).await;
        let _ = std::fs::write(opt_path, "");
        break; // Only send first found crash
    }
}

#[allow(dead_code)]
pub async fn log_error(
    firebase: &FirebaseClient,
    user_id: &str,
    message: &str,
    source: &str,
    stack: Option<&str>,
) {
    let entry = LogEntry {
        id: None,
        user_id: user_id.to_string(),
        log_type: "error".to_string(),
        source: source.to_string(),
        message: message.to_string(),
        stack: stack.map(|s| s.to_string()),
        timestamp: Utc::now().to_rfc3339(),
    };
    let _ = firebase.write_log(&entry).await;
}

pub async fn log_warning(
    firebase: &FirebaseClient,
    user_id: &str,
    message: &str,
    source: &str,
) {
    let entry = LogEntry {
        id: None,
        user_id: user_id.to_string(),
        log_type: "warning".to_string(),
        source: source.to_string(),
        message: message.to_string(),
        stack: None,
        timestamp: Utc::now().to_rfc3339(),
    };
    let _ = firebase.write_log(&entry).await;
}

pub async fn log_tamper(
    firebase: &FirebaseClient,
    user_id: &str,
    details: &str,
) {
    let entry = LogEntry {
        id: None,
        user_id: user_id.to_string(),
        log_type: "tamper".to_string(),
        source: "backend".to_string(),
        message: details.to_string(),
        stack: None,
        timestamp: Utc::now().to_rfc3339(),
    };
    let _ = firebase.write_log(&entry).await;
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::firebase_client::{FirebaseConfig, FirebaseClient};
    use std::fs;
    use std::env;

    fn make_test_client() -> FirebaseClient {
        let config = FirebaseConfig {
            web_api_key: "test-key".to_string(),
            project_id: "test-project".to_string(),
            service_account_email: String::new(),
            private_key_pem: String::new(),
        };
        FirebaseClient::new(config)
    }

    #[test]
    fn test_crash_log_entry_construction() {
        let entry = serde_json::json!({
            "message": "test panic message",
            "source": "rust_panic:src/main.rs:42",
            "stack": "src/main.rs:42",
            "timestamp": Utc::now().to_rfc3339(),
        });
        assert_eq!(entry["message"], "test panic message");
        assert!(entry["source"].as_str().unwrap().contains("main.rs"));
        assert!(entry["timestamp"].as_str().unwrap().contains("T"));
    }

    #[test]
    fn test_crash_log_entry_minimal() {
        let entry = serde_json::json!({
            "message": "unknown",
            "source": "rust_panic:unknown",
            "stack": "unknown",
            "timestamp": "",
        });
        assert_eq!(entry["message"], "unknown");
        assert_eq!(entry["source"], "rust_panic:unknown");
    }

    #[test]
    fn test_log_entry_types() {
        let types = vec!["error", "warning", "crash", "tamper"];
        for log_type in types {
            let entry = LogEntry {
                id: None,
                user_id: "user1".to_string(),
                log_type: log_type.to_string(),
                source: "test".to_string(),
                message: format!("Test {}", log_type),
                stack: None,
                timestamp: Utc::now().to_rfc3339(),
            };
            assert_eq!(entry.log_type, log_type);
        }
    }

    #[test]
    fn test_crash_log_file_path() {
        let cwd = env::current_dir().unwrap();
        let path = cwd.join(CRASH_LOG_FILE);
        assert!(path.to_string_lossy().contains("crash_log.json"));
    }

    #[test]
    fn test_send_pending_crash_no_file() {
        let client = make_test_client();
        let cwd = env::current_dir().unwrap();
        let path = cwd.join(CRASH_LOG_FILE);
        let existed = path.exists();

        if !existed {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(send_pending_crash(&client));
        }
    }

    #[test]
    fn test_send_pending_crash_empty_file() {
        let client = make_test_client();
        let cwd = env::current_dir().unwrap();
        let path = cwd.join(CRASH_LOG_FILE);
        let existed = path.exists();

        fs::write(&path, "").ok();
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(send_pending_crash(&client));

        if !existed {
            let _ = fs::remove_file(&path);
        }
    }

    #[test]
    fn test_send_pending_crash_invalid_json() {
        let client = make_test_client();
        let cwd = env::current_dir().unwrap();
        let path = cwd.join(CRASH_LOG_FILE);
        let existed = path.exists();

        fs::write(&path, "not-valid-json{{{").ok();
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(send_pending_crash(&client));

        if !existed {
            let _ = fs::remove_file(&path);
        }
    }

    #[test]
    fn test_send_pending_crash_valid_crash() {
        let client = make_test_client();
        let cwd = env::current_dir().unwrap();
        let path = cwd.join(CRASH_LOG_FILE);
        let existed = path.exists();

        let crash = serde_json::json!({
            "message": "test crash",
            "source": "rust_panic:test.rs:10",
            "stack": "test.rs:10",
            "timestamp": Utc::now().to_rfc3339(),
        });
        fs::write(&path, serde_json::to_string(&crash).unwrap()).ok();

        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(send_pending_crash(&client));

        let after = fs::read_to_string(&path).unwrap_or_default();
        assert!(after.is_empty() || !after.contains("test crash"));

        if !existed {
            let _ = fs::remove_file(&path);
        }
    }

    #[test]
    fn test_log_entry_json_format() {
        let entry = LogEntry {
            id: Some("id1".to_string()),
            user_id: "uid".to_string(),
            log_type: "error".to_string(),
            source: "frontend".to_string(),
            message: "Test msg".to_string(),
            stack: Some("Stack trace".to_string()),
            timestamp: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_value(&entry).unwrap();
        assert_eq!(json["user_id"], "uid");
        assert_eq!(json["log_type"], "error");
        assert_eq!(json["source"], "frontend");
        assert_eq!(json["message"], "Test msg");
        assert_eq!(json["stack"], "Stack trace");
    }
}
