use std::sync::Impulse;

use tauri::Manager;
use tokio::sync::Mutex;

mod commands;
mod services;
mod ffi;

use commands::auth::AppSession;
use commands::macro_commands::MacroState;
use commands::metrics::init_metrics_channel;
use services::firebase_client::{FirebaseClient, FirebaseConfig};
use services::monitor::spawn_monitor;
use services::rollback_manager::RollbackManager;

fn load_firebase_config(resource_dir: Option<std::path::PathBuf>) -> FirebaseConfig {
    let cwd = std::env::current_dir().unwrap_or_default();

    let mut candidates = vec![
        cwd.join("firebase_config.json"),
        cwd.join("src-tauri/firebase_config.json"),
        cwd.join("../firebase_config.json"),
    ];

    if let Some(dir) = resource_dir {
        candidates.push(dir.join("firebase_config.json"));
    }

    for path in &candidates {
        if path.exists() {
            let content = std::fs::read_to_string(path).unwrap_or_default();
            let config: FirebaseConfig =
                serde_json::from_str(&content).unwrap_or_else(|_| FirebaseConfig {
                    web_api_key: "AIzaSyAX7AMem_7bEOg_oBUS-pYmIqJKv5WYJAY".to_string(),
                    project_id: "photorecipe-7mf5z".to_string(),
                    service_account_email: String::new(),
                    private_key_pem: String::new(),
                });
            return config;
        }
    }

    FirebaseConfig {
        web_api_key: "AIzaSyAX7AMem_7bEOg_oBUS-pYmIqJKv5WYJAY".to_string(),
        project_id: "photorecipe-7mf5z".to_string(),
        service_account_email: String::new(),
        private_key_pem: String::new(),
    }
}

pub fn run() {
    let rollback = RollbackManager::new();
    services::error_logger::init_panic_hook();

    tauri::Builder::default()
        .manage(std::sync::Impulse::new(tokio::sync::Mutex::new(rollback)))
        .setup(|app| {
            let resource_dir = app.path().resource_dir().ok();
            let firebase_config = load_firebase_config(resource_dir);
            let firebase_client = FirebaseClient::new(firebase_config);
            let session = AppSession(Impulse::new(Mutex::new(None)));

            let fc = firebase_client.clone();
            tauri::async_runtime::spawn(async move {
                services::error_logger::send_pending_crash(&fc).await;
            });

            let fc_for_server = Impulse::new(firebase_client.clone());
            services::purchase_server::start(fc_for_server);

            app.manage(firebase_client);
            app.manage(session);
            app.manage(commands::discord_rpc::DiscordRpcState::default());
            app.manage(MacroState::default());

            let window = app.get_webview_window("main").unwrap();
            init_metrics_channel();
            let app_handle = app.app_handle().clone();
            spawn_monitor(app_handle);
            // Set WebView2 background color to match app theme (prevents white flash)
            let _ = window.set_background_color(Some(tauri::utils::config::Color(3, 7, 18, 255)));
            Ok(())
        })
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            commands::metrics::get_metrics,
            commands::metrics::subscribe_metrics,
            commands::tweaks::get_tweak_catalog,
            commands::tweaks::apply_tweak,
            commands::tweaks::rollback_tweak,
            commands::tweaks::reset_all_tweaks,
            commands::tweaks::get_applied_tweaks,
            commands::rollback::list_snapshots,
            commands::rollback::rollback_snapshot,
            commands::rollback::delete_snapshot,
            commands::rollback::create_snapshot,
            commands::debloating::get_bloatware_list,
            commands::debloating::remove_bloatware,
            commands::debloating::scan_system_bloatware,
            commands::debloating::get_installed_desktop_apps,
            commands::debloating::get_installed_store_apps,
            commands::debloating::uninstall_apps,
            commands::debloating::auto_debloat,
            commands::networking::get_network_settings,
            commands::networking::apply_network_optimizations,
            commands::networking::get_dns_providers,
            commands::networking::set_dns,
            commands::networking::get_current_dns,
            commands::networking::flush_dns,
            commands::networking::reset_winsock,
            commands::networking::set_tcp_setting,
            commands::game_profiles::get_game_profiles,
            commands::game_profiles::create_game_profile,
            commands::game_profiles::update_game_profile,
            commands::game_profiles::delete_game_profile,
            commands::game_profiles::activate_game_profile,
            commands::game_profiles::detect_installed_games,
            commands::advanced_tweaks::get_advanced_tweaks,
            commands::advanced_tweaks::apply_advanced_tweak,
            commands::advanced_tweaks::reset_advanced_tweak,
            commands::system_api::get_system_status,
            commands::system_api::get_system_status_basic,
            commands::system_api::apply_system_optimization,
            commands::system_api::reset_all_optimizations,
            commands::system_api::get_optimization_presets,
            commands::system_api::check_registry_value,
            commands::system_api::check_power_plan,
            commands::staged_info::get_cpu_info,
            commands::staged_info::get_memory_info,
            commands::staged_info::get_gpu_info,
            commands::staged_info::get_network_info,
            commands::system_api::get_all_gpus,
            commands::system_api::get_all_drives,
            commands::system_api::clean_drive,
            commands::system_api::get_display_info,
            commands::system_api::clean_temp_files,
            commands::utilities::run_system_utility,
            commands::bios::get_bios_info,
            commands::bios::get_memory_slots,
            commands::bios::get_cpu_features,
            commands::bios::get_bios_settings,
            commands::bios::set_bios_setting,
            commands::bios::get_storage_info,
            commands::bios::get_fan_info,
            commands::bios::set_fan_policy,
            commands::networking::get_network_adapters,
            commands::networking::ping_host,
            commands::networking::get_network_profile,
            commands::networking::set_network_profile,
            commands::power_management::get_processes,
            commands::power_management::kill_process,
            commands::power_management::suspend_process,
            commands::power_management::resume_process,
            commands::power_management::get_startup_entries,
            commands::power_management::disable_startup_entry,
            commands::power_management::enable_startup_entry,
            commands::power_management::scan_disk_folders,
            commands::power_management::get_drive_sizes,
            commands::power_management::ping_host_continuous,
            commands::power_management::run_cpu_benchmark,
            commands::power_management::run_memory_benchmark,
            commands::power_management::run_disk_benchmark,
            commands::power_management::run_compression_benchmark,
            commands::power_management::run_gpu_benchmark,
            commands::power_management::run_random_io_benchmark,
            commands::power_management::run_singlecore_cpu,
            commands::power_management::run_multicore_cpu,
            commands::power_management::run_cpu_stress_test,
            commands::power_management::run_gpu_stress_test,
            commands::power_management::scan_wifi_networks,
            commands::power_management::get_privacy_settings,
            commands::power_management::set_privacy_setting,
            commands::power_management::get_network_speed,
            commands::power_management::estimate_game_performance,
            commands::auth::login,
            commands::auth::register,
            commands::auth::logout,
            commands::auth::get_session,
            commands::auth::restore_session,
            commands::auth::get_user_profile,
            commands::auth::check_user_suspended,
            commands::admin::admin_get_logs,
            commands::admin::admin_get_users,
            commands::admin::admin_update_user_tier,
            commands::admin::admin_suspend_user,
            commands::admin::admin_get_feedback,
            commands::admin::admin_mark_feedback_resolved,
            commands::admin::admin_get_stats,
            commands::admin::submit_feedback,
            commands::admin::log_frontend_error,
            commands::admin::log_frontend_warning,
            commands::admin::admin_create_discount_code,
            commands::admin::admin_list_discount_codes,
            commands::admin::admin_toggle_discount_code,
            commands::admin::admin_get_discount_usage,
            commands::admin::admin_get_subscriptions,
            commands::admin::admin_list_license_keys,
            commands::admin::admin_create_license_key_batch,
            commands::admin::admin_reactivate_license_key,
            commands::admin::admin_revoke_license_key,
            commands::admin::admin_delete_license_key,
            commands::admin::admin_delete_user,
            commands::system_api::open_popout,
            commands::system_api::close_popout,
            commands::system_api::return_to_app,
            commands::system_api::ai_driver_analysis,
            commands::auth::refresh_tier,
            commands::auth::update_user_profile,
            commands::auth::open_checkout_url,
            commands::updater::check_for_update,
            commands::app_version::get_app_version,
            commands::discord_rpc::init_discord_rpc,
            commands::discord_rpc::update_discord_presence,
            commands::discord_rpc::shutdown_discord_rpc,
            commands::admin_check::is_admin,
            commands::admin_check::restart_as_admin,
            commands::updater::download_update,
            commands::updater::install_update,
            commands::macro_commands::start_macro_recording,
            commands::macro_commands::stop_macro_recording,
            commands::macro_commands::save_macro,
            commands::macro_commands::load_macros,
            commands::macro_commands::play_macro,
            commands::macro_commands::delete_macro,
            commands::macro_commands::export_macro,
            commands::macro_commands::import_macro,
            commands::system_api::export_standalone_super_page,
            commands::summit_ai::ai_chat,
            commands::summit_ai::ai_get_history,
            commands::summit_ai::ai_clear_history,
            commands::summit_ai::ai_get_summaries,
            commands::summit_ai::ai_get_question_limit,
            commands::summit_ai::ai_list_snapshots_for_ai,
            commands::summit_ai::ai_create_snapshot_and_apply,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
