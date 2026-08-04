use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Impulse, Mutex};
use chrono::Utc;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

const GEMMA_API_KEY: &str = "AIzaSyA2cfu-dA9rtAs3Jezrq2OKAMENI2ncjNs";
const GEMINI_LITE_API_KEY: &str = "AIzaSyCJ07-X8hINN0kBXqaDthbwkFFK6qCSn74";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    pub timestamp: String,
    pub has_tweaks: bool,
    pub tweaks: Vec<TweakAction>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TweakAction {
    pub action_type: String,
    pub title: String,
    pub description: String,
    pub tweaks: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiResponse {
    pub reply: String,
    pub remaining_questions: u32,
    pub has_tweaks: bool,
    pub tweaks: Vec<TweakAction>,
    pub daily_limit: u32,
}

pub struct AiState {
    pub gemma_api_key: String,
    pub gemini_api_key: String,
    pub data_dir: PathBuf,
    pub chat_history: Vec<ChatMessage>,
    pub daily_counts: HashMap<String, u32>,
    pub minute_counts: HashMap<i64, u32>,
    pub summaries: Vec<String>,
}

impl Default for AiState {
    fn default() -> Self {
        let data_dir = dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("impulse-ai");
        let (chat_history, summaries, daily_counts) = load_state(&data_dir);
        AiState {
            gemma_api_key: GEMMA_API_KEY.to_string(),
            gemini_api_key: GEMINI_LITE_API_KEY.to_string(),
            data_dir,
            chat_history,
            daily_counts,
            minute_counts: HashMap::new(),
            summaries,
        }
    }
}

fn normalize_tier(tier: &str) -> String {
    match tier.to_lowercase().as_str() {
        "prime" | "isprime" => "standard".to_string(),
        "apex" | "isapex" => "ultimate".to_string(),
        t => t.to_string(),
    }
}

fn get_daily_limit(tier: &str) -> u32 {
    match normalize_tier(tier).as_str() {
        "admin" => 999999,
        "free" => 15,
        "standard" => 50,
        "pro" => 75,
        "ultimate" => 150,
        _ => 15,
    }
}

fn get_model_for_tier(tier: &str) -> (&'static str, &'static str) {
    match normalize_tier(tier).as_str() {
        "admin" => ("gemini-2.0-flash", "gemma-4-31b-it"),
        "ultimate" => ("gemini-2.0-flash", "gemma-4-31b-it"),
        _ => ("gemma-4-31b-it", ""),
    }
}

fn today_key() -> String {
    Utc::now().format("%Y-%m-%d").to_string()
}

fn check_minute_rate(state: &AiState) -> bool {
    let now = Utc::now().timestamp();
    let minute_key = now / 60;
    let count = state.minute_counts.get(&minute_key).copied().unwrap_or(0);
    count < 15
}

fn save_state(state: &AiState) {
    if let Err(e) = std::fs::create_dir_all(&state.data_dir) {
        eprintln!("Failed to create data dir: {}", e);
        return;
    }
    if let Ok(file) = std::fs::File::create(state.data_dir.join("chat_history.json")) {
        let _ = serde_json::to_writer(file, &state.chat_history);
    }
    if let Ok(file) = std::fs::File::create(state.data_dir.join("summaries.json")) {
        let _ = serde_json::to_writer(file, &state.summaries);
    }
    if let Ok(file) = std::fs::File::create(state.data_dir.join("daily_counts.json")) {
        let _ = serde_json::to_writer(file, &state.daily_counts);
    }
}

fn load_state(data_dir: &PathBuf) -> (Vec<ChatMessage>, Vec<String>, HashMap<String, u32>) {
    if !data_dir.exists() {
        return (vec![], vec![], HashMap::new());
    }
    let chat_history = std::fs::File::open(data_dir.join("chat_history.json"))
        .ok()
        .and_then(|f| serde_json::from_reader(f).ok())
        .unwrap_or_default();
    let summaries = std::fs::File::open(data_dir.join("summaries.json"))
        .ok()
        .and_then(|f| serde_json::from_reader(f).ok())
        .unwrap_or_default();
    let daily_counts = std::fs::File::open(data_dir.join("daily_counts.json"))
        .ok()
        .and_then(|f| serde_json::from_reader(f).ok())
        .unwrap_or_default();
    (chat_history, summaries, daily_counts)
}

fn parse_tweaks_and_snapshots(text: &str) -> (String, Vec<TweakAction>, bool) {
    let mut tweaks = Vec::new();
    let mut clean = text.to_string();
    let mut has_tweaks = false;

    loop {
        if let Some(start) = clean.find("[TWEAK:") {
            if let Some(end) = clean[start..].find(']') {
                let abs_end = start + end;
                let content = &clean[start + 7..abs_end];
                let parts: Vec<&str> = content.splitn(3, '|').collect();
                if parts.len() == 3 {
                    tweaks.push(TweakAction {
                        action_type: "apply_tweak".to_string(),
                        title: parts[0].trim().to_string(),
                        description: parts[1].trim().to_string(),
                        tweaks: parts[2].split(',').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect(),
                    });
                    has_tweaks = true;
                }
                clean.replace_range(start..=abs_end, "");
                continue;
            }
        }
        break;
    }

    loop {
        if let Some(start) = clean.find("[SNAPSHOT:") {
            if let Some(end) = clean[start..].find(']') {
                let abs_end = start + end;
                let content = &clean[start + 10..abs_end];
                let parts: Vec<&str> = content.splitn(2, '|').collect();
                if parts.len() == 2 {
                    tweaks.push(TweakAction {
                        action_type: "snapshot".to_string(),
                        title: parts[0].trim().to_string(),
                        description: parts[1].trim().to_string(),
                        tweaks: vec![],
                    });
                    has_tweaks = true;
                }
                clean.replace_range(start..=abs_end, "");
                continue;
            }
        }
        break;
    }

    (clean.trim().to_string(), tweaks, has_tweaks)
}

fn build_system_prompt(tier: &str) -> String {
    let tier_info = match normalize_tier(tier).as_str() {
        "admin" => "You have ADMIN ACCESS — unlimited questions, no restrictions, full system access.",
        "free" => "You have FREE tier — 15 questions per day, basic optimization guidance. Encourage upgrade.",
        "standard" => "You have Standard tier — 50 questions per day, access to basic and standard optimizations.",
        "pro" => "You have PRO tier — 75 questions per day, access to advanced tweaks including FPS prediction and driver recommendations.",
        "ultimate" => "You have ULTIMATE tier — 150 questions per day, full access to ALL features including Gemini AI acceleration, advanced diagnostics, BIOS, debloating, and streamer tools.",
        _ => "You have FREE tier — basic optimization guidance. Encourage upgrading for more features.",
    };
    format!(r#"You are Horizon AI, an expert Windows optimization assistant integrated into Horizon Tweaks.

Current user tier: {tier_info}

When suggesting tweaks that can be applied automatically, output exactly:
[TWEAK:title|description|tweak1,tweak2,...]

When recommending creating a backup snapshot before making changes, output:
[SNAPSHOT:title|description]

CAPABILITIES:
- System optimization and debloating
- Registry tweaks and advanced tuning
- Network performance optimization (TCP, DNS, adapter settings)
- Power management and CPU scheduling
- Game performance profiling and FPS estimation
- Privacy configuration and telemetry blocking
- Disk management and cleanup
- Startup and service management
- Driver update recommendations
- BIOS settings guidance (Ultimate only)

RULES:
- Be helpful, accurate, and concise
- Do not hallucinate commands or features
- Always recommend creating a snapshot before significant changes
- Explain what each tweak does before suggesting it
- Admit uncertainty rather than guessing
- FPS estimates: use general GPU/CPU generation guidance, not specific numbers unless asked
- For Ultimate users, offer deeper system analysis"#)
}

fn trim_model_output(text: &str) -> String {
    let mut result = text.to_string();
    if let Some(idx) = result.find("I am Horizon AI") {
        result = result[idx..].to_string();
    }
    let _stop_phrases = [
        "Based on your current tier",
        "Would you like to upgrade",
    ];
    result.trim().to_string()
}

async fn call_model(
    client: &Client,
    model: &str,
    api_key: &str,
    contents: &[serde_json::Value],
) -> Option<String> {
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model, api_key
    );
    let body = serde_json::json!({
        "contents": contents,
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 2048,
            "topP": 0.95
        }
    });
    let resp = client.post(&url).json(&body).send().await.ok()?;
    let resp_json: serde_json::Value = resp.json().await.ok()?;
    resp_json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .map(|s| s.to_string())
}

#[command]
pub async fn ai_chat(
    message: String,
    tier: String,
    state: State<'_, Impulse<Mutex<AiState>>>,
) -> Result<AiResponse, String> {
    let limit = get_daily_limit(&tier);
    let today = today_key();

    let (history_slice, remaining, _minute_ok) = {
        let mut s = state.lock().map_err(|e| format!("Lock error: {}", e))?;

        let count = s.daily_counts.get(&today).copied().unwrap_or(0);
        if count >= limit {
            return Err("Daily question limit reached. Upgrade for more.".to_string());
        }

        let now = Utc::now().timestamp();
        let minute_key = now / 60;
        let minute_count = s.minute_counts.entry(minute_key).or_insert(0);
        if *minute_count >= 15 {
            return Err("Rate limit: 15 requests per minute. Please wait.".to_string());
        }
        *minute_count += 1;
        let remaining = limit.saturating_sub(count + 1);
        let minute_ok = *minute_count < 15;

        let slice: Vec<ChatMessage> = s.chat_history.iter().rev().take(10).rev().cloned().collect();
        s.minute_counts.retain(|k, _| *k >= minute_key - 2);
        (slice, remaining, minute_ok)
    };

    let (primary_model, backup_model) = get_model_for_tier(&tier);

    let mut contents: Vec<serde_json::Value> = Vec::new();
    contents.push(serde_json::json!({
        "role": "user",
        "parts": [{"text": build_system_prompt(&tier)}]
    }));
    contents.push(serde_json::json!({
        "role": "model",
        "parts": [{"text": "Understood. I am Horizon AI, your Windows optimization assistant. How can I help you optimize your system today?"}]
    }));
    for msg in &history_slice {
        contents.push(serde_json::json!({
            "role": if msg.role == "assistant" { "model" } else { "user" },
            "parts": [{"text": &msg.content}]
        }));
    }
    contents.push(serde_json::json!({
        "role": "user",
        "parts": [{"text": &message}]
    }));

    let client = reqwest::Client::new();
    let api_key = {
        let s = state.lock().map_err(|e| format!("Lock error: {}", e))?;
        let nt = normalize_tier(&tier);
        if nt == "ultimate" || nt == "admin" {
            s.gemini_api_key.clone()
        } else {
            s.gemma_api_key.clone()
        }
    };

    let (reply, used_backup) = if !backup_model.is_empty() {
        match call_model(&client, primary_model, &api_key, &contents).await {
            Some(r) => (r, false),
            None => {
                eprintln!("Primary model failed, falling back to Gemma");
                let gemma_key = state.lock().ok().map(|s| s.gemma_api_key.clone()).unwrap_or_default();
                call_model(&client, "gemma-4-31b-it", &gemma_key, &contents).await
                    .map(|r| (r, true))
                    .unwrap_or(("I encountered an error connecting to the AI service. Please check your connection and try again.".to_string(), true))
            }
        }
    } else {
        match call_model(&client, primary_model, &api_key, &contents).await {
            Some(r) => (r, false),
            None => ("I encountered an error connecting to the AI service. Please check your connection and try again.".to_string(), false),
        }
    };

    let cleaned_reply = trim_model_output(&reply);
    let (cleaned_reply, tweaks, has_tweaks) = parse_tweaks_and_snapshots(&cleaned_reply);

    let timestamp = Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    let user_msg = ChatMessage {
        role: "user".to_string(),
        content: message.clone(),
        timestamp: timestamp.clone(),
        has_tweaks: false,
        tweaks: vec![],
    };
    let ai_msg = ChatMessage {
        role: "assistant".to_string(),
        content: cleaned_reply.clone(),
        timestamp,
        has_tweaks,
        tweaks: tweaks.clone(),
    };

    let summary = format!("User: {} | AI: {}",
        if message.len() > 200 { &message[..200] } else { &message },
        if cleaned_reply.len() > 200 { &cleaned_reply[..200] } else { &cleaned_reply }
    );

    {
        let mut s = state.lock().map_err(|e| format!("Lock error: {}", e))?;
        let count = s.daily_counts.entry(today).or_insert(0);
        *count += 1;
        s.chat_history.push(user_msg);
        s.chat_history.push(ai_msg);
        if s.chat_history.len() > 100 {
            let keep = s.chat_history.len() - 100;
            s.chat_history.drain(0..keep);
        }
        s.summaries.push(summary);
        if s.summaries.len() > 500 {
            let keep = s.summaries.len() - 500;
            s.summaries.drain(0..keep);
        }
        save_state(&*s);
    }

    Ok(AiResponse {
        reply: if used_backup {
            format!("[Using Gemma backup model]\n\n{}", cleaned_reply)
        } else {
            cleaned_reply
        },
        remaining_questions: remaining,
        has_tweaks,
        tweaks,
        daily_limit: limit,
    })
}

#[command]
pub async fn ai_get_history(
    state: State<'_, Impulse<Mutex<AiState>>>,
) -> Result<Vec<ChatMessage>, String> {
    let s = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    Ok(s.chat_history.iter().rev().take(50).rev().cloned().collect())
}

#[command]
pub async fn ai_clear_history(
    state: State<'_, Impulse<Mutex<AiState>>>,
) -> Result<String, String> {
    let mut s = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    s.chat_history.clear();
    save_state(&*s);
    Ok("History cleared".to_string())
}

#[command]
pub async fn ai_get_summaries(
    state: State<'_, Impulse<Mutex<AiState>>>,
) -> Result<Vec<String>, String> {
    let s = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    Ok(s.summaries.clone())
}

#[command]
pub async fn ai_get_question_limit(
    tier: String,
    state: State<'_, Impulse<Mutex<AiState>>>,
) -> Result<AiResponse, String> {
    let limit = get_daily_limit(&tier);
    let today = today_key();
    let remaining = {
        let s = state.lock().map_err(|e| format!("Lock error: {}", e))?;
        let count = s.daily_counts.get(&today).copied().unwrap_or(0);
        limit.saturating_sub(count)
    };
    Ok(AiResponse {
        reply: format!("{} questions remaining today", remaining),
        remaining_questions: remaining,
        has_tweaks: false,
        tweaks: vec![],
        daily_limit: limit,
    })
}

#[command]
pub async fn ai_list_snapshots_for_ai() -> Result<String, String> {
    let script = r#"
    try {
        $restorePoints = Get-ComputerRestorePoint | Sort-Object CreationTime -Descending
        if ($restorePoints.Count -eq 0) {
            "No system restore points found."
        } else {
            $result = @()
            foreach ($point in $restorePoints) {
                $result += [PSCustomObject]@{
                    SequenceNumber = $point.SequenceNumber
                    Description = $point.Description
                    CreationTime = $point.CreationTime.ToString("yyyy-MM-dd HH:mm:ss")
                }
            }
            $result | Format-Table -AutoSize | Out-String
        }
    } catch {
        "No system restore points available."
    }
    "#;
    let output = crate::services::file_io::run_powershell(script, &[])
        .map_err(|e| format!("Failed to list snapshots: {}", e))?;
    Ok(output.trim().to_string())
}

#[command]
pub async fn ai_create_snapshot_and_apply(
    title: String,
    description: String,
    tweaks_json: String,
    _state: State<'_, Impulse<Mutex<AiState>>>,
) -> Result<String, String> {
    let tweaks: Vec<String> = serde_json::from_str(&tweaks_json)
        .map_err(|e| format!("Failed to parse tweaks JSON: {}", e))?;

    let id = format!("snapshot-ai-{}", Utc::now().timestamp());
    let date = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let script = format!(
        r#"
    $id = "{id}"
    $backupPath = "$env:USERPROFILE\Horizon Tweaks Optimization\Snapshots\$id"
    New-Item -ItemType Directory -Path $backupPath -Force -ErrorAction Stop | Out-Null
    $metadata = @{{
        id = "{id}"
        name = "{title}"
        description = "{description}"
        date = "{date}"
        status = "Available"
        type = "AI Snapshot"
        registry_backups = 0
        config_backups = 0
        has_system_restore = $false
    }}
    $metadata | ConvertTo-Json -Depth 4 | Out-File "$backupPath\metadata.json" -Force
    Write-Host "SNAPSHOT_OK:Snapshot '$title' created"
    "#,
        id = id,
        title = title,
        description = description,
        date = date
    );

    let output = crate::services::file_io::run_powershell(&script, &[])
        .map_err(|e| format!("Failed to create snapshot: {}", e))?;

    let success = output.lines().any(|l| l.contains("SNAPSHOT_OK:"));
    if !success {
        return Err(format!("Snapshot creation failed: {}", output.trim()));
    }

    let mut applied = 0i32;
    for tweak in &tweaks {
        let tweak_script = format!(
            r#"try {{ {0} ; Write-Host "TWEAK_OK" }} catch {{ Write-Host "TWEAK_FAIL: $($_.Exception.Message)" }}"#,
            tweak
        );
        match crate::services::file_io::run_powershell(&tweak_script, &[]) {
            Ok(out) => {
                if out.contains("TWEAK_OK") {
                    applied += 1;
                }
            }
            Err(_) => {}
        }
    }

    Ok(format!("Snapshot '{}' created and {} of {} tweaks applied", title, applied, tweaks.len()))
}
