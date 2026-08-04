use serde::Serialize;
use tauri::{command, Emitter};
use tokio::sync::broadcast;

#[derive(Clone, Serialize)]
pub struct SystemMetrics {
    pub cpu_percent: f32,
    pub ram_used_gb: f32,
    pub ram_total_gb: f32,
    pub gpu_percent: f32,
    pub gpu_vram_used_gb: f32,
    pub cpu_temp_celsius: f32,
    #[serde(default)]
    pub gpu_temp_celsius: f32,
    pub timestamp_ms: u64,
}

static METRICS_TX: once_cell::sync::OnceCell<broadcast::Sender<SystemMetrics>> = once_cell::sync::OnceCell::new();

pub fn init_metrics_channel() -> broadcast::Sender<SystemMetrics> {
    let (tx, _rx) = broadcast::channel(16);
    METRICS_TX.set(tx.clone()).ok();
    tx
}

pub fn broadcast_metrics(m: SystemMetrics) {
    if let Some(tx) = METRICS_TX.get() {
        let _ = tx.send(m);
    }
}

#[command]
pub fn get_metrics() -> SystemMetrics {
    crate::services::monitor::latest_metrics()
}

#[command]
pub async fn subscribe_metrics(app: tauri::AppHandle) -> Result<(), String> {
    let tx = METRICS_TX.get().cloned().unwrap_or_else(init_metrics_channel);
    let mut rx = tx.subscribe();
    
    tokio::spawn(async move {
        loop {
            match rx.recv().await {
                Ok(m) => {
                    let _ = app.emit("metrics-update", m);
                }
                Err(_) => break,
            }
        }
    });
    
    Ok(())
}
