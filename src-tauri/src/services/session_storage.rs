use std::path::PathBuf;
use directories::ProjectDirs;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersistedSession {
    pub user_id: String,
    pub email: String,
    pub display_name: String,
    pub tier: String,
    pub id_token: String,
    pub refresh_token: String,
}

fn get_session_path() -> Option<PathBuf> {
    ProjectDirs::from("com", "impulse", "Horizon Tweaks")
        .map(|dirs| dirs.data_dir().join("session.json"))
}

pub fn save_session(session: &PersistedSession) -> Result<(), String> {
    let path = get_session_path().ok_or("Failed to determine app data directory")?;
    
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create session directory: {}", e))?;
    }
    
    let json = serde_json::to_string_pretty(session).map_err(|e| format!("Failed to serialize session: {}", e))?;
    std::fs::write(&path, json).map_err(|e| format!("Failed to write session file: {}", e))?;
    Ok(())
}

pub fn load_session() -> Result<PersistedSession, String> {
    let path = get_session_path().ok_or("Failed to determine app data directory")?;
    
    if !path.exists() {
        return Err("No session file found".to_string());
    }
    
    let json = std::fs::read_to_string(&path).map_err(|e| format!("Failed to read session file: {}", e))?;
    let session: PersistedSession = serde_json::from_str(&json).map_err(|e| format!("Failed to parse session file: {}", e))?;
    Ok(session)
}

pub fn clear_session() -> Result<(), String> {
    let path = get_session_path().ok_or("Failed to determine app data directory")?;
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| format!("Failed to remove session file: {}", e))?;
    }
    Ok(())
}

