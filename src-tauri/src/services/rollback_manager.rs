use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Serialize, Deserialize)]
pub struct Snapshot {
    pub id: String,
    pub tweak_id: String,
    pub created_at: DateTime<Utc>,
    pub registry_files: Vec<String>,
    pub service_state_json: Option<String>,
}

pub struct RollbackManager {
    base_path: PathBuf,
}

impl RollbackManager {
    pub fn new() -> Self {
        let base = dirs::data_dir().unwrap_or_else(|| PathBuf::from(".")).join("Horizon Tweaks Optimization").join("rollback");
        let _ = fs::create_dir_all(&base);
        Self { base_path: base }
    }

    pub fn create_snapshot(&self, tweak_id: &str) -> Result<Snapshot, Box<dyn std::error::Error>> {
        let id = Uuid::new_v4().to_string();
        let snap_dir = self.base_path.join(&id);
        fs::create_dir_all(&snap_dir)?;

        let mut registry_files = vec![];

        if let Ok(engine) = crate::ffi::core_engine::CoreEngine::new() {
            let reg_snap = snap_dir.join("registry.reg").to_string_lossy().to_string();
            let _ = engine.snapshot_registry_key(r"HKLM\SYSTEM\CurrentControlSet\Services", &reg_snap);
            registry_files.push(reg_snap);
        }

        let snap = Snapshot {
            id: id.clone(),
            tweak_id: tweak_id.to_string(),
            created_at: Utc::now(),
            registry_files,
            service_state_json: None,
        };

        let path = snap_dir.join("snapshot.json");
        fs::write(&path, serde_json::to_string_pretty(&snap)?)?;
        Ok(snap)
    }

    pub fn register_applied(&mut self, tweak_id: &str, snap: Snapshot) -> Result<(), Box<dyn std::error::Error>> {
        let index = self.base_path.join("index.json");
        let mut map: HashMap<String, Vec<Snapshot>> = if index.exists() {
            serde_json::from_str(&fs::read_to_string(&index)?)?
        } else {
            HashMap::new()
        };
        
        map.entry(tweak_id.to_string()).or_default().push(snap);
        fs::write(&index, serde_json::to_string_pretty(&map)?)?;
        Ok(())
    }

    #[allow(dead_code)]
    pub fn list_snapshots(&self) -> Result<Vec<String>, Box<dyn std::error::Error>> {
        let index = self.base_path.join("index.json");
        if !index.exists() { return Ok(vec![]); }
        
        let map: HashMap<String, Vec<Snapshot>> = serde_json::from_str(&fs::read_to_string(&index)?)?;
        Ok(map.values().flatten().map(|s| format!("{} | {} | {}", s.id, s.tweak_id, s.created_at)).collect())
    }

    #[allow(dead_code)]
    pub fn rollback(&mut self, tweak_id: &str) -> Result<(), Box<dyn std::error::Error>> {
        let index = self.base_path.join("index.json");
        if !index.exists() { return Ok(()); }

        let mut map: HashMap<String, Vec<Snapshot>> = serde_json::from_str(&fs::read_to_string(&index)?)?;
        if let Some(snapshots) = map.get_mut(tweak_id) {
            if let Some(snap) = snapshots.pop() {
                if let Ok(engine) = crate::ffi::core_engine::CoreEngine::new() {
                    for reg in &snap.registry_files {
                        let _ = engine.restore_registry_key(reg);
                    }
                }
            }
        }

        fs::write(&index, serde_json::to_string_pretty(&map)?)?;
        Ok(())
    }

    #[allow(dead_code)]
    pub fn delete(&mut self, id: &str) -> Result<(), Box<dyn std::error::Error>> {
        let dir = self.base_path.join(id);
        if dir.exists() { fs::remove_dir_all(&dir)?; }
        Ok(())
    }
}

impl Default for RollbackManager {
    fn default() -> Self { Self::new() }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn test_base_path() -> PathBuf {
        std::env::temp_dir().join(format!("summit_test_rollback_{}", Uuid::new_v4()))
    }

    fn make_manager(base: &PathBuf) -> RollbackManager {
        let _ = fs::create_dir_all(base);
        RollbackManager { base_path: base.clone() }
    }

    #[test]
    fn test_snapshot_serialization() {
        let snap = Snapshot {
            id: "snap-123".to_string(),
            tweak_id: "tweak-abc".to_string(),
            created_at: Utc::now(),
            registry_files: vec!["file1.reg".to_string(), "file2.reg".to_string()],
            service_state_json: Some(r#"{"service":"test"}"#.to_string()),
        };
        let json = serde_json::to_string(&snap).unwrap();
        let parsed: Snapshot = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.id, "snap-123");
        assert_eq!(parsed.tweak_id, "tweak-abc");
        assert_eq!(parsed.registry_files.len(), 2);
        assert!(parsed.service_state_json.is_some());
    }

    #[test]
    fn test_snapshot_no_service_state() {
        let snap = Snapshot {
            id: "snap-456".to_string(),
            tweak_id: "tweak-def".to_string(),
            created_at: Utc::now(),
            registry_files: vec![],
            service_state_json: None,
        };
        let json = serde_json::to_string(&snap).unwrap();
        let parsed: Snapshot = serde_json::from_str(&json).unwrap();
        assert!(parsed.service_state_json.is_none());
        assert!(parsed.registry_files.is_empty());
    }

    #[test]
    fn test_rollback_manager_new_creates_dir() {
        let base = test_base_path();
        let mgr = make_manager(&base);
        assert!(base.exists());
        assert_eq!(mgr.base_path, base);
        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn test_register_and_list_snapshots() {
        let base = test_base_path();
        let mut mgr = make_manager(&base);

        let snap = Snapshot {
            id: "snap-1".to_string(),
            tweak_id: "tweak-a".to_string(),
            created_at: Utc::now(),
            registry_files: vec![],
            service_state_json: None,
        };

        mgr.register_applied("tweak-a", snap).unwrap();

        let list = mgr.list_snapshots().unwrap();
        assert_eq!(list.len(), 1);
        assert!(list[0].contains("snap-1"));
        assert!(list[0].contains("tweak-a"));
        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn test_list_snapshots_empty() {
        let base = test_base_path();
        let mgr = make_manager(&base);
        let list = mgr.list_snapshots().unwrap();
        assert!(list.is_empty());
        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn test_register_multiple_snapshots_same_tweak() {
        let base = test_base_path();
        let mut mgr = make_manager(&base);

        for i in 0..3 {
            let snap = Snapshot {
                id: format!("snap-{}", i),
                tweak_id: "tweak-x".to_string(),
                created_at: Utc::now(),
                registry_files: vec![],
                service_state_json: None,
            };
            mgr.register_applied("tweak-x", snap).unwrap();
        }

        let list = mgr.list_snapshots().unwrap();
        assert_eq!(list.len(), 3);
        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn test_delete_snapshot() {
        let base = test_base_path();
        let mut mgr = make_manager(&base);

        let snap = Snapshot {
            id: "snap-del".to_string(),
            tweak_id: "tweak-y".to_string(),
            created_at: Utc::now(),
            registry_files: vec![],
            service_state_json: None,
        };
        mgr.register_applied("tweak-y", snap).unwrap();

        let snap_dir = base.join("snap-del");
        fs::create_dir_all(&snap_dir).unwrap();
        fs::write(snap_dir.join("test.txt"), "data").unwrap();

        mgr.delete("snap-del").unwrap();
        assert!(!snap_dir.exists());
        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn test_delete_nonexistent_is_noop() {
        let base = test_base_path();
        let mut mgr = make_manager(&base);
        mgr.delete("nonexistent").unwrap();
        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn test_rollback_empty_index() {
        let base = test_base_path();
        let mut mgr = make_manager(&base);
        mgr.rollback("nonexistent").unwrap();
        let _ = fs::remove_dir_all(&base);
    }
}
