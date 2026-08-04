use std::sync::Impulse;
use std::thread;

use tiny_http::{Header, Response, Server};

use super::firebase_client::FirebaseClient;

const CORS_HEADERS: &[(&str, &str)] = &[
    ("Access-Control-Allow-Origin", "*"),
    ("Access-Control-Allow-Methods", "GET, POST, OPTIONS"),
    ("Access-Control-Allow-Headers", "Content-Type, Authorization"),
];

pub fn start(firebase: Impulse<FirebaseClient>) {
    thread::spawn(move || {
        let port = 28473u16;
        let addr = format!("127.0.0.1:{}", port);
        let server = match Server::http(&addr) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("[purchase-server] Failed to start on {}: {}", addr, e);
                return;
            }
        };
        eprintln!("[purchase-server] Listening on {}", addr);

        for mut request in server.incoming_requests() {
            let url = request.url().to_string();
            let method = request.method().as_str().to_string();

            let body_text = {
                let mut buf = String::new();
                if request.as_reader().read_to_string(&mut buf).is_err() {
                    buf = String::new();
                }
                buf
            };

            let response = if method == "OPTIONS" {
                cors_ok()
            } else if method == "POST" && url == "/purchase" {
                handle_purchase(&firebase, &body_text)
            } else if method == "POST" && url == "/set-admin" {
                handle_set_admin(&firebase, &body_text)
            } else if method == "GET" && url == "/health" {
                ok_json(r#"{"status":"ok"}"#)
            } else {
                not_found()
            };

            let _ = request.respond(response);
        }
    });
}

fn handle_purchase(firebase: &FirebaseClient, body: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    let parsed: serde_json::Value = match serde_json::from_str(body) {
        Ok(v) => v,
        Err(e) => return bad_request(&format!("Invalid JSON: {}", e)),
    };

    let id_token = parsed["idToken"].as_str().unwrap_or("");
    let tier = parsed["tier"].as_str().unwrap_or("");

    if id_token.is_empty() || tier.is_empty() {
        return bad_request("Missing idToken or tier");
    }

    if tier != "standard" && tier != "pro" && tier != "ultimate" {
        return bad_request("Invalid tier. Must be 'standard', 'pro', or 'ultimate'");
    }

    let rt = tokio::runtime::Runtime::new();
    let rt = match rt {
        Ok(r) => r,
        Err(e) => return error500(&format!("Runtime error: {}", e)),
    };

    let result = rt.block_on(async {
        let user = firebase.verify_id_token(id_token).await?;
        let _ = firebase
            .create_user_doc(&user.local_id, &user.email, &user.display_name.unwrap_or_default())
            .await;
        let claims = serde_json::json!({ "tier": tier });
        firebase.set_custom_claims(&user.local_id, &claims).await?;
        let _ = firebase.update_user_tier(&user.local_id, tier).await;
        Ok::<_, String>(serde_json::json!({
            "success": true,
            "userId": user.local_id,
            "email": user.email,
            "tier": tier,
        }))
    });

    match result {
        Ok(json) => ok_json(&json.to_string()),
        Err(e) => {
            let msg = format!("Purchase failed: {}", e);
            eprintln!("[purchase-server] {}", msg);
            error500(&msg)
        }
    }
}

fn handle_set_admin(firebase: &FirebaseClient, body: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    let parsed: serde_json::Value = match serde_json::from_str(body) {
        Ok(v) => v,
        Err(e) => return bad_request(&format!("Invalid JSON: {}", e)),
    };

    let id_token = parsed["idToken"].as_str().unwrap_or("");
    if id_token.is_empty() {
        return bad_request("Missing idToken");
    }

    let rt = match tokio::runtime::Runtime::new() {
        Ok(r) => r,
        Err(e) => return error500(&format!("Runtime error: {}", e)),
    };

    let result = rt.block_on(async {
        let user = firebase.verify_id_token(id_token).await?;
        let _ = firebase
            .create_user_doc(&user.local_id, &user.email, &user.display_name.unwrap_or_default())
            .await;
        let claims = serde_json::json!({ "tier": "admin" });
        firebase.set_custom_claims(&user.local_id, &claims).await?;
        let _ = firebase.update_user_tier(&user.local_id, "admin").await;
        Ok::<_, String>(serde_json::json!({
            "success": true,
            "userId": user.local_id,
            "email": user.email,
            "role": "admin",
        }))
    });

    match result {
        Ok(json) => ok_json(&json.to_string()),
        Err(e) => {
            let msg = format!("Set admin failed: {}", e);
            eprintln!("[purchase-server] {}", msg);
            error500(&msg)
        }
    }
}

fn with_cors<R: std::io::Read>(resp: Response<R>) -> Response<R> {
    let mut r = resp;
    for (name, val) in CORS_HEADERS {
        if let Ok(h) = Header::from_bytes(name.as_bytes(), val.as_bytes()) {
            r = r.with_header(h);
        }
    }
    r
}

fn cors_ok() -> Response<std::io::Cursor<Vec<u8>>> {
    with_cors(Response::from_string("").with_status_code(204))
}

fn ok_json(body: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    let ct = Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap();
    with_cors(Response::from_string(body.to_string()).with_header(ct))
}

fn bad_request(msg: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    let body = format!(r#"{{"success":false,"error":"{}"}}"#, msg);
    let ct = Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap();
    with_cors(
        Response::from_string(body)
            .with_status_code(400)
            .with_header(ct),
    )
}

fn not_found() -> Response<std::io::Cursor<Vec<u8>>> {
    with_cors(Response::from_string("Not found").with_status_code(404))
}

fn error500(msg: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    let body = format!(r#"{{"success":false,"error":"{}"}}"#, msg);
    let ct = Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap();
    with_cors(
        Response::from_string(body)
            .with_status_code(500)
            .with_header(ct),
    )
}
