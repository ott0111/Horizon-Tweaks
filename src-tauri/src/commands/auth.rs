use std::sync::Impulse;

use serde::{Deserialize, Serialize};
use tauri::State;
use tokio::sync::Mutex;

use crate::services::firebase_client::{FirebaseClient, UserProfile};
use crate::services::session_storage::{PersistedSession, save_session, load_session, clear_session};

const ADMIN_EMAILS: &[&str] = &["aayan.b.asim@gmail.com"];

fn tier_for_email(email: &str) -> String {
    if ADMIN_EMAILS.contains(&email) {
        "admin".to_string()
    } else {
        "free".to_string()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSession {
    pub user_id: String,
    pub email: String,
    pub display_name: String,
    pub tier: String,
    pub id_token: String,
    pub refresh_token: String,
}

pub struct AppSession(pub Impulse<Mutex<Option<UserSession>>>);

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub display_name: String,
}

#[derive(Serialize)]
pub struct AuthResult {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session: Option<UserSession>,
}

#[tauri::command]
pub async fn login(
    firebase: State<'_, FirebaseClient>,
    session: State<'_, AppSession>,
    request: LoginRequest,
) -> Result<AuthResult, String> {
    let sign_in = firebase.sign_in(&request.email, &request.password).await?;

    let display_name = sign_in
        .display_name
        .clone()
        .unwrap_or_else(|| request.email.split('@').next().unwrap_or("User").to_string());

    let hardcoded = tier_for_email(&sign_in.email);
    let (mut tier, suspended) = if hardcoded == "admin" {
        ("admin".to_string(), false)
    } else if firebase.has_service_account() {
        match firebase.verify_id_token(&sign_in.id_token).await {
            Ok(u) => (u.tier, u.suspended),
            Err(_) => ("free".to_string(), false),
        }
    } else {
        ("free".to_string(), false)
    };

    // Firestore fallback: if custom claims say "free", check Firestore for the real tier
    if firebase.has_service_account() && tier == "free" {
        if let Ok(user_doc) = firebase.get_user_doc(&sign_in.local_id).await {
            if user_doc.tier != "free" {
                tier = user_doc.tier;
            }
        }
    }

    if suspended {
        return Ok(AuthResult {
            success: false,
            message: "ACCOUNT_SUSPENDED".to_string(),
            session: None,
        });
    }

    // Ensure the user's Firestore doc exists after login with the correct tier
    // Only write if the tier we determined is not "free" (to avoid overwriting a real tier)
    if firebase.has_service_account() && tier != "free" {
        let _ = firebase
            .create_user_doc_with_tier(&sign_in.local_id, &sign_in.email, &display_name, &tier)
            .await;
    }

    let user_session = UserSession {
        user_id: sign_in.local_id.clone(),
        email: sign_in.email.clone(),
        display_name: display_name.clone(),
        tier: tier.clone(),
        id_token: sign_in.id_token.clone(),
        refresh_token: sign_in.refresh_token.clone(),
    };

    *session.0.lock().await = Some(user_session.clone());

    let persisted = PersistedSession {
        user_id: sign_in.local_id.clone(),
        email: sign_in.email.clone(),
        display_name: display_name.clone(),
        tier: tier.clone(),
        id_token: sign_in.id_token.clone(),
        refresh_token: sign_in.refresh_token.clone(),
    };
    let _ = save_session(&persisted);

    Ok(AuthResult {
        success: true,
        message: "Login successful".to_string(),
        session: Some(user_session),
    })
}

#[tauri::command]
pub async fn check_user_suspended(
    firebase: State<'_, FirebaseClient>,
    session: State<'_, AppSession>,
) -> Result<bool, String> {
    let session_guard = session.0.lock().await;
    let user_id = match session_guard.as_ref() {
        Some(s) => s.user_id.clone(),
        None => return Ok(false),
    };
    drop(session_guard);

    if !firebase.has_service_account() {
        return Ok(false);
    }

    match firebase.get_user_custom_claims(&user_id).await {
        Ok(claims) => Ok(claims.get("suspended").and_then(|v| v.as_bool()).unwrap_or(false)),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
pub async fn register(
    firebase: State<'_, FirebaseClient>,
    session: State<'_, AppSession>,
    request: RegisterRequest,
) -> Result<AuthResult, String> {
    let sign_up = firebase.sign_up(&request.email, &request.password).await?;

    let display_name = if request.display_name.trim().is_empty() {
        request
            .email
            .split('@')
            .next()
            .unwrap_or("User")
            .to_string()
    } else {
        request.display_name.clone()
    };

    let hardcoded = tier_for_email(&sign_up.email);
    if firebase.has_service_account() {
        let _ = firebase
            .create_user_doc(&sign_up.local_id, &sign_up.email, &request.display_name)
            .await;
    }
    let user_session = UserSession {
        user_id: sign_up.local_id.clone(),
        email: sign_up.email.clone(),
        display_name: display_name.clone(),
        tier: hardcoded.clone(),
        id_token: sign_up.id_token.clone(),
        refresh_token: sign_up.refresh_token.clone(),
    };

    *session.0.lock().await = Some(user_session.clone());

    let persisted = PersistedSession {
        user_id: sign_up.local_id.clone(),
        email: sign_up.email.clone(),
        display_name: display_name.clone(),
        tier: hardcoded.clone(),
        id_token: sign_up.id_token.clone(),
        refresh_token: sign_up.refresh_token.clone(),
    };
    let _ = save_session(&persisted);

    Ok(AuthResult {
        success: true,
        message: "Registration successful".to_string(),
        session: Some(user_session),
    })
}

#[tauri::command]
pub async fn logout(session: State<'_, AppSession>) -> Result<(), String> {
    *session.0.lock().await = None;
    let _ = clear_session();
    Ok(())
}

#[tauri::command]
pub async fn get_session(session: State<'_, AppSession>) -> Result<Option<UserSession>, String> {
    Ok(session.0.lock().await.clone())
}

#[tauri::command]
pub async fn restore_session(
    firebase: State<'_, FirebaseClient>,
    session: State<'_, AppSession>,
) -> Result<Option<UserSession>, String> {
    let persisted = match load_session() {
        Ok(s) => s,
        Err(_) => return Ok(None),
    };

    let new_tokens = firebase.refresh_id_token(&persisted.refresh_token).await?;

    let (mut tier, suspended) = if firebase.has_service_account() {
        match firebase.verify_id_token(&new_tokens.id_token).await {
            Ok(u) => (u.tier, u.suspended),
            Err(_) => (persisted.tier.clone(), false),
        }
    } else {
        (persisted.tier.clone(), false)
    };

    // Firestore fallback: if custom claims say "free", check Firestore for the real tier
    if firebase.has_service_account() && tier == "free" {
        if let Ok(user_doc) = firebase.get_user_doc(&persisted.user_id).await {
            if user_doc.tier != "free" {
                tier = user_doc.tier;
            }
        }
    }

    if suspended {
        let _ = clear_session();
        return Ok(None);
    }

    let user_session = UserSession {
        user_id: persisted.user_id,
        email: persisted.email,
        display_name: persisted.display_name,
        tier,
        id_token: new_tokens.id_token,
        refresh_token: new_tokens.refresh_token,
    };

    *session.0.lock().await = Some(user_session.clone());

    let updated_persisted = PersistedSession {
        user_id: user_session.user_id.clone(),
        email: user_session.email.clone(),
        display_name: user_session.display_name.clone(),
        tier: user_session.tier.clone(),
        id_token: user_session.id_token.clone(),
        refresh_token: user_session.refresh_token.clone(),
    };
    let _ = save_session(&updated_persisted);

    Ok(Some(user_session))
}

#[tauri::command]
pub async fn get_user_profile(
    firebase: State<'_, FirebaseClient>,
    user_id: String,
) -> Result<UserProfile, String> {
    firebase.get_user_doc(&user_id).await
}

/// Refreshes the user's tier by re-verifying their Firebase token.
/// Call this after a Stripe purchase to detect the new tier.
#[tauri::command]
pub async fn refresh_tier(
    firebase: State<'_, FirebaseClient>,
    session: State<'_, AppSession>,
) -> Result<AuthResult, String> {
    let session_guard = session.0.lock().await;
    let current = match session_guard.as_ref() {
        Some(s) => s.clone(),
        None => {
            return Ok(AuthResult {
                success: false,
                message: "NOT_LOGGED_IN".to_string(),
                session: None,
            });
        }
    };
    drop(session_guard);

    let (mut tier, suspended) = if firebase.has_service_account() {
        match firebase.verify_id_token(&current.id_token).await {
            Ok(u) => (u.tier, u.suspended),
            Err(_) => (current.tier.clone(), false),
        }
    } else {
        (current.tier.clone(), false)
    };

    // Firestore fallback: if custom claims still say "free", check Firestore directly
    // This handles the case where custom claims haven't propagated yet after a purchase
    if firebase.has_service_account() && tier == "free" {
        if let Ok(user_doc) = firebase.get_user_doc(&current.user_id).await {
            if user_doc.tier != "free" {
                tier = user_doc.tier;
            }
        }
    }

    if suspended {
        *session.0.lock().await = None;
        let _ = clear_session();
        return Ok(AuthResult {
            success: false,
            message: "ACCOUNT_SUSPENDED".to_string(),
            session: None,
        });
    }

    let updated = UserSession {
        user_id: current.user_id,
        email: current.email,
        display_name: current.display_name,
        tier: tier.clone(),
        id_token: current.id_token,
        refresh_token: current.refresh_token,
    };
    *session.0.lock().await = Some(updated.clone());

    let persisted = PersistedSession {
        user_id: updated.user_id.clone(),
        email: updated.email.clone(),
        display_name: updated.display_name.clone(),
        tier: updated.tier.clone(),
        id_token: updated.id_token.clone(),
        refresh_token: updated.refresh_token.clone(),
    };
    let _ = save_session(&persisted);

    Ok(AuthResult {
        success: true,
        message: format!("Tier refreshed: {}", tier),
        session: Some(updated),
    })
}

/// Updates the user's display name in Firestore.
#[tauri::command]
pub async fn update_user_profile(
    firebase: State<'_, FirebaseClient>,
    session: State<'_, AppSession>,
    user_id: String,
    display_name: String,
) -> Result<(), String> {
    let session_guard = session.0.lock().await;
    let current = session_guard.as_ref().ok_or("NOT_LOGGED_IN".to_string())?.clone();
    drop(session_guard);

    if current.user_id != user_id {
        return Err("Unauthorized: cannot update another user's profile".to_string());
    }

    if display_name.trim().is_empty() {
        return Err("Display name cannot be empty".to_string());
    }
    if display_name.trim().len() > 32 {
        return Err("Display name must be 32 characters or fewer".to_string());
    }

    if firebase.has_service_account() {
        firebase.update_user_display_name(&user_id, &display_name.trim()).await?;
    }

    // Update the in-memory session
    let mut session_guard = session.0.lock().await;
    if let Some(s) = session_guard.as_mut() {
        s.display_name = display_name.trim().to_string();
    }

    Ok(())
}

/// Opens a checkout URL in the user's default browser.
#[tauri::command]
pub fn open_checkout_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/c", "start", "", &url])
            .spawn()
            .map_err(|e| format!("Failed to open browser: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open browser: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open browser: {}", e))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tier_for_email_admin() {
        assert_eq!(tier_for_email("aayan.b.asim@gmail.com"), "admin");
    }

    #[test]
    fn test_tier_for_email_admin_case_sensitive() {
        assert_eq!(tier_for_email("aayan.b.asim@gmail.com"), "admin");
    }

    #[test]
    fn test_tier_for_email_free() {
        assert_eq!(tier_for_email("random@gmail.com"), "free");
    }

    #[test]
    fn test_tier_for_email_free_empty() {
        assert_eq!(tier_for_email(""), "free");
    }

    #[test]
    fn test_admin_emails_list() {
        assert_eq!(ADMIN_EMAILS.len(), 1);
        assert_eq!(ADMIN_EMAILS[0], "aayan.b.asim@gmail.com");
    }

    #[test]
    fn test_user_session_serialization() {
        let session = UserSession {
            user_id: "uid1".to_string(),
            email: "test@example.com".to_string(),
            display_name: "Test".to_string(),
            tier: "standard".to_string(),
            id_token: "id-token-abc".to_string(),
            refresh_token: "refresh-token-xyz".to_string(),
        };
        let json = serde_json::to_string(&session).unwrap();
        assert!(json.contains("uid1"));
        assert!(json.contains("standard"));
        assert!(json.contains("id-token-abc"));
    }

    #[test]
    fn test_user_session_deserialization() {
        let json = r#"{"user_id":"u1","email":"a@b.com","display_name":"A","tier":"ultimate","id_token":"it","refresh_token":"rt"}"#;
        let session: UserSession = serde_json::from_str(json).unwrap();
        assert_eq!(session.user_id, "u1");
        assert_eq!(session.tier, "ultimate");
        assert_eq!(session.id_token, "it");
    }

    #[test]
    fn test_auth_result_success() {
        let result = AuthResult {
            success: true,
            message: "Logged in".to_string(),
            session: None,
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("true"));
        assert!(json.contains("Logged in"));
        assert!(!json.contains("session"));
    }

    #[test]
    fn test_auth_result_failure() {
        let result = AuthResult {
            success: false,
            message: "Invalid credentials".to_string(),
            session: None,
        };
        assert!(!result.success);
        assert_eq!(result.message, "Invalid credentials");
    }

    #[test]
    fn test_auth_result_with_session() {
        let session = UserSession {
            user_id: "uid1".to_string(),
            email: "a@b.com".to_string(),
            display_name: "A".to_string(),
            tier: "free".to_string(),
            id_token: "it".to_string(),
            refresh_token: "rt".to_string(),
        };
        let result = AuthResult {
            success: true,
            message: "OK".to_string(),
            session: Some(session),
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("session"));
        assert!(json.contains("uid1"));
    }
}
