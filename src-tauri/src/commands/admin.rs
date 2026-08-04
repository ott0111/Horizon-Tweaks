use tauri::State;

use crate::services::firebase_client::{BusinessStats, FeedbackEntry, FirebaseClient, LogEntry, LogFilter, Subscription, UserProfile};

#[tauri::command]
pub async fn admin_get_logs(
    firebase: State<'_, FirebaseClient>,
    log_type: Option<String>,
    source: Option<String>,
    user_id: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<LogEntry>, String> {
    let filter = LogFilter {
        log_type,
        source,
        user_id,
        limit,
    };
    firebase.get_logs(&filter).await
}

#[tauri::command]
pub async fn admin_get_users(
    firebase: State<'_, FirebaseClient>,
) -> Result<Vec<UserProfile>, String> {
    firebase.get_all_users().await
}

#[tauri::command]
pub async fn admin_update_user_tier(
    firebase: State<'_, FirebaseClient>,
    user_id: String,
    tier: String,
) -> Result<(), String> {
    let mut claims = firebase.get_user_custom_claims(&user_id).await?;
    claims["tier"] = serde_json::json!(tier);
    firebase.set_custom_claims(&user_id, &claims).await?;
    firebase.update_user_tier(&user_id, &tier).await
}

#[tauri::command]
pub async fn admin_suspend_user(
    firebase: State<'_, FirebaseClient>,
    user_id: String,
    suspended: bool,
) -> Result<(), String> {
    firebase.update_user_suspended(&user_id, suspended).await
}

#[tauri::command]
pub async fn admin_get_feedback(
    firebase: State<'_, FirebaseClient>,
) -> Result<Vec<FeedbackEntry>, String> {
    firebase.get_feedback().await
}

#[tauri::command]
pub async fn admin_mark_feedback_resolved(
    firebase: State<'_, FirebaseClient>,
    feedback_id: String,
) -> Result<(), String> {
    firebase.mark_feedback_resolved(&feedback_id).await
}

#[tauri::command]
pub async fn admin_get_stats(
    firebase: State<'_, FirebaseClient>,
) -> Result<BusinessStats, String> {
    firebase.get_stats().await
}

#[tauri::command]
pub async fn submit_feedback(
    firebase: State<'_, FirebaseClient>,
    user_id: String,
    subject: String,
    message: String,
    rating: Option<u32>,
) -> Result<(), String> {
    use chrono::Utc;
    let entry = FeedbackEntry {
        id: None,
        user_id,
        subject,
        message,
        rating,
        timestamp: Utc::now().to_rfc3339(),
        resolved: false,
    };
    firebase.write_feedback(&entry).await
}

#[tauri::command]
pub async fn log_frontend_error(
    firebase: State<'_, FirebaseClient>,
    user_id: String,
    message: String,
    source: String,
    stack: Option<String>,
) -> Result<(), String> {
    use chrono::Utc;
    let entry = LogEntry {
        id: None,
        user_id,
        log_type: "error".to_string(),
        source,
        message,
        stack,
        timestamp: Utc::now().to_rfc3339(),
    };
    firebase.write_log(&entry).await
}

// ──────────────────────────────────────────
// Discount Code Admin Commands
// ──────────────────────────────────────────

#[tauri::command]
pub async fn admin_create_discount_code(
    firebase: State<'_, FirebaseClient>,
    code: String,
    discount_percent: u32,
    max_uses: u32,
    description: String,
    created_by: String,
    expires_at: Option<String>,
) -> Result<crate::services::firebase_client::DiscountCode, String> {
    use crate::services::firebase_client::DiscountCode;
    let dc = DiscountCode {
        id: None,
        code,
        discount_percent,
        max_uses,
        current_uses: 0,
        created_by,
        created_at: String::new(),
        expires_at,
        active: true,
        description,
    };
    firebase.create_discount_code(&dc).await
}

#[tauri::command]
pub async fn admin_list_discount_codes(
    firebase: State<'_, FirebaseClient>,
) -> Result<Vec<crate::services::firebase_client::DiscountCode>, String> {
    firebase.list_discount_codes().await
}

#[tauri::command]
pub async fn admin_toggle_discount_code(
    firebase: State<'_, FirebaseClient>,
    code_id: String,
    active: bool,
) -> Result<(), String> {
    firebase.toggle_discount_code(&code_id, active).await
}

#[tauri::command]
pub async fn admin_get_discount_usage(
    firebase: State<'_, FirebaseClient>,
) -> Result<Vec<crate::services::firebase_client::DiscountUsage>, String> {
    firebase.get_discount_usage_report().await
}

#[tauri::command]
pub async fn admin_get_subscriptions(
    firebase: State<'_, FirebaseClient>,
) -> Result<Vec<Subscription>, String> {
    firebase.get_subscriptions().await
}

#[tauri::command]
pub async fn log_frontend_warning(
    firebase: State<'_, FirebaseClient>,
    user_id: String,
    message: String,
    source: String,
) -> Result<(), String> {
    use chrono::Utc;
    let entry = LogEntry {
        id: None,
        user_id,
        log_type: "warning".to_string(),
        source,
        message,
        stack: None,
        timestamp: Utc::now().to_rfc3339(),
    };
    firebase.write_log(&entry).await
}

// ──────────────────────────────────────────
// License Key Admin Commands
// ──────────────────────────────────────────

#[tauri::command]
pub async fn admin_list_license_keys(
    firebase: State<'_, FirebaseClient>,
) -> Result<Vec<serde_json::Value>, String> {
    firebase.list_license_keys().await
}

#[tauri::command]
pub async fn admin_create_license_key_batch(
    firebase: State<'_, FirebaseClient>,
    count: u32,
    tier: String,
    created_by: String,
) -> Result<Vec<serde_json::Value>, String> {
    firebase.create_license_key_batch(count, tier, created_by).await
}

#[tauri::command]
pub async fn admin_reactivate_license_key(
    firebase: State<'_, FirebaseClient>,
    key: String,
) -> Result<(), String> {
    firebase.reactivate_license_key(&key).await
}

#[tauri::command]
pub async fn admin_revoke_license_key(
    firebase: State<'_, FirebaseClient>,
    key: String,
) -> Result<(), String> {
    firebase.revoke_license_key(&key).await
}

#[tauri::command]
pub async fn admin_delete_license_key(
    firebase: State<'_, FirebaseClient>,
    key: String,
) -> Result<(), String> {
    firebase.delete_license_key(&key).await
}

#[tauri::command]
pub async fn admin_delete_user(
    firebase: State<'_, FirebaseClient>,
    user_id: String,
) -> Result<(), String> {
    firebase.delete_user(&user_id).await
}
