use std::time::{SystemTime, UNIX_EPOCH};

use jsonwebtoken::{encode, EncodingKey, Header};
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscountCode {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    pub code: String,
    pub discount_percent: u32,
    pub max_uses: u32,
    pub current_uses: u32,
    pub created_by: String,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<String>,
    pub active: bool,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscountUsage {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    pub code: String,
    pub user_id: String,
    pub tier: String,
    pub original_amount: f64,
    pub discount_amount: f64,
    pub final_amount: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subscription_id: Option<String>,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subscription {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    pub uid: String,
    pub tier: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone)]
pub struct FirebaseClient {
    pub web_api_key: String,
    pub project_id: String,
    service_account_email: String,
    private_key_pem: String,
    http: Client,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FirebaseUser {
    pub local_id: String,
    pub email: String,
    pub display_name: Option<String>,
    pub registered: bool,
    pub tier: String,
    pub suspended: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserProfile {
    pub user_id: String,
    pub email: String,
    pub display_name: String,
    pub tier: String,
    pub created_at: String,
    pub suspended: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LogEntry {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    pub user_id: String,
    pub log_type: String,
    pub source: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stack: Option<String>,
    pub timestamp: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FeedbackEntry {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    pub user_id: String,
    pub subject: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rating: Option<u32>,
    pub timestamp: String,
    pub resolved: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BusinessStats {
    pub total_users: u64,
    pub tier_counts: std::collections::HashMap<String, u64>,
    pub total_logs: u64,
    pub total_feedback: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogFilter {
    pub log_type: Option<String>,
    pub source: Option<String>,
    pub user_id: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FirebaseConfig {
    pub web_api_key: String,
    pub project_id: String,
    pub service_account_email: String,
    pub private_key_pem: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct SignInResponse {
    pub id_token: String,
    pub refresh_token: String,
    pub local_id: String,
    pub email: String,
    pub display_name: Option<String>,
    pub registered: Option<bool>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LookupResponse {
    pub users: Vec<LookupUser>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LookupUser {
    pub local_id: String,
    pub email: String,
    pub display_name: Option<String>,
    pub custom_attributes: Option<String>,
}

#[derive(Deserialize)]
#[allow(dead_code)]
struct TokenResponse {
    access_token: String,
    token_type: String,
    expires_in: u64,
}

#[derive(Serialize)]
struct JwtClaims {
    iss: String,
    sub: String,
    aud: String,
    iat: u64,
    exp: u64,
    scope: String,
}

#[derive(Serialize)]
struct FirestoreDocument {
    fields: std::collections::HashMap<String, FirestoreValue>,
}

#[derive(Serialize)]
struct FirestoreValue {
    #[serde(rename = "stringValue", skip_serializing_if = "Option::is_none")]
    string_value: Option<String>,
    #[serde(rename = "integerValue", skip_serializing_if = "Option::is_none")]
    integer_value: Option<String>,
    #[serde(rename = "booleanValue", skip_serializing_if = "Option::is_none")]
    boolean_value: Option<bool>,
    #[serde(rename = "timestampValue", skip_serializing_if = "Option::is_none")]
    timestamp_value: Option<String>,
    #[serde(rename = "doubleValue", skip_serializing_if = "Option::is_none")]
    double_value: Option<f64>,
}

impl FirebaseClient {
    pub fn new(config: FirebaseConfig) -> Self {
        Self {
            web_api_key: config.web_api_key,
            project_id: config.project_id,
            service_account_email: config.service_account_email,
            private_key_pem: config.private_key_pem,
            http: Client::new(),
        }
    }

    pub async fn sign_in(&self, email: &str, password: &str) -> Result<SignInResponse, String> {
        let url = format!(
            "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={}",
            self.web_api_key
        );
        let body = serde_json::json!({
            "email": email,
            "password": password,
            "returnSecureToken": true
        });
        let resp = self
            .http
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Firebase auth request failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Firebase auth error: {}", err_text));
        }
        resp.json::<SignInResponse>()
            .await
            .map_err(|e| format!("Failed to parse sign-in response: {}", e))
    }

    pub async fn sign_up(&self, email: &str, password: &str) -> Result<SignInResponse, String> {
        let url = format!(
            "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={}",
            self.web_api_key
        );
        let body = serde_json::json!({
            "email": email,
            "password": password,
            "returnSecureToken": true
        });
        let resp = self
            .http
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Firebase signup request failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Firebase signup error: {}", err_text));
        }
        resp.json::<SignInResponse>()
            .await
            .map_err(|e| format!("Failed to parse signup response: {}", e))
    }

    fn parse_custom_attributes(custom_attributes: &Option<String>) -> (String, bool) {
        match custom_attributes {
            Some(json_str) => {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(json_str) {
                    let tier = val.get("tier").and_then(|t| t.as_str()).unwrap_or("free").to_string();
                    let suspended = val.get("suspended").and_then(|s| s.as_bool()).unwrap_or(false);
                    (tier, suspended)
                } else {
                    ("free".to_string(), false)
                }
            }
            None => ("free".to_string(), false),
        }
    }

    pub async fn verify_id_token(&self, id_token: &str) -> Result<FirebaseUser, String> {
        let access_token = self.get_access_token().await?;
        let url = format!(
            "https://identitytoolkit.googleapis.com/v1/projects/{}/accounts:lookup",
            self.project_id
        );
        let body = serde_json::json!({ "idToken": id_token });
        let resp = self
            .http
            .post(&url)
            .bearer_auth(&access_token)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Token verification request failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Token verification error: {}", err_text));
        }
        let lookup: LookupResponse = resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse token lookup response: {}", e))?;
        let user = lookup
            .users
            .into_iter()
            .next()
            .ok_or_else(|| "No user found for token".to_string())?;
        let (tier, suspended) = Self::parse_custom_attributes(&user.custom_attributes);
        Ok(FirebaseUser {
            local_id: user.local_id,
            email: user.email,
            display_name: user.display_name,
            registered: true,
            tier,
            suspended,
        })
    }

    pub fn has_service_account(&self) -> bool {
        !self.service_account_email.is_empty() && !self.private_key_pem.is_empty()
    }

    pub async fn get_user_custom_claims(&self, user_id: &str) -> Result<serde_json::Value, String> {
        let token = self.get_access_token().await?;
        let url = format!(
            "https://identitytoolkit.googleapis.com/v1/projects/{}/accounts:lookup",
            self.project_id
        );
        let body = serde_json::json!({ "localId": [user_id] });
        let resp = self.http.post(&url)
            .bearer_auth(&token)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("User lookup failed: {}", e))?;
        if !resp.status().is_success() {
            return Ok(serde_json::json!({}));
        }
        let body: serde_json::Value = resp.json().await.unwrap_or_default();
        let claims_str = body["users"][0]["customAttributes"].as_str().unwrap_or("{}");
        Ok(serde_json::from_str(claims_str).unwrap_or_else(|_| serde_json::json!({})))
    }

    pub async fn set_custom_claims(
        &self,
        local_id: &str,
        claims: &serde_json::Value,
    ) -> Result<(), String> {
        let token = self.get_access_token().await?;
        let url = format!(
            "https://identitytoolkit.googleapis.com/v1/projects/{}/accounts:update",
            self.project_id
        );
        let claims_str =
            serde_json::to_string(claims).map_err(|e| format!("Claims serialization error: {}", e))?;
        let body = serde_json::json!({
            "localId": local_id,
            "customAttributes": claims_str,
        });
        let resp = self
            .http
            .post(&url)
            .bearer_auth(&token)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Custom claims request failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Custom claims error: {}", err_text));
        }
        Ok(())
    }

    async fn get_access_token(&self) -> Result<String, String> {
        if !self.has_service_account() {
            return Err("Firebase service account not configured. Create src-tauri/firebase_config.json with your service account credentials.".to_string());
        }
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| format!("Time error: {}", e))?
            .as_secs();
        let claims = JwtClaims {
            iss: self.service_account_email.clone(),
            sub: self.service_account_email.clone(),
            aud: "https://oauth2.googleapis.com/token".to_string(),
            iat: now,
            exp: now + 3600,
            scope: "https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore".to_string(),
        };

        let cleaned_key = {
            let raw = &self.private_key_pem;
            let mut key = raw.trim().to_string();

            // Strip surrounding quotes
            if (key.starts_with('"') && key.ends_with('"')) ||
               (key.starts_with('\'') && key.ends_with('\'')) {
                let len = key.len();
                key = key[1..len-1].to_string();
            }

            // Normalize escaped newlines that may come from JSON / env vars
            for pattern in &["\\r\\n", "\\r", "\\n"] {
                key = key.replace(pattern, "\n");
            }

            // Normalize CR/LF/CRLF to LF
            key = key.replace("\r\n", "\n").replace("\r", "\n");

            key
        };

        let jwt = encode(
            &Header::new(jsonwebtoken::Algorithm::RS256),
            &claims,
            &EncodingKey::from_rsa_pem(cleaned_key.as_bytes())
                .map_err(|e| format!(
                    "Failed to load private key ({} chars): {}. Ensure firebase_config.json has a valid service account private_key.",
                    cleaned_key.len(),
                    e
                ))?,
        )
        .map_err(|e| format!("JWT signing failed: {}", e))?;

        let params = [
            ("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer"),
            ("assertion", &jwt),
        ];
        let resp = self
            .http
            .post("https://oauth2.googleapis.com/token")
            .form(&params)
            .send()
            .await
            .map_err(|e| format!("OAuth token request failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("OAuth token error: {}", err_text));
        }
        let token_resp: TokenResponse = resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse OAuth token response: {}", e))?;
        Ok(token_resp.access_token)
    }

    fn firestore_base(&self) -> String {
        format!(
            "https://firestore.googleapis.com/v1/projects/{}/databases/(default)/documents",
            self.project_id
        )
    }

    pub async fn create_user_doc(
        &self,
        user_id: &str,
        email: &str,
        display_name: &str,
    ) -> Result<(), String> {
        self.create_user_doc_with_tier(user_id, email, display_name, "free").await
    }

    /// Create/update a user doc with a specific tier value.
    /// Used when we know the user's actual tier (e.g., after login verification).
    pub async fn create_user_doc_with_tier(
        &self,
        user_id: &str,
        email: &str,
        display_name: &str,
        tier: &str,
    ) -> Result<(), String> {
        let token = self.get_access_token().await?;
        let url = format!("{}/users/{}", self.firestore_base(), user_id);
        let now = iso_now();
        let mut fields = std::collections::HashMap::new();
        fields.insert(
            "email".to_string(),
            FirestoreValue {
                string_value: Some(email.to_string()),
                integer_value: None,
                boolean_value: None,
                timestamp_value: None,
                double_value: None,
            },
        );
        fields.insert(
            "displayName".to_string(),
            FirestoreValue {
                string_value: Some(display_name.to_string()),
                integer_value: None,
                boolean_value: None,
                timestamp_value: None,
                double_value: None,
            },
        );
        fields.insert(
            "tier".to_string(),
            FirestoreValue {
                string_value: Some(tier.to_string()),
                integer_value: None,
                boolean_value: None,
                timestamp_value: None,
                double_value: None,
            },
        );
        fields.insert(
            "suspended".to_string(),
            FirestoreValue {
                string_value: None,
                integer_value: None,
                boolean_value: Some(false),
                timestamp_value: None,
                double_value: None,
            },
        );
        fields.insert(
            "createdAt".to_string(),
            FirestoreValue {
                string_value: None,
                integer_value: None,
                boolean_value: None,
                timestamp_value: Some(now.clone()),
                double_value: None,
            },
        );
        fields.insert(
            "updatedAt".to_string(),
            FirestoreValue {
                string_value: None,
                integer_value: None,
                boolean_value: None,
                timestamp_value: Some(now),
                double_value: None,
            },
        );
        let doc = FirestoreDocument { fields };
        let resp = self
            .http
            .patch(&url)
            .bearer_auth(&token)
            .json(&doc)
            .send()
            .await
            .map_err(|e| format!("Firestore create user failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Firestore create user error: {}", err_text));
        }
        Ok(())
    }

    pub async fn get_user_doc(&self, user_id: &str) -> Result<UserProfile, String> {
        let token = self.get_access_token().await?;
        let url = format!("{}/users/{}", self.firestore_base(), user_id);
        let resp = self
            .http
            .get(&url)
            .bearer_auth(&token)
            .send()
            .await
            .map_err(|e| format!("Firestore get user failed: {}", e))?;
        if resp.status().is_success() {
            let body: serde_json::Value = resp
                .json()
                .await
                .map_err(|e| format!("Failed to parse user doc: {}", e))?;
            let fields = &body["fields"];
            let extract = |key: &str| -> String {
                fields[key]["stringValue"].as_str().unwrap_or("").to_string()
            };
            Ok(UserProfile {
                user_id: user_id.to_string(),
                email: extract("email"),
                display_name: extract("displayName"),
                tier: extract("tier"),
                created_at: fields["createdAt"]["timestampValue"]
                    .as_str()
                    .unwrap_or("")
                    .to_string(),
                suspended: fields["suspended"]["booleanValue"].as_bool().unwrap_or(false),
            })
        } else if resp.status().as_u16() == 404 {
            Err("User not found".to_string())
        } else {
            let err_text = resp.text().await.unwrap_or_default();
            Err(format!("Firestore get user error: {}", err_text))
        }
    }

    pub async fn update_user_display_name(&self, user_id: &str, display_name: &str) -> Result<(), String> {
        let token = self.get_access_token().await?;
        let url = format!(
            "{}/users/{}?updateMask.fieldPaths=displayName&updateMask.fieldPaths=updatedAt",
            self.firestore_base(),
            user_id
        );
        let mut fields = std::collections::HashMap::new();
        fields.insert(
            "displayName".to_string(),
            FirestoreValue {
                string_value: Some(display_name.to_string()),
                integer_value: None,
                boolean_value: None,
                timestamp_value: None,
                double_value: None,
            },
        );
        fields.insert(
            "updatedAt".to_string(),
            FirestoreValue {
                string_value: None,
                integer_value: None,
                boolean_value: None,
                timestamp_value: Some(iso_now()),
                double_value: None,
            },
        );
        let doc = FirestoreDocument { fields };
        let resp = self
            .http
            .patch(&url)
            .bearer_auth(&token)
            .json(&doc)
            .send()
            .await
            .map_err(|e| format!("Firestore update display name failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Firestore update display name error: {}", err_text));
        }
        Ok(())
    }

    pub async fn update_user_tier(&self, user_id: &str, tier: &str) -> Result<(), String> {
        let token = self.get_access_token().await?;
        let url = format!(
            "{}/users/{}?updateMask.fieldPaths=tier&updateMask.fieldPaths=updatedAt",
            self.firestore_base(),
            user_id
        );
        let mut fields = std::collections::HashMap::new();
        fields.insert(
            "tier".to_string(),
            FirestoreValue {
                string_value: Some(tier.to_string()),
                integer_value: None,
                boolean_value: None,
                timestamp_value: None,
                double_value: None,
            },
        );
        fields.insert(
            "updatedAt".to_string(),
            FirestoreValue {
                string_value: None,
                integer_value: None,
                boolean_value: None,
                timestamp_value: Some(iso_now()),
                double_value: None,
            },
        );
        let doc = FirestoreDocument { fields };
        let resp = self
            .http
            .patch(&url)
            .bearer_auth(&token)
            .json(&doc)
            .send()
            .await
            .map_err(|e| format!("Firestore update tier failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Firestore update tier error: {}", err_text));
        }
        Ok(())
    }

    pub async fn update_user_suspended(&self, user_id: &str, suspended: bool) -> Result<(), String> {
        let mut claims = self.get_user_custom_claims(user_id).await?;
        claims["suspended"] = serde_json::json!(suspended);
        self.set_custom_claims(user_id, &claims).await?;

        let token = self.get_access_token().await?;
        let url = format!(
            "{}/users/{}?updateMask.fieldPaths=suspended&updateMask.fieldPaths=updatedAt",
            self.firestore_base(),
            user_id
        );
        let mut fields = std::collections::HashMap::new();
        fields.insert(
            "suspended".to_string(),
            FirestoreValue {
                string_value: None,
                integer_value: None,
                boolean_value: Some(suspended),
                timestamp_value: None,
                double_value: None,
            },
        );
        fields.insert(
            "updatedAt".to_string(),
            FirestoreValue {
                string_value: None,
                integer_value: None,
                boolean_value: None,
                timestamp_value: Some(iso_now()),
                double_value: None,
            },
        );
        let doc = FirestoreDocument { fields };
        let resp = self
            .http
            .patch(&url)
            .bearer_auth(&token)
            .json(&doc)
            .send()
            .await
            .map_err(|e| format!("Firestore update suspended failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Firestore update suspended error: {}", err_text));
        }
        Ok(())
    }

    pub async fn get_all_users(&self) -> Result<Vec<UserProfile>, String> {
        let token = self.get_access_token().await?;
        let url = format!(
            "https://identitytoolkit.googleapis.com/v1/projects/{}/accounts:query",
            self.project_id
        );
        let body = serde_json::json!({
            "returnUserInfo": true,
            "maxResults": 500,
        });
        let resp = self
            .http
            .post(&url)
            .bearer_auth(&token)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Auth list users request failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Auth list users error: {}", err_text));
        }
        let body: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse auth users list: {}", e))?;
        let accounts = body["userInfo"].as_array().cloned().unwrap_or_default();
        let users = accounts
            .into_iter()
            .filter_map(|acct| {
                let user_id = acct["localId"].as_str().unwrap_or("").to_string();
                if user_id.is_empty() {
                    return None;
                }
                let attrs = acct["customAttributes"]
                    .as_str()
                    .and_then(|s| serde_json::from_str::<serde_json::Value>(s).ok());
                let tier = attrs.as_ref()
                    .and_then(|v| v["tier"].as_str().map(String::from))
                    .unwrap_or_else(|| "free".to_string());
                let suspended = attrs.as_ref()
                    .and_then(|v| v["suspended"].as_bool())
                    .unwrap_or(false);
                let created_at_ms = acct["createdAt"].as_str().unwrap_or("0");
                let created_at = if created_at_ms.len() >= 10 {
                    let secs = &created_at_ms[..10];
                    // Convert from ms timestamp to ISO string
                    let naive = chrono::DateTime::from_timestamp(secs.parse::<i64>().unwrap_or(0), 0)
                        .map(|dt| dt.to_rfc3339())
                        .unwrap_or_default();
                    naive
                } else {
                    String::new()
                };
                Some(UserProfile {
                    user_id,
                    email: acct["email"].as_str().unwrap_or("").to_string(),
                    display_name: acct["displayName"].as_str().unwrap_or("").to_string(),
                    tier,
                    created_at,
                    suspended,
                })
            })
            .collect();
        Ok(users)
    }

    pub async fn get_stats(&self) -> Result<BusinessStats, String> {
        let users = self.get_all_users().await?;
        let total_users = users.len() as u64;
        let mut tier_counts = std::collections::HashMap::new();
        for u in &users {
            *tier_counts.entry(u.tier.clone()).or_insert(0) += 1;
        }
        Ok(BusinessStats {
            total_users,
            tier_counts,
            total_logs: 0,
            total_feedback: 0,
        })
    }

    pub async fn write_log(&self, entry: &LogEntry) -> Result<(), String> {
        let token = self.get_access_token().await?;
        let url = format!("{}/error_logs", self.firestore_base());
        let mut fields = std::collections::HashMap::new();
        fields.insert(
            "userId".to_string(),
            FirestoreValue {
                string_value: Some(entry.user_id.clone()),
                integer_value: None,
                boolean_value: None,
                timestamp_value: None,
                double_value: None,
            },
        );
        fields.insert(
            "logType".to_string(),
            FirestoreValue {
                string_value: Some(entry.log_type.clone()),
                integer_value: None,
                boolean_value: None,
                timestamp_value: None,
                double_value: None,
            },
        );
        fields.insert(
            "source".to_string(),
            FirestoreValue {
                string_value: Some(entry.source.clone()),
                integer_value: None,
                boolean_value: None,
                timestamp_value: None,
                double_value: None,
            },
        );
        fields.insert(
            "message".to_string(),
            FirestoreValue {
                string_value: Some(entry.message.clone()),
                integer_value: None,
                boolean_value: None,
                timestamp_value: None,
                double_value: None,
            },
        );
        if let Some(stack) = &entry.stack {
            fields.insert(
                "stack".to_string(),
                FirestoreValue {
                    string_value: Some(stack.clone()),
                    integer_value: None,
                    boolean_value: None,
                    timestamp_value: None,
                    double_value: None,
                },
            );
        }
        fields.insert(
            "timestamp".to_string(),
            FirestoreValue {
                string_value: Some(entry.timestamp.clone()),
                integer_value: None,
                boolean_value: None,
                timestamp_value: None,
                double_value: None,
            },
        );
        let doc = FirestoreDocument { fields };
        let resp = self
            .http
            .post(&url)
            .bearer_auth(&token)
            .json(&doc)
            .send()
            .await
            .map_err(|e| format!("Firestore write log failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Firestore write log error: {}", err_text));
        }
        Ok(())
    }

    pub async fn get_logs(&self, filter: &LogFilter) -> Result<Vec<LogEntry>, String> {
        let token = self.get_access_token().await?;
        let has_filters = filter.log_type.is_some() || filter.source.is_some() || filter.user_id.is_some();

        let body: serde_json::Value = if has_filters {
            let url = format!("{}/runQuery", self.firestore_base());
            let mut structured_query = serde_json::json!({
                "structuredQuery": {
                    "from": [{ "collectionId": "error_logs" }],
                    "orderBy": [{ "field": { "fieldPath": "timestamp" }, "direction": "DESCENDING" }],
                    "limit": filter.limit.unwrap_or(200) as u64
                }
            });
            let mut filters_arr = vec![];
            if let Some(ref lt) = filter.log_type {
                filters_arr.push(serde_json::json!({
                    "fieldFilter": {
                        "field": { "fieldPath": "logType" },
                        "op": "EQUAL",
                        "value": { "stringValue": lt }
                    }
                }));
            }
            if let Some(ref src) = filter.source {
                filters_arr.push(serde_json::json!({
                    "fieldFilter": {
                        "field": { "fieldPath": "source" },
                        "op": "EQUAL",
                        "value": { "stringValue": src }
                    }
                }));
            }
            if let Some(ref uid) = filter.user_id {
                filters_arr.push(serde_json::json!({
                    "fieldFilter": {
                        "field": { "fieldPath": "userId" },
                        "op": "EQUAL",
                        "value": { "stringValue": uid }
                    }
                }));
            }
            if !filters_arr.is_empty() {
                structured_query["structuredQuery"]["where"] = if filters_arr.len() == 1 {
                    filters_arr.into_iter().next().unwrap()
                } else {
                    serde_json::json!({
                        "compositeFilter": {
                            "op": "AND",
                            "filters": filters_arr
                        }
                    })
                };
            }
            let resp = self.http.post(&url)
                .bearer_auth(&token)
                .json(&structured_query)
                .send()
                .await
                .map_err(|e| format!("Firestore runQuery failed: {}", e))?;
            if !resp.status().is_success() {
                let err_text = resp.text().await.unwrap_or_default();
                return Err(format!("Firestore runQuery error: {}", err_text));
            }
            resp.json().await.map_err(|e| format!("Failed to parse runQuery response: {}", e))?
        } else {
            let url = format!("{}/error_logs?orderBy=timestamp%20DESC&pageSize={}", self.firestore_base(), filter.limit.unwrap_or(200));
            let resp = self.http.get(&url)
                .bearer_auth(&token)
                .send()
                .await
                .map_err(|e| format!("Firestore get logs failed: {}", e))?;
            if !resp.status().is_success() {
                let err_text = resp.text().await.unwrap_or_default();
                return Err(format!("Firestore get logs error: {}", err_text));
            }
            resp.json().await.map_err(|e| format!("Failed to parse logs: {}", e))?
        };

        let docs = if has_filters {
            body.as_array().cloned().unwrap_or_default()
                .into_iter()
                .filter_map(|item| item.get("document").cloned())
                .collect::<Vec<_>>()
        } else {
            body["documents"].as_array().cloned().unwrap_or_default()
        };

        let logs = docs
            .into_iter()
            .filter_map(|doc| {
                let fields = &doc["fields"];
                let name = doc["name"].as_str().unwrap_or("");
                let id = name.rsplit('/').next().map(|s| s.to_string());
                let get = |key: &str| -> String {
                    fields[key]["stringValue"].as_str().unwrap_or("").to_string()
                };
                Some(LogEntry {
                    id,
                    user_id: get("userId"),
                    log_type: get("logType"),
                    source: get("source"),
                    message: get("message"),
                    stack: {
                        let s = get("stack");
                        if s.is_empty() { None } else { Some(s) }
                    },
                    timestamp: get("timestamp"),
                })
            })
            .collect();
        Ok(logs)
    }

    pub async fn write_feedback(&self, feedback: &FeedbackEntry) -> Result<(), String> {
        let token = self.get_access_token().await?;
        let url = format!("{}/feedback", self.firestore_base());
        let mut fields = std::collections::HashMap::new();
        fields.insert(
            "userId".to_string(),
            FirestoreValue {
                string_value: Some(feedback.user_id.clone()),
                integer_value: None,
                boolean_value: None,
                timestamp_value: None,
                double_value: None,
            },
        );
        fields.insert(
            "subject".to_string(),
            FirestoreValue {
                string_value: Some(feedback.subject.clone()),
                integer_value: None,
                boolean_value: None,
                timestamp_value: None,
                double_value: None,
            },
        );
        fields.insert(
            "message".to_string(),
            FirestoreValue {
                string_value: Some(feedback.message.clone()),
                integer_value: None,
                boolean_value: None,
                timestamp_value: None,
                double_value: None,
            },
        );
        if let Some(rating) = feedback.rating {
            fields.insert(
                "rating".to_string(),
                FirestoreValue {
                    string_value: None,
                    integer_value: Some(rating.to_string()),
                    boolean_value: None,
                    timestamp_value: None,
                    double_value: None,
                },
            );
        }
        fields.insert(
            "timestamp".to_string(),
            FirestoreValue {
                string_value: None,
                integer_value: None,
                boolean_value: None,
                timestamp_value: Some(feedback.timestamp.clone()),
                double_value: None,
            },
        );
        fields.insert(
            "resolved".to_string(),
            FirestoreValue {
                string_value: None,
                integer_value: None,
                boolean_value: Some(false),
                timestamp_value: None,
                double_value: None,
            },
        );
        let doc = FirestoreDocument { fields };
        let resp = self
            .http
            .post(&url)
            .bearer_auth(&token)
            .json(&doc)
            .send()
            .await
            .map_err(|e| format!("Firestore write feedback failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Firestore write feedback error: {}", err_text));
        }
        Ok(())
    }

    pub async fn get_feedback(&self) -> Result<Vec<FeedbackEntry>, String> {
        let token = self.get_access_token().await?;
        let url = format!("{}/feedback", self.firestore_base());
        let resp = self
            .http
            .get(&url)
            .bearer_auth(&token)
            .send()
            .await
            .map_err(|e| format!("Firestore get feedback failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Firestore get feedback error: {}", err_text));
        }
        let body: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse feedback: {}", e))?;
        let docs = body["documents"].as_array().cloned().unwrap_or_default();
        let feedback_list = docs
            .into_iter()
            .filter_map(|doc| {
                let fields = &doc["fields"];
                let name = doc["name"].as_str().unwrap_or("");
                let id = name.rsplit('/').next().map(|s| s.to_string());
                let get = |key: &str| -> String {
                    fields[key]["stringValue"].as_str().unwrap_or("").to_string()
                };
                Some(FeedbackEntry {
                    id,
                    user_id: get("userId"),
                    subject: get("subject"),
                    message: get("message"),
                    rating: fields["rating"]["integerValue"]
                        .as_str()
                        .and_then(|s| s.parse().ok()),
                    timestamp: get("timestamp"),
                    resolved: fields["resolved"]["booleanValue"].as_bool().unwrap_or(false),
                })
            })
            .collect();
        Ok(feedback_list)
    }

    pub async fn mark_feedback_resolved(&self, feedback_id: &str) -> Result<(), String> {
        let token = self.get_access_token().await?;
        let url = format!(
            "{}/feedback/{}?updateMask.fieldPaths=resolved",
            self.firestore_base(),
            feedback_id
        );
        let mut fields = std::collections::HashMap::new();
        fields.insert(
            "resolved".to_string(),
            FirestoreValue {
                string_value: None,
                integer_value: None,
                boolean_value: Some(true),
                timestamp_value: None,
                double_value: None,
            },
        );
        let doc = FirestoreDocument { fields };
        let resp = self
            .http
            .patch(&url)
            .bearer_auth(&token)
            .json(&doc)
            .send()
            .await
            .map_err(|e| format!("Firestore resolve feedback failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Firestore resolve feedback error: {}", err_text));
        }
        Ok(())
    }

    // ──────────────────────────────────────────
    // Discount Code Methods
    // ──────────────────────────────────────────

    pub async fn create_discount_code(&self, code: &DiscountCode) -> Result<DiscountCode, String> {
        let token = self.get_access_token().await?;
        let url = format!("{}/discount_codes", self.firestore_base());
        let now = iso_now();
        let mut fields = std::collections::HashMap::new();
        fields.insert("code".to_string(), FirestoreValue { string_value: Some(code.code.clone()), integer_value: None, boolean_value: None, timestamp_value: None, double_value: None });
        fields.insert("discountPercent".to_string(), FirestoreValue { string_value: None, integer_value: Some(code.discount_percent.to_string()), boolean_value: None, timestamp_value: None, double_value: None });
        fields.insert("maxUses".to_string(), FirestoreValue { string_value: None, integer_value: Some(code.max_uses.to_string()), boolean_value: None, timestamp_value: None, double_value: None });
        fields.insert("currentUses".to_string(), FirestoreValue { string_value: None, integer_value: Some("0".to_string()), boolean_value: None, timestamp_value: None, double_value: None });
        fields.insert("createdBy".to_string(), FirestoreValue { string_value: Some(code.created_by.clone()), integer_value: None, boolean_value: None, timestamp_value: None, double_value: None });
        fields.insert("createdAt".to_string(), FirestoreValue { string_value: None, integer_value: None, boolean_value: None, timestamp_value: Some(now.clone()), double_value: None });
        if let Some(ref expires) = code.expires_at {
            fields.insert("expiresAt".to_string(), FirestoreValue { string_value: None, integer_value: None, boolean_value: None, timestamp_value: Some(expires.clone()), double_value: None });
        }
        fields.insert("active".to_string(), FirestoreValue { string_value: None, integer_value: None, boolean_value: Some(true), timestamp_value: None, double_value: None });
        fields.insert("description".to_string(), FirestoreValue { string_value: Some(code.description.clone()), integer_value: None, boolean_value: None, timestamp_value: None, double_value: None });
        let doc = FirestoreDocument { fields };
        let resp = self.http.post(&url).bearer_auth(&token).json(&doc).send().await
            .map_err(|e| format!("Firestore create discount code failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Firestore create discount code error: {}", err_text));
        }
        let body: serde_json::Value = resp.json().await.map_err(|e| format!("Failed to parse created discount code: {}", e))?;
        let name = body["name"].as_str().unwrap_or("");
        let doc_id = name.rsplit('/').next().unwrap_or("").to_string();
        let mut result = code.clone();
        result.id = Some(doc_id);
        result.created_at = now;
        result.current_uses = 0;
        Ok(result)
    }

    pub async fn list_discount_codes(&self) -> Result<Vec<DiscountCode>, String> {
        let token = self.get_access_token().await?;
        let url = format!("{}/discount_codes", self.firestore_base());
        let resp = self.http.get(&url).bearer_auth(&token).send().await
            .map_err(|e| format!("Firestore list discount codes failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Firestore list discount codes error: {}", err_text));
        }
        let body: serde_json::Value = resp.json().await.map_err(|e| format!("Failed to parse discount codes: {}", e))?;
        let docs = body["documents"].as_array().cloned().unwrap_or_default();
        let codes = docs.into_iter().filter_map(|doc| {
            let fields = &doc["fields"];
            let name = doc["name"].as_str().unwrap_or("");
            let doc_id = name.rsplit('/').next().map(|s| s.to_string());
            let get_string = |key: &str| -> String { fields[key]["stringValue"].as_str().unwrap_or("").to_string() };
            let get_int = |key: &str| -> u32 { fields[key]["integerValue"].as_str().and_then(|s| s.parse().ok()).unwrap_or(0) };
            let get_bool = |key: &str| -> bool { fields[key]["booleanValue"].as_bool().unwrap_or(false) };
            let get_ts = |key: &str| -> Option<String> { fields.get(key).and_then(|v| v["timestampValue"].as_str().map(|s| s.to_string())) };
            Some(DiscountCode {
                id: doc_id,
                code: get_string("code"),
                discount_percent: get_int("discountPercent"),
                max_uses: get_int("maxUses"),
                current_uses: get_int("currentUses"),
                created_by: get_string("createdBy"),
                created_at: get_ts("createdAt").unwrap_or_default(),
                expires_at: get_ts("expiresAt"),
                active: get_bool("active"),
                description: get_string("description"),
            })
        }).collect();
        Ok(codes)
    }

    #[allow(dead_code)]
    pub async fn validate_discount_code(&self, code_str: &str) -> Result<DiscountCode, String> {
        let codes = self.list_discount_codes().await?;
        let code = codes.into_iter().find(|c| c.code.to_uppercase() == code_str.to_uppercase())
            .ok_or_else(|| format!("Discount code '{}' not found", code_str))?;
        if !code.active {
            return Err(format!("Discount code '{}' is no longer active", code_str));
        }
        if code.current_uses >= code.max_uses {
            return Err(format!("Discount code '{}' has reached its maximum uses ({}/{})", code_str, code.current_uses, code.max_uses));
        }
        if let Some(ref expires) = code.expires_at {
            use chrono::Utc;
            if let Ok(exp) = chrono::DateTime::parse_from_rfc3339(expires) {
                if Utc::now() > exp.with_timezone(&Utc) {
                    return Err(format!("Discount code '{}' has expired", code_str));
                }
            }
        }
        Ok(code)
    }

    #[allow(dead_code)]
    pub async fn use_discount_code(&self, code_str: &str) -> Result<(), String> {
        let codes = self.list_discount_codes().await?;
        let code = codes.into_iter().find(|c| c.code.to_uppercase() == code_str.to_uppercase())
            .ok_or_else(|| format!("Discount code '{}' not found", code_str))?;
        let code_id = code.id.clone().ok_or("Missing discount code ID")?;
        let token = self.get_access_token().await?;
        let new_uses = code.current_uses + 1;
        let url = format!(
            "{}/discount_codes/{}?updateMask.fieldPaths=currentUses&updateMask.fieldPaths=updatedAt",
            self.firestore_base(), code_id
        );
        let mut fields = std::collections::HashMap::new();
        fields.insert("currentUses".to_string(), FirestoreValue {
            string_value: None, integer_value: Some(new_uses.to_string()), boolean_value: None, timestamp_value: None, double_value: None
        });
        fields.insert("updatedAt".to_string(), FirestoreValue {
            string_value: None, integer_value: None, boolean_value: None, timestamp_value: Some(iso_now()), double_value: None
        });
        let doc = FirestoreDocument { fields };
        let resp = self.http.patch(&url).bearer_auth(&token).json(&doc).send().await
            .map_err(|e| format!("Firestore update discount code uses failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Firestore update discount code uses error: {}", err_text));
        }
        Ok(())
    }

    #[allow(dead_code)]
    pub async fn record_discount_usage(&self, usage: &DiscountUsage) -> Result<(), String> {
        let token = self.get_access_token().await?;
        let url = format!("{}/discount_usage", self.firestore_base());
        let mut fields = std::collections::HashMap::new();
        fields.insert("code".to_string(), FirestoreValue { string_value: Some(usage.code.clone()), integer_value: None, boolean_value: None, timestamp_value: None, double_value: None });
        fields.insert("userId".to_string(), FirestoreValue { string_value: Some(usage.user_id.clone()), integer_value: None, boolean_value: None, timestamp_value: None, double_value: None });
        fields.insert("tier".to_string(), FirestoreValue { string_value: Some(usage.tier.clone()), integer_value: None, boolean_value: None, timestamp_value: None, double_value: None });
        fields.insert("originalAmount".to_string(), FirestoreValue { string_value: None, integer_value: None, boolean_value: None, timestamp_value: None, double_value: Some(usage.original_amount) });
        fields.insert("discountAmount".to_string(), FirestoreValue { string_value: None, integer_value: None, boolean_value: None, timestamp_value: None, double_value: Some(usage.discount_amount) });
        fields.insert("finalAmount".to_string(), FirestoreValue { string_value: None, integer_value: None, boolean_value: None, timestamp_value: None, double_value: Some(usage.final_amount) });
        if let Some(ref sub_id) = usage.subscription_id {
            fields.insert("subscriptionId".to_string(), FirestoreValue { string_value: Some(sub_id.clone()), integer_value: None, boolean_value: None, timestamp_value: None, double_value: None });
        }
        fields.insert("timestamp".to_string(), FirestoreValue { string_value: None, integer_value: None, boolean_value: None, timestamp_value: Some(iso_now()), double_value: None });
        let doc = FirestoreDocument { fields };
        let resp = self.http.post(&url).bearer_auth(&token).json(&doc).send().await
            .map_err(|e| format!("Firestore record discount usage failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Firestore record discount usage error: {}", err_text));
        }
        Ok(())
    }

    pub async fn toggle_discount_code(&self, code_id: &str, active: bool) -> Result<(), String> {
        let token = self.get_access_token().await?;
        let url = format!(
            "{}/discount_codes/{}?updateMask.fieldPaths=active&updateMask.fieldPaths=updatedAt",
            self.firestore_base(), code_id
        );
        let mut fields = std::collections::HashMap::new();
        fields.insert("active".to_string(), FirestoreValue { string_value: None, integer_value: None, boolean_value: Some(active), timestamp_value: None, double_value: None });
        fields.insert("updatedAt".to_string(), FirestoreValue { string_value: None, integer_value: None, boolean_value: None, timestamp_value: Some(iso_now()), double_value: None });
        let doc = FirestoreDocument { fields };
        let resp = self.http.patch(&url).bearer_auth(&token).json(&doc).send().await
            .map_err(|e| format!("Firestore toggle discount code failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Firestore toggle discount code error: {}", err_text));
        }
        Ok(())
    }

    pub async fn get_discount_usage_report(&self) -> Result<Vec<DiscountUsage>, String> {
        let token = self.get_access_token().await?;
        let url = format!("{}/discount_usage", self.firestore_base());
        let resp = self.http.get(&url).bearer_auth(&token).send().await
            .map_err(|e| format!("Firestore get discount usage failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Firestore get discount usage error: {}", err_text));
        }
        let body: serde_json::Value = resp.json().await.map_err(|e| format!("Failed to parse discount usage: {}", e))?;
        let docs = body["documents"].as_array().cloned().unwrap_or_default();
        let usages = docs.into_iter().filter_map(|doc| {
            let fields = &doc["fields"];
            let name = doc["name"].as_str().unwrap_or("");
            let doc_id = name.rsplit('/').next().map(|s| s.to_string());
            let get_string = |key: &str| -> String { fields[key]["stringValue"].as_str().unwrap_or("").to_string() };
            let get_double = |key: &str| -> f64 {
                fields[key]["doubleValue"].as_str().and_then(|s| s.parse().ok())
                    .or_else(|| fields[key]["integerValue"].as_str().and_then(|s| s.parse().ok()))
                    .unwrap_or(0.0)
            };
            Some(DiscountUsage {
                id: doc_id,
                code: get_string("code"),
                user_id: get_string("userId"),
                tier: get_string("tier"),
                original_amount: get_double("originalAmount"),
                discount_amount: get_double("discountAmount"),
                final_amount: get_double("finalAmount"),
                subscription_id: {
                    let s = get_string("subscriptionId");
                    if s.is_empty() { None } else { Some(s) }
                },
                timestamp: get_string("timestamp"),
            })
        }).collect();
        Ok(usages)
    }

    pub async fn get_subscriptions(&self) -> Result<Vec<Subscription>, String> {
        let token = self.get_access_token().await?;
        let url = format!("{}/subscriptions", self.firestore_base());
        let resp = self.http.get(&url).bearer_auth(&token).send().await
            .map_err(|e| format!("Firestore get subscriptions failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Firestore get subscriptions error: {}", err_text));
        }
        let body: serde_json::Value = resp.json().await.map_err(|e| format!("Failed to parse subscriptions: {}", e))?;
        let docs = body["documents"].as_array().cloned().unwrap_or_default();
        let subs = docs.into_iter().filter_map(|doc| {
            let fields = &doc["fields"];
            let name = doc["name"].as_str().unwrap_or("");
            let doc_id = name.rsplit('/').next().map(|s| s.to_string());
            let get_string = |key: &str| -> String { fields[key]["stringValue"].as_str().unwrap_or("").to_string() };
            Some(Subscription {
                id: doc_id,
                uid: get_string("uid"),
                tier: get_string("tier"),
                status: get_string("status"),
                provider: {
                    let s = get_string("provider");
                    if s.is_empty() { None } else { Some(s) }
                },
                created_at: get_string("createdAt"),
                updated_at: get_string("updatedAt"),
            })
        }).collect();
        Ok(subs)
    }

    // ──────────────────────────────────────────
    // License Key Methods
    // ──────────────────────────────────────────

    pub async fn list_license_keys(&self) -> Result<Vec<serde_json::Value>, String> {
        let token = self.get_access_token().await?;
        let url = format!("{}/license_keys", self.firestore_base());
        let resp = self.http.get(&url).bearer_auth(&token).send().await
            .map_err(|e| format!("Firestore list license keys failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Firestore list license keys error: {}", err_text));
        }
        let body: serde_json::Value = resp.json().await.map_err(|e| format!("Failed to parse license keys: {}", e))?;
        let docs = body["documents"].as_array().cloned().unwrap_or_default();
        let flat = docs.into_iter().map(flatten_firestore_doc).collect();
        Ok(flat)
    }

    pub async fn create_license_key_batch(&self, count: u32, tier: String, created_by: String) -> Result<Vec<serde_json::Value>, String> {
        let token = self.get_access_token().await?;
        let base_url = self.firestore_base();
        let now = iso_now();
        let mut results = Vec::new();

        for _ in 0..count {
            let key = generate_license_key();
            let url = format!("{}/license_keys?documentId={}", base_url, key);
            let mut fields = std::collections::HashMap::new();
            fields.insert("key".to_string(), FirestoreValue {
                string_value: Some(key.clone()), integer_value: None, boolean_value: None, timestamp_value: None, double_value: None,
            });
            fields.insert("tier".to_string(), FirestoreValue {
                string_value: Some(tier.clone()), integer_value: None, boolean_value: None, timestamp_value: None, double_value: None,
            });
            fields.insert("status".to_string(), FirestoreValue {
                string_value: Some("available".to_string()), integer_value: None, boolean_value: None, timestamp_value: None, double_value: None,
            });
            fields.insert("createdBy".to_string(), FirestoreValue {
                string_value: Some(created_by.clone()), integer_value: None, boolean_value: None, timestamp_value: None, double_value: None,
            });
            fields.insert("createdAt".to_string(), FirestoreValue {
                string_value: None, integer_value: None, boolean_value: None, timestamp_value: Some(now.clone()), double_value: None,
            });
            let doc = FirestoreDocument { fields };
            let resp = self.http.post(&url).bearer_auth(&token).json(&doc).send().await
                .map_err(|e| format!("Firestore create license key failed: {}", e))?;
            if !resp.status().is_success() {
                let err_text = resp.text().await.unwrap_or_default();
                return Err(format!("Firestore create license key error: {}", err_text));
            }
            let body: serde_json::Value = resp.json().await.map_err(|e| format!("Failed to parse created license key: {}", e))?;
            results.push(flatten_firestore_doc(body));
        }
        Ok(results)
    }

    pub async fn reactivate_license_key(&self, key: &str) -> Result<(), String> {
        let token = self.get_access_token().await?;
        let url = format!(
            "{}/license_keys/{}?updateMask.fieldPaths=status&updateMask.fieldPaths=reactivatedAt",
            self.firestore_base(),
            urlencoding(key)
        );
        let mut fields = std::collections::HashMap::new();
        fields.insert("status".to_string(), FirestoreValue {
            string_value: Some("available".to_string()), integer_value: None, boolean_value: None, timestamp_value: None, double_value: None,
        });
        fields.insert("reactivatedAt".to_string(), FirestoreValue {
            string_value: None, integer_value: None, boolean_value: None, timestamp_value: Some(iso_now()), double_value: None,
        });
        let doc = FirestoreDocument { fields };
        let resp = self.http.patch(&url).bearer_auth(&token).json(&doc).send().await
            .map_err(|e| format!("Firestore reactivate license key failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Firestore reactivate license key error: {}", err_text));
        }
        Ok(())
    }

    pub async fn revoke_license_key(&self, key: &str) -> Result<(), String> {
        let token = self.get_access_token().await?;
        let url = format!(
            "{}/license_keys/{}?updateMask.fieldPaths=status",
            self.firestore_base(),
            urlencoding(key)
        );
        let mut fields = std::collections::HashMap::new();
        fields.insert("status".to_string(), FirestoreValue {
            string_value: Some("revoked".to_string()), integer_value: None, boolean_value: None, timestamp_value: None, double_value: None,
        });
        let doc = FirestoreDocument { fields };
        let resp = self.http.patch(&url).bearer_auth(&token).json(&doc).send().await
            .map_err(|e| format!("Firestore revoke license key failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Firestore revoke license key error: {}", err_text));
        }
        Ok(())
    }

    pub async fn delete_license_key(&self, key: &str) -> Result<(), String> {
        let token = self.get_access_token().await?;
        let url = format!("{}/license_keys/{}", self.firestore_base(), urlencoding(key));
        let resp = self.http.delete(&url).bearer_auth(&token).send().await
            .map_err(|e| format!("Firestore delete license key failed: {}", e))?;
        if !resp.status().is_success() && resp.status().as_u16() != 404 {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Firestore delete license key error: {}", err_text));
        }
        Ok(())
    }

    /// Delete a user from Firebase Auth and Firestore.
    pub async fn delete_user(&self, user_id: &str) -> Result<(), String> {
        // 1. Delete from Firebase Auth
        let token = self.get_access_token().await?;
        let auth_url = format!(
            "https://identitytoolkit.googleapis.com/v1/projects/{}/accounts:delete",
            self.project_id
        );
        let body = serde_json::json!({ "localId": user_id });
        let resp = self.http.post(&auth_url)
            .bearer_auth(&token)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Firebase delete user request failed: {}", e))?;
        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Firebase delete user error: {}", err_text));
        }

        // 2. Delete Firestore user document
        let firestore_url = format!("{}/users/{}", self.firestore_base(), urlencoding(user_id));
        let fs_resp = self.http.delete(&firestore_url)
            .bearer_auth(&token)
            .send()
            .await
            .map_err(|e| format!("Firestore delete user doc failed: {}", e))?;
        if !fs_resp.status().is_success() && fs_resp.status().as_u16() != 404 {
            let err_text = fs_resp.text().await.unwrap_or_default();
            return Err(format!("Firestore delete user doc error: {}", err_text));
        }

        // 3. Try to delete associated subscriptions (best-effort)
        let subs_url = format!("{}/subscriptions", self.firestore_base());
        if let Ok(get_resp) = self.http.get(&subs_url)
            .bearer_auth(&token)
            .send()
            .await
        {
            if let Ok(body) = get_resp.json::<serde_json::Value>().await {
                if let Some(docs) = body["documents"].as_array() {
                    for doc in docs {
                        let uid = doc["fields"]["uid"]["stringValue"]
                            .as_str()
                            .unwrap_or("");
                        if !uid.is_empty() && uid == user_id {
                            if let Some(name) = doc["name"].as_str() {
                                let _ = self.http.delete(name)
                                    .bearer_auth(&token)
                                    .send()
                                    .await;
                            }
                        }
                    }
                }
            }
        }

        Ok(())
    }


    pub async fn refresh_id_token(&self, refresh_token: &str) -> Result<RefreshedTokens, String> {
        let url = format!(
            "https://securetoken.googleapis.com/v1/token?key={}",
            self.web_api_key
        );
        let body = serde_json::json!({
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        });
        let resp = self
            .http
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Token refresh request failed: {}", e))?;

        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Token refresh failed: {}", err_text));
        }

        let token_resp: RefreshTokenResponse = resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse token refresh response: {}", e))?;

        Ok(RefreshedTokens {
            id_token: token_resp.id_token,
            refresh_token: token_resp.refresh_token,
        })
    }
}

#[derive(Deserialize)]
struct RefreshTokenResponse {
    id_token: String,
    refresh_token: String,
}

#[derive(Debug, Clone)]
pub struct RefreshedTokens {
    pub id_token: String,
    pub refresh_token: String,
}

fn flatten_firestore_doc(doc: serde_json::Value) -> serde_json::Value {
    let fields = doc["fields"].as_object().cloned().unwrap_or_default();
    let mut map = serde_json::Map::new();
    for (name, val) in fields {
        let extracted = val["stringValue"].as_str()
            .or_else(|| val["integerValue"].as_str())
            .or_else(|| val["timestampValue"].as_str())
            .map(|s| serde_json::Value::String(s.to_string()))
            .or_else(|| val["booleanValue"].as_bool().map(serde_json::Value::Bool))
            .or_else(|| val["doubleValue"].as_f64().map(serde_json::Value::from))
            .unwrap_or(serde_json::Value::Null);
        map.insert(name, extracted);
    }
    serde_json::Value::Object(map)
}

fn generate_license_key() -> String {
    use rand::Rng;
    const CHARS: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let mut rng = rand::thread_rng();
    let mut key = String::with_capacity(23);
    for i in 0..20 {
        if i > 0 && i % 5 == 0 {
            key.push('-');
        }
        let idx = rng.gen_range(0..CHARS.len());
        key.push(CHARS[idx] as char);
    }
    key
}

fn iso_now() -> String {
    use chrono::Utc;
    Utc::now().to_rfc3339()
}

fn urlencoding(s: &str) -> String {
    s.replace('%', "%25")
        .replace('"', "%22")
        .replace(' ', "%20")
        .replace('&', "%26")
        .replace('=', "%3D")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_firebase_client_new() {
        let config = FirebaseConfig {
            web_api_key: "test-key".to_string(),
            project_id: "test-project".to_string(),
            service_account_email: "test@test.iam.gserviceaccount.com".to_string(),
            private_key_pem: "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----".to_string(),
        };
        let client = FirebaseClient::new(config);
        assert_eq!(client.web_api_key, "test-key");
        assert_eq!(client.project_id, "test-project");
    }

    #[test]
    fn test_has_service_account_true() {
        let config = FirebaseConfig {
            web_api_key: "key".to_string(),
            project_id: "proj".to_string(),
            service_account_email: "svc@test.iam.gserviceaccount.com".to_string(),
            private_key_pem: "key-data".to_string(),
        };
        assert!(FirebaseClient::new(config).has_service_account());
    }

    #[test]
    fn test_has_service_account_false_empty_email() {
        let config = FirebaseConfig {
            web_api_key: "key".to_string(),
            project_id: "proj".to_string(),
            service_account_email: String::new(),
            private_key_pem: "key-data".to_string(),
        };
        assert!(!FirebaseClient::new(config).has_service_account());
    }

    #[test]
    fn test_has_service_account_false_empty_key() {
        let config = FirebaseConfig {
            web_api_key: "key".to_string(),
            project_id: "proj".to_string(),
            service_account_email: "svc@test.iam.gserviceaccount.com".to_string(),
            private_key_pem: String::new(),
        };
        assert!(!FirebaseClient::new(config).has_service_account());
    }

    #[test]
    fn test_has_service_account_both_empty() {
        let config = FirebaseConfig {
            web_api_key: "key".to_string(),
            project_id: "proj".to_string(),
            service_account_email: String::new(),
            private_key_pem: String::new(),
        };
        assert!(!FirebaseClient::new(config).has_service_account());
    }

    #[test]
    fn test_parse_custom_attributes_valid() {
        let attrs = Some(r#"{"tier":"standard","suspended":false}"#.to_string());
        let (tier, suspended) = FirebaseClient::parse_custom_attributes(&attrs);
        assert_eq!(tier, "standard");
        assert!(!suspended);
    }

    #[test]
    fn test_parse_custom_attributes_admin() {
        let attrs = Some(r#"{"tier":"admin","suspended":false}"#.to_string());
        let (tier, suspended) = FirebaseClient::parse_custom_attributes(&attrs);
        assert_eq!(tier, "admin");
        assert!(!suspended);
    }

    #[test]
    fn test_parse_custom_attributes_ultimate() {
        let attrs = Some(r#"{"tier":"ultimate","suspended":false}"#.to_string());
        let (tier, suspended) = FirebaseClient::parse_custom_attributes(&attrs);
        assert_eq!(tier, "ultimate");
        assert!(!suspended);
    }

    #[test]
    fn test_parse_custom_attributes_suspended() {
        let attrs = Some(r#"{"tier":"standard","suspended":true}"#.to_string());
        let (tier, suspended) = FirebaseClient::parse_custom_attributes(&attrs);
        assert_eq!(tier, "standard");
        assert!(suspended);
    }

    #[test]
    fn test_parse_custom_attributes_no_tier() {
        let attrs = Some(r#"{"suspended":false}"#.to_string());
        let (tier, suspended) = FirebaseClient::parse_custom_attributes(&attrs);
        assert_eq!(tier, "free");
        assert!(!suspended);
    }

    #[test]
    fn test_parse_custom_attributes_empty_json() {
        let attrs = Some("{}".to_string());
        let (tier, suspended) = FirebaseClient::parse_custom_attributes(&attrs);
        assert_eq!(tier, "free");
        assert!(!suspended);
    }

    #[test]
    fn test_parse_custom_attributes_invalid_json() {
        let attrs = Some("not-json".to_string());
        let (tier, suspended) = FirebaseClient::parse_custom_attributes(&attrs);
        assert_eq!(tier, "free");
        assert!(!suspended);
    }

    #[test]
    fn test_parse_custom_attributes_none() {
        let (tier, suspended) = FirebaseClient::parse_custom_attributes(&None);
        assert_eq!(tier, "free");
        assert!(!suspended);
    }

    #[test]
    fn test_log_entry_serde() {
        let entry = LogEntry {
            id: Some("abc".to_string()),
            user_id: "user1".to_string(),
            log_type: "error".to_string(),
            source: "frontend".to_string(),
            message: "Something broke".to_string(),
            stack: Some("at line 42".to_string()),
            timestamp: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&entry).unwrap();
        let parsed: LogEntry = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.id, Some("abc".to_string()));
        assert_eq!(parsed.user_id, "user1");
        assert_eq!(parsed.log_type, "error");
        assert_eq!(parsed.message, "Something broke");
    }

    #[test]
    fn test_log_entry_no_stack_no_id() {
        let entry = LogEntry {
            id: None,
            user_id: "user1".to_string(),
            log_type: "warning".to_string(),
            source: "backend".to_string(),
            message: "Minor".to_string(),
            stack: None,
            timestamp: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&entry).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert!(parsed.get("id").is_none(), "id field should be omitted when None");
        assert!(!json.contains("\"stack\""), "stack field should be omitted when None");
    }

    #[test]
    fn test_feedback_entry_serde() {
        let fb = FeedbackEntry {
            id: Some("fb1".to_string()),
            user_id: "user1".to_string(),
            subject: "Bug".to_string(),
            message: "Crashed".to_string(),
            rating: Some(3),
            timestamp: "2024-01-01T00:00:00Z".to_string(),
            resolved: false,
        };
        let json = serde_json::to_string(&fb).unwrap();
        let parsed: FeedbackEntry = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.subject, "Bug");
        assert_eq!(parsed.rating, Some(3));
        assert!(!parsed.resolved);
    }

    #[test]
    fn test_feedback_no_rating() {
        let fb = FeedbackEntry {
            id: None,
            user_id: "user1".to_string(),
            subject: "Suggestion".to_string(),
            message: "Add feature".to_string(),
            rating: None,
            timestamp: "2024-01-01T00:00:00Z".to_string(),
            resolved: false,
        };
        let json = serde_json::to_string(&fb).unwrap();
        assert!(!json.contains("rating"));
    }

    #[test]
    fn test_discount_code_serde() {
        let code = DiscountCode {
            id: Some("dc1".to_string()),
            code: "SAVE20".to_string(),
            discount_percent: 20,
            max_uses: 100,
            current_uses: 5,
            created_by: "admin".to_string(),
            created_at: "2024-01-01T00:00:00Z".to_string(),
            expires_at: Some("2024-12-31T23:59:59Z".to_string()),
            active: true,
            description: "20% off".to_string(),
        };
        let json = serde_json::to_string(&code).unwrap();
        let parsed: DiscountCode = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.code, "SAVE20");
        assert_eq!(parsed.discount_percent, 20);
        assert!(parsed.active);
    }

    #[test]
    fn test_discount_code_no_expires() {
        let code = DiscountCode {
            id: None,
            code: "TEST".to_string(),
            discount_percent: 10,
            max_uses: 50,
            current_uses: 0,
            created_by: "admin".to_string(),
            created_at: "2024-01-01T00:00:00Z".to_string(),
            expires_at: None,
            active: true,
            description: "Test".to_string(),
        };
        let json = serde_json::to_string(&code).unwrap();
        assert!(!json.contains("expiresAt"));
    }

    #[test]
    fn test_discount_usage_serde() {
        let usage = DiscountUsage {
            id: Some("du1".to_string()),
            code: "SAVE20".to_string(),
            user_id: "user1".to_string(),
            tier: "standard".to_string(),
            original_amount: 9.99,
            discount_amount: 2.00,
            final_amount: 7.99,
            subscription_id: Some("sub123".to_string()),
            timestamp: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&usage).unwrap();
        let parsed: DiscountUsage = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.original_amount, 9.99);
        assert_eq!(parsed.discount_amount, 2.00);
        assert_eq!(parsed.subscription_id, Some("sub123".to_string()));
    }

    #[test]
    fn test_discount_usage_no_subscription() {
        let usage = DiscountUsage {
            id: None,
            code: "TEST".to_string(),
            user_id: "user1".to_string(),
            tier: "free".to_string(),
            original_amount: 0.0,
            discount_amount: 0.0,
            final_amount: 0.0,
            subscription_id: None,
            timestamp: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&usage).unwrap();
        assert!(!json.contains("subscriptionId"));
    }

    #[test]
    fn test_subscription_serde() {
        let sub = Subscription {
            id: Some("sub1".to_string()),
            uid: "user1".to_string(),
            tier: "standard".to_string(),
            status: "ACTIVE".to_string(),
            provider: Some("paypal".to_string()),
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&sub).unwrap();
        let parsed: Subscription = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.status, "ACTIVE");
        assert_eq!(parsed.provider, Some("paypal".to_string()));
    }

    #[test]
    fn test_subscription_no_provider() {
        let sub = Subscription {
            id: None,
            uid: "user1".to_string(),
            tier: "ultimate".to_string(),
            status: "CANCELLED".to_string(),
            provider: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-06-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&sub).unwrap();
        assert!(!json.contains("provider"));
    }

    #[test]
    fn test_firebase_user_serde() {
        let user = FirebaseUser {
            local_id: "uid123".to_string(),
            email: "test@example.com".to_string(),
            display_name: Some("Test User".to_string()),
            registered: true,
            tier: "standard".to_string(),
            suspended: false,
        };
        let json = serde_json::to_string(&user).unwrap();
        let parsed: FirebaseUser = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.local_id, "uid123");
        assert_eq!(parsed.tier, "standard");
        assert!(!parsed.suspended);
    }

    #[test]
    fn test_user_profile_serde() {
        let profile = UserProfile {
            user_id: "uid1".to_string(),
            email: "a@b.com".to_string(),
            display_name: "Alice".to_string(),
            tier: "admin".to_string(),
            created_at: "2024-01-01T00:00:00Z".to_string(),
            suspended: false,
        };
        let json = serde_json::to_string(&profile).unwrap();
        let parsed: UserProfile = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.tier, "admin");
        assert_eq!(parsed.display_name, "Alice");
    }

    #[test]
    fn test_log_filter_serde() {
        let filter = LogFilter {
            log_type: Some("error".to_string()),
            source: Some("frontend".to_string()),
            user_id: None,
            limit: Some(50),
        };
        let json = serde_json::to_string(&filter).unwrap();
        let parsed: LogFilter = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.log_type, Some("error".to_string()));
        assert_eq!(parsed.limit, Some(50));
        assert!(parsed.user_id.is_none());
    }

    #[test]
    fn test_firebase_config_clone() {
        let config = FirebaseConfig {
            web_api_key: "key".to_string(),
            project_id: "proj".to_string(),
            service_account_email: "svc@test.iam.gserviceaccount.com".to_string(),
            private_key_pem: "key-data".to_string(),
        };
        let cloned = config.clone();
        assert_eq!(config.web_api_key, cloned.web_api_key);
        assert_eq!(config.project_id, cloned.project_id);
    }

    #[test]
    fn test_urlencoding() {
        assert_eq!(urlencoding("hello world"), "hello%20world");
        assert_eq!(urlencoding("100%"), "100%25");
        assert_eq!(urlencoding("a&b=c"), "a%26b%3Dc");
        assert_eq!(urlencoding("he\"llo"), "he%22llo");
        assert_eq!(urlencoding("clean"), "clean");
    }

    #[test]
    fn test_firestore_base_url() {
        let config = FirebaseConfig {
            web_api_key: "key".to_string(),
            project_id: "photorecipe-7mf5z".to_string(),
            service_account_email: "svc@test.iam.gserviceaccount.com".to_string(),
            private_key_pem: "key-data".to_string(),
        };
        let client = FirebaseClient::new(config);
        assert_eq!(
            client.firestore_base(),
            "https://firestore.googleapis.com/v1/projects/photorecipe-7mf5z/databases/(default)/documents"
        );
    }
}
