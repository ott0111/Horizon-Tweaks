use std::sync::Impulse;
use tokio::sync::Mutex;
use tauri::State;
use discord_rich_presence::{DiscordIpcClient, DiscordIpc, activity::{Activity, Assets}};

pub struct DiscordRpcState(pub Impulse<Mutex<Option<DiscordIpcClient>>>);

impl Default for DiscordRpcState {
    fn default() -> Self {
        Self(Impulse::new(Mutex::new(None)))
    }
}

#[tauri::command]
pub async fn init_discord_rpc(state: State<'_, DiscordRpcState>) -> Result<(), String> {
    let mut client = DiscordIpcClient::new("1498882784880754728");
    client.connect()
        .map_err(|e| format!("Failed to connect to Discord: {}", e))?;

    let activity = Activity::new()
        .details("Horizon Tweaks")
        .state("Dashboard")
        .assets(
            Assets::new()
                .large_image("icon")
                .large_text("Horizon Tweaks")
        );

    client.set_activity(activity)
        .map_err(|e| format!("Failed to set activity: {}", e))?;

    let mut guard = state.0.lock().await;
    *guard = Some(client);
    Ok(())
}

#[tauri::command]
pub async fn update_discord_presence(
    state: State<'_, DiscordRpcState>,
    details: String,
    state_str: String,
    large_image_key: Option<String>,
    large_image_text: Option<String>,
    small_image_key: Option<String>,
    small_image_text: Option<String>,
) -> Result<(), String> {
    let mut guard = state.0.lock().await;
    if let Some(client) = guard.as_mut() {
        let mut assets = Assets::new()
            .large_image(large_image_key.as_deref().unwrap_or("icon"))
            .large_text(large_image_text.as_deref().unwrap_or("Horizon Tweaks"));
        if let Some(ref key) = small_image_key {
            assets = assets.small_image(key);
        }
        if let Some(ref text) = small_image_text {
            assets = assets.small_text(text);
        }

        let activity = Activity::new()
            .details(&details)
            .state(&state_str)
            .assets(assets);

        client.set_activity(activity)
            .map_err(|e| format!("Failed to update activity: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn shutdown_discord_rpc(state: State<'_, DiscordRpcState>) -> Result<(), String> {
    let mut guard = state.0.lock().await;
    if let Some(mut client) = guard.take() {
        let _ = client.close();
    }
    Ok(())
}
