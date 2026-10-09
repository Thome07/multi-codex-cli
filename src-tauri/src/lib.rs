pub mod codex;
pub mod commands;
pub mod models;
pub mod paths;
pub mod persistence;
pub mod pty_manager;

#[cfg(test)]
mod tests;

use commands::AppState;
use pty_manager::PtyManager;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = paths::init_base_directories();

    let pty_manager = Arc::new(PtyManager::new());
    let app_state = AppState {
        pty_manager: pty_manager.clone(),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::detect_codex,
            commands::update_codex_cli,
            commands::get_profiles,
            commands::get_profile,
            commands::create_profile,
            commands::update_profile,
            commands::delete_profile,
            commands::duplicate_profile,
            commands::reorder_profiles,
            commands::get_profile_auth_status,
            commands::logout_profile,
            commands::spawn_session,
            commands::write_session,
            commands::resize_session,
            commands::kill_session,
            commands::list_active_sessions,
            commands::get_settings,
            commands::update_settings,
            commands::get_profile_messages,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
