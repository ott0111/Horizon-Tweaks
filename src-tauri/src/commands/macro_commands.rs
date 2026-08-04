use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{command, State};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MacroEvent {
    pub event_type: String,
    pub key: Option<String>,
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub duration_ms: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SavedMacro {
    pub id: String,
    pub name: String,
    pub keybind: String,
    pub sequence: Vec<MacroEvent>,
    pub loop_count: u32,
    pub delay_between: u64,
    pub created_at: String,
}

pub struct MacroState {
    pub recording: Mutex<bool>,
    pub recorded_events: Mutex<Vec<MacroEvent>>,
    pub macros: Mutex<Vec<SavedMacro>>,
}

impl Default for MacroState {
    fn default() -> Self {
        Self {
            recording: Mutex::new(false),
            recorded_events: Mutex::new(Vec::new()),
            macros: Mutex::new(Vec::new()),
        }
    }
}

fn get_macros_path() -> std::path::PathBuf {
    let mut path = dirs::data_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    path.push("HorizonTweaks");
    std::fs::create_dir_all(&path).ok();
    path.push("macros.json");
    path
}

fn load_macros_from_disk() -> Vec<SavedMacro> {
    let path = get_macros_path();
    if path.exists() {
        if let Ok(content) = std::fs::read_to_string(&path) {
            if let Ok(macros) = serde_json::from_str::<Vec<SavedMacro>>(&content) {
                return macros;
            }
        }
    }
    Vec::new()
}

fn save_macros_to_disk(macros: &[SavedMacro]) {
    let path = get_macros_path();
    if let Ok(content) = serde_json::to_string_pretty(macros) {
        std::fs::write(path, content).ok();
    }
}

#[command]
pub fn start_macro_recording(state: State<'_, MacroState>) -> Result<(), String> {
    let mut recording = state.recording.lock().map_err(|e| e.to_string())?;
    if *recording {
        return Err("Already recording".into());
    }
    *recording = true;
    let mut events = state.recorded_events.lock().map_err(|e| e.to_string())?;
    events.clear();
    tracing::info!("Macro recording started");
    Ok(())
}

#[command]
pub fn stop_macro_recording(state: State<'_, MacroState>) -> Result<Vec<MacroEvent>, String> {
    let mut recording = state.recording.lock().map_err(|e| e.to_string())?;
    if !*recording {
        return Err("Not recording".into());
    }
    *recording = false;
    let events = state.recorded_events.lock().map_err(|e| e.to_string())?.clone();
    tracing::info!("Macro recording stopped, {} events captured", events.len());
    Ok(events)
}

#[command]
pub fn save_macro(
    name: String,
    keybind: String,
    sequence: Vec<MacroEvent>,
    state: State<'_, MacroState>,
) -> Result<(), String> {
    let mut macros = state.macros.lock().map_err(|e| e.to_string())?;
    let macro_entry = SavedMacro {
        id: name.clone(),
        name: name.clone(),
        keybind,
        sequence,
        loop_count: 1,
        delay_between: 50,
        created_at: chrono::Utc::now().to_rfc3339(),
    };
    if let Some(pos) = macros.iter().position(|m| m.id == name) {
        macros[pos] = macro_entry;
    } else {
        macros.push(macro_entry);
    }
    save_macros_to_disk(&macros);
    Ok(())
}

#[command]
pub fn load_macros(state: State<'_, MacroState>) -> Result<Vec<SavedMacro>, String> {
    let macros = load_macros_from_disk();
    let mut stored = state.macros.lock().map_err(|e| e.to_string())?;
    *stored = macros.clone();
    Ok(macros)
}

#[command]
pub fn play_macro(name: String, state: State<'_, MacroState>) -> Result<(), String> {
    let macros = state.macros.lock().map_err(|e| e.to_string())?;
    let macro_entry = macros
        .iter()
        .find(|m| m.id == name)
        .ok_or_else(|| format!("Macro '{}' not found", name))?;

    let sequence = macro_entry.sequence.clone();
    let loop_count = macro_entry.loop_count;
    let delay_between = macro_entry.delay_between;
    drop(macros);

    for _ in 0..loop_count {
        for event in &sequence {
            match event.event_type.as_str() {
                "key_down" => {
                    if let Some(ref key) = event.key {
                        simulate_key_down(key);
                    }
                }
                "key_up" => {
                    if let Some(ref key) = event.key {
                        simulate_key_up(key);
                    }
                }
                "mouse_down" => {
                    if let (Some(x), Some(y)) = (event.x, event.y) {
                        simulate_mouse_move(x, y);
                        simulate_mouse_down();
                    }
                }
                "mouse_up" => {
                    simulate_mouse_up();
                }
                "mouse_move" => {
                    if let (Some(x), Some(y)) = (event.x, event.y) {
                        simulate_mouse_move(x, y);
                    }
                }
                "wait" => {
                    std::thread::sleep(std::time::Duration::from_millis(event.duration_ms.max(1)));
                }
                _ => {}
            }
            if delay_between > 0 {
                std::thread::sleep(std::time::Duration::from_millis(delay_between));
            }
        }
    }

    Ok(())
}

fn simulate_key_down(key: &str) {
    let lowercase = key.to_lowercase();
    match lowercase.as_str() {
        "ctrl" | "control" => { enigo_send(enigo::Key::Control, true); }
        "alt" => { enigo_send(enigo::Key::Alt, true); }
        "shift" => { enigo_send(enigo::Key::Shift, true); }
        "space" => { enigo_send(enigo::Key::Space, true); }
        "enter" | "return" => { enigo_send(enigo::Key::Return, true); }
        "tab" => { enigo_send(enigo::Key::Tab, true); }
        "escape" | "esc" => { enigo_send(enigo::Key::Escape, true); }
        "backspace" => { enigo_send(enigo::Key::Backspace, true); }
        "delete" => { enigo_send(enigo::Key::Delete, true); }
        "up" => { enigo_send(enigo::Key::UpArrow, true); }
        "down" => { enigo_send(enigo::Key::DownArrow, true); }
        "left" => { enigo_send(enigo::Key::LeftArrow, true); }
        "right" => { enigo_send(enigo::Key::RightArrow, true); }
        "f1" => { enigo_send(enigo::Key::F1, true); }
        "f2" => { enigo_send(enigo::Key::F2, true); }
        "f3" => { enigo_send(enigo::Key::F3, true); }
        "f4" => { enigo_send(enigo::Key::F4, true); }
        "f5" => { enigo_send(enigo::Key::F5, true); }
        "f6" => { enigo_send(enigo::Key::F6, true); }
        "f7" => { enigo_send(enigo::Key::F7, true); }
        "f8" => { enigo_send(enigo::Key::F8, true); }
        "f9" => { enigo_send(enigo::Key::F9, true); }
        "f10" => { enigo_send(enigo::Key::F10, true); }
        "f11" => { enigo_send(enigo::Key::F11, true); }
        "f12" => { enigo_send(enigo::Key::F12, true); }
        _ => {
            if let Some(ch) = key.chars().next() {
                enigo_send(enigo::Key::Unicode(ch), true);
            }
        }
    }
}

fn simulate_key_up(key: &str) {
    let lowercase = key.to_lowercase();
    match lowercase.as_str() {
        "ctrl" | "control" => { enigo_send(enigo::Key::Control, false); }
        "alt" => { enigo_send(enigo::Key::Alt, false); }
        "shift" => { enigo_send(enigo::Key::Shift, false); }
        "space" => { enigo_send(enigo::Key::Space, false); }
        "enter" | "return" => { enigo_send(enigo::Key::Return, false); }
        "tab" => { enigo_send(enigo::Key::Tab, false); }
        "escape" | "esc" => { enigo_send(enigo::Key::Escape, false); }
        "backspace" => { enigo_send(enigo::Key::Backspace, false); }
        "delete" => { enigo_send(enigo::Key::Delete, false); }
        "up" => { enigo_send(enigo::Key::UpArrow, false); }
        "down" => { enigo_send(enigo::Key::DownArrow, false); }
        "left" => { enigo_send(enigo::Key::LeftArrow, false); }
        "right" => { enigo_send(enigo::Key::RightArrow, false); }
        "f1" => { enigo_send(enigo::Key::F1, false); }
        "f2" => { enigo_send(enigo::Key::F2, false); }
        "f3" => { enigo_send(enigo::Key::F3, false); }
        "f4" => { enigo_send(enigo::Key::F4, false); }
        "f5" => { enigo_send(enigo::Key::F5, false); }
        "f6" => { enigo_send(enigo::Key::F6, false); }
        "f7" => { enigo_send(enigo::Key::F7, false); }
        "f8" => { enigo_send(enigo::Key::F8, false); }
        "f9" => { enigo_send(enigo::Key::F9, false); }
        "f10" => { enigo_send(enigo::Key::F10, false); }
        "f11" => { enigo_send(enigo::Key::F11, false); }
        "f12" => { enigo_send(enigo::Key::F12, false); }
        _ => {
            if let Some(ch) = key.chars().next() {
                enigo_send(enigo::Key::Unicode(ch), false);
            }
        }
    }
}

fn enigo_send(key: enigo::Key, down: bool) {
    use enigo::{Direction::*, Enigo, Keyboard, Settings};
    if let Ok(mut enigo) = Enigo::new(&Settings::default()) {
        if down {
            let _ = enigo.key(key, Click);
        } else {
            let _ = enigo.key(key, Release);
        }
    }
}

fn simulate_mouse_move(x: i32, y: i32) {
    use enigo::{Coordinate, Enigo, Mouse, Settings};
    if let Ok(mut enigo) = Enigo::new(&Settings::default()) {
        let _ = enigo.move_mouse(x, y, Coordinate::Abs);
    }
}

fn simulate_mouse_down() {
    use enigo::{Button, Direction::*, Enigo, Mouse, Settings};
    if let Ok(mut enigo) = Enigo::new(&Settings::default()) {
        let _ = enigo.button(Button::Left, Click);
    }
}

fn simulate_mouse_up() {
    use enigo::{Button, Direction::*, Enigo, Mouse, Settings};
    if let Ok(mut enigo) = Enigo::new(&Settings::default()) {
        let _ = enigo.button(Button::Left, Release);
    }
}

#[command]
pub fn delete_macro(name: String, state: State<'_, MacroState>) -> Result<(), String> {
    let mut macros = state.macros.lock().map_err(|e| e.to_string())?;
    macros.retain(|m| m.id != name);
    save_macros_to_disk(&macros);
    Ok(())
}

#[command]
pub fn export_macro(name: String, path: String, state: State<'_, MacroState>) -> Result<(), String> {
    let macros = state.macros.lock().map_err(|e| e.to_string())?;
    let macro_entry = macros
        .iter()
        .find(|m| m.id == name)
        .ok_or_else(|| format!("Macro '{}' not found", name))?;
    let json = serde_json::to_string_pretty(macro_entry).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub fn import_macro(path: String, state: State<'_, MacroState>) -> Result<SavedMacro, String> {
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let macro_entry: SavedMacro = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    let mut macros = state.macros.lock().map_err(|e| e.to_string())?;
    macros.push(macro_entry.clone());
    save_macros_to_disk(&macros);
    Ok(macro_entry)
}
