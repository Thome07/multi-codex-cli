use crate::codex::{
    check_profile_auth_status, detect_codex_cli, find_codex_binary, logout_profile_session,
    update_codex_cli_executable,
};
use crate::models::{
    AppSettings, AuthStatus, ChatMessage, CodexDetectionResult, CodexUpdateResult, CreateProfileRequest, Profile,
    ProfileSummary, SessionInfo, UpdateProfileRequest,
};
use crate::paths::{ensure_secure_dir, get_profile_codex_home, get_profile_dir, validate_working_dir};
use crate::persistence::{load_profiles, load_settings, save_profiles, save_settings};
use crate::pty_manager::PtyManager;
use std::sync::Arc;
use tauri::{AppHandle, State};
use uuid::Uuid;

pub struct AppState {
    pub pty_manager: Arc<PtyManager>,
}

#[tauri::command]
pub fn detect_codex(state_settings: Option<String>) -> CodexDetectionResult {
    let settings = load_settings().unwrap_or_default();
    let custom_path = state_settings.or(settings.codex_path);
    detect_codex_cli(custom_path.as_deref())
}

#[tauri::command]
pub async fn update_codex_cli(sudo_password: Option<String>) -> Result<CodexUpdateResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        update_codex_cli_executable(sudo_password.as_deref())
    })
    .await
    .map_err(|e| format!("Erro na tarefa assíncrona de atualização: {}", e))
}

#[tauri::command]
pub fn get_profiles(state: State<'_, AppState>) -> Result<Vec<ProfileSummary>, String> {
    let profiles = load_profiles()?;
    let settings = load_settings().unwrap_or_default();
    let codex_bin = find_codex_binary(settings.codex_path.as_deref())
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "codex".to_string());

    let mut summaries = Vec::new();
    for profile in profiles {
        let auth_status = check_profile_auth_status(&codex_bin, &profile.codex_home);
        let active_sessions_count = state.pty_manager.count_profile_sessions(&profile.id);
        summaries.push(ProfileSummary {
            profile,
            auth_status,
            active_sessions_count,
        });
    }

    Ok(summaries)
}

#[tauri::command]
pub fn get_profile(id: String) -> Result<Profile, String> {
    let profiles = load_profiles()?;
    profiles
        .into_iter()
        .find(|p| p.id == id)
        .ok_or_else(|| format!("Perfil não encontrado: {}", id))
}

#[tauri::command]
pub fn create_profile(req: CreateProfileRequest) -> Result<Profile, String> {
    let mut profiles = load_profiles()?;

    let id = Uuid::new_v4().to_string();
    let codex_home = get_profile_codex_home(&id);
    ensure_secure_dir(&codex_home).map_err(|e| format!("Falha ao criar diretório CODEX_HOME: {}", e))?;

    let color = req.color.unwrap_or_else(|| {
        let palette = [
            "#10b981", // Emerald
            "#3b82f6", // Blue
            "#8b5cf6", // Violet
            "#f59e0b", // Amber
            "#ec4899", // Pink
            "#06b6d4", // Cyan
            "#f97316", // Orange
            "#14b8a6", // Teal
        ];
        palette[profiles.len() % palette.len()].to_string()
    });

    let now = chrono::Utc::now().to_rfc3339();
    let order_index = profiles.len();

    let new_profile = Profile {
        id: id.clone(),
        name: req.name.trim().to_string(),
        description: req.description.map(|d| d.trim().to_string()),
        color,
        icon: req.icon,
        codex_home: codex_home.to_string_lossy().to_string(),
        default_project_dir: req.default_project_dir,
        created_at: now,
        last_used_at: None,
        order_index,
        is_pinned: false,
    };

    profiles.push(new_profile.clone());
    save_profiles(&profiles)?;

    Ok(new_profile)
}

#[tauri::command]
pub fn update_profile(req: UpdateProfileRequest) -> Result<Profile, String> {
    let mut profiles = load_profiles()?;
    let index = profiles
        .iter()
        .position(|p| p.id == req.id)
        .ok_or_else(|| format!("Perfil não encontrado: {}", req.id))?;

    if let Some(name) = req.name {
        profiles[index].name = name.trim().to_string();
    }
    if let Some(desc) = req.description {
        profiles[index].description = if desc.trim().is_empty() {
            None
        } else {
            Some(desc.trim().to_string())
        };
    }
    if let Some(color) = req.color {
        profiles[index].color = color;
    }
    if let Some(icon) = req.icon {
        profiles[index].icon = Some(icon);
    }
    if let Some(dpd) = req.default_project_dir {
        profiles[index].default_project_dir = if dpd.trim().is_empty() {
            None
        } else {
            Some(dpd.trim().to_string())
        };
    }
    if let Some(pinned) = req.is_pinned {
        profiles[index].is_pinned = pinned;
    }

    let updated = profiles[index].clone();
    save_profiles(&profiles)?;

    Ok(updated)
}

#[tauri::command]
pub fn delete_profile(
    state: State<'_, AppState>,
    id: String,
    delete_data: bool,
) -> Result<(), String> {
    let mut profiles = load_profiles()?;
    let pos = profiles
        .iter()
        .position(|p| p.id == id)
        .ok_or_else(|| format!("Perfil não encontrado: {}", id))?;

    // 1. Close any active sessions for this profile
    let active_sessions = state.pty_manager.list_sessions();
    for s in active_sessions {
        if s.profile_id == id {
            let _ = state.pty_manager.kill_session(&s.id);
        }
    }

    // 2. If delete_data is requested, safely remove profile storage directory
    if delete_data {
        let profile_dir = get_profile_dir(&id);
        // Verify path is inside the managed profiles directory to protect user data
        if profile_dir.exists() {
            let _ = std::fs::remove_dir_all(&profile_dir);
        }
    }

    profiles.remove(pos);
    // Reindex remaining profiles
    for (i, p) in profiles.iter_mut().enumerate() {
        p.order_index = i;
    }
    save_profiles(&profiles)?;

    Ok(())
}

#[tauri::command]
pub fn duplicate_profile(id: String) -> Result<Profile, String> {
    let mut profiles = load_profiles()?;
    let original = profiles
        .iter()
        .find(|p| p.id == id)
        .ok_or_else(|| format!("Perfil não encontrado: {}", id))?
        .clone();

    let new_id = Uuid::new_v4().to_string();
    let new_codex_home = get_profile_codex_home(&new_id);
    ensure_secure_dir(&new_codex_home).map_err(|e| format!("Falha ao criar diretório CODEX_HOME: {}", e))?;

    let now = chrono::Utc::now().to_rfc3339();
    let new_profile = Profile {
        id: new_id,
        name: format!("{} (Cópia)", original.name),
        description: original.description,
        color: original.color,
        icon: original.icon,
        codex_home: new_codex_home.to_string_lossy().to_string(),
        default_project_dir: original.default_project_dir,
        created_at: now,
        last_used_at: None,
        order_index: profiles.len(),
        is_pinned: false,
    };

    profiles.push(new_profile.clone());
    save_profiles(&profiles)?;

    Ok(new_profile)
}

#[tauri::command]
pub fn reorder_profiles(ids: Vec<String>) -> Result<(), String> {
    let mut profiles = load_profiles()?;
    for (i, id) in ids.iter().enumerate() {
        if let Some(p) = profiles.iter_mut().find(|p| &p.id == id) {
            p.order_index = i;
        }
    }
    profiles.sort_by_key(|p| p.order_index);
    save_profiles(&profiles)?;
    Ok(())
}

#[tauri::command]
pub fn get_profile_auth_status(id: String) -> Result<AuthStatus, String> {
    let profiles = load_profiles()?;
    let profile = profiles
        .into_iter()
        .find(|p| p.id == id)
        .ok_or_else(|| format!("Perfil não encontrado: {}", id))?;

    let settings = load_settings().unwrap_or_default();
    let codex_bin = find_codex_binary(settings.codex_path.as_deref())
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "codex".to_string());

    Ok(check_profile_auth_status(&codex_bin, &profile.codex_home))
}

#[tauri::command]
pub fn logout_profile(id: String) -> Result<(), String> {
    let profiles = load_profiles()?;
    let profile = profiles
        .into_iter()
        .find(|p| p.id == id)
        .ok_or_else(|| format!("Perfil não encontrado: {}", id))?;

    let settings = load_settings().unwrap_or_default();
    let codex_bin = find_codex_binary(settings.codex_path.as_deref())
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "codex".to_string());

    logout_profile_session(&codex_bin, &profile.codex_home)
}

#[tauri::command]
pub fn spawn_session(
    app: AppHandle,
    state: State<'_, AppState>,
    profile_id: String,
    cwd: Option<String>,
    cols: u16,
    rows: u16,
    custom_args: Option<Vec<String>>,
    is_login_session: Option<bool>,
) -> Result<SessionInfo, String> {
    let mut profiles = load_profiles()?;
    let profile_idx = profiles
        .iter()
        .position(|p| p.id == profile_id)
        .ok_or_else(|| format!("Perfil não encontrado: {}", profile_id))?;

    let profile = profiles[profile_idx].clone();

    // Update last_used_at
    profiles[profile_idx].last_used_at = Some(chrono::Utc::now().to_rfc3339());
    let _ = save_profiles(&profiles);

    let settings = load_settings().unwrap_or_default();
    let codex_bin = find_codex_binary(settings.codex_path.as_deref())
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Executável do Codex CLI não encontrado no sistema.".to_string())?;

    // Determine working directory:
    // 1. Specified cwd
    // 2. Profile default project dir
    // 3. Global default working dir
    // 4. Current user home dir
    let target_dir = cwd
        .or(profile.default_project_dir)
        .or(settings.default_working_dir)
        .or_else(|| dirs::home_dir().map(|h| h.to_string_lossy().to_string()))
        .unwrap_or_else(|| ".".to_string());

    let validated_cwd = validate_working_dir(&target_dir)
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| {
            dirs::home_dir()
                .map(|h| h.to_string_lossy().to_string())
                .unwrap_or_else(|| ".".to_string())
        });

    let session_id = Uuid::new_v4().to_string();

    state.pty_manager.spawn_session(
        app,
        session_id,
        profile.id,
        profile.name,
        profile.color,
        codex_bin,
        profile.codex_home,
        validated_cwd,
        cols.max(10),
        rows.max(5),
        custom_args,
        is_login_session.unwrap_or(false),
    )
}

#[tauri::command]
pub fn write_session(
    state: State<'_, AppState>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    state.pty_manager.write_to_session(&session_id, &data)
}

#[tauri::command]
pub fn resize_session(
    state: State<'_, AppState>,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    state.pty_manager.resize_session(&session_id, cols, rows)
}

#[tauri::command]
pub fn kill_session(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    state.pty_manager.kill_session(&session_id)
}

#[tauri::command]
pub fn list_active_sessions(state: State<'_, AppState>) -> Result<Vec<SessionInfo>, String> {
    Ok(state.pty_manager.list_sessions())
}

#[tauri::command]
pub fn get_settings() -> Result<AppSettings, String> {
    load_settings()
}

#[tauri::command]
pub fn update_settings(settings: AppSettings) -> Result<(), String> {
    save_settings(&settings)
}

fn collect_rollout_files(dir: &std::path::Path, out: &mut Vec<std::path::PathBuf>) {
    let Ok(entries) = std::fs::read_dir(dir) else { return };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_rollout_files(&path, out);
        } else if path
            .file_name()
            .and_then(|n| n.to_str())
            .map(|n| n.starts_with("rollout-") && n.ends_with(".jsonl"))
            .unwrap_or(false)
        {
            out.push(path);
        }
    }
}

fn joined_content_text(item: &serde_json::Value) -> String {
    let mut full = String::new();
    if let Some(content) = item.get("content").and_then(|c| c.as_array()) {
        for part in content {
            let is_text = part
                .get("type")
                .and_then(|t| t.as_str())
                .map(|t| t.eq_ignore_ascii_case("text"))
                .unwrap_or(false);
            if is_text {
                if let Some(txt) = part.get("text").and_then(|t| t.as_str()) {
                    if !full.is_empty() {
                        full.push('\n');
                    }
                    full.push_str(txt);
                }
            }
        }
    }
    full
}

/// Lê o histórico de conversa dos arquivos de sessão do Codex
/// (`CODEX_HOME/sessions/**/rollout-*.jsonl`), que é onde o CLI realmente grava
/// as mensagens (UserMessage / AgentMessage em eventos `item_completed`).
#[tauri::command]
pub fn get_profile_messages(profile_id: String) -> Result<Vec<ChatMessage>, String> {
    let codex_home = get_profile_codex_home(&profile_id);
    let sessions_dir = std::path::PathBuf::from(&codex_home).join("sessions");
    if !sessions_dir.exists() {
        return Ok(Vec::new());
    }

    let mut files = Vec::new();
    collect_rollout_files(&sessions_dir, &mut files);
    files.sort();

    let mut messages: Vec<ChatMessage> = Vec::new();

    for file in files {
        let Ok(content) = std::fs::read_to_string(&file) else { continue };
        for line in content.lines() {
            if line.trim().is_empty() || !line.contains("item_completed") {
                continue;
            }
            let Ok(v) = serde_json::from_str::<serde_json::Value>(line) else { continue };
            if v.get("type").and_then(|t| t.as_str()) != Some("event_msg") {
                continue;
            }
            let Some(payload) = v.get("payload") else { continue };
            if payload.get("type").and_then(|t| t.as_str()) != Some("item_completed") {
                continue;
            }
            let Some(item) = payload.get("item") else { continue };
            let item_type = item.get("type").and_then(|t| t.as_str()).unwrap_or("");
            let role = match item_type {
                "UserMessage" => "user",
                "AgentMessage" => "assistant",
                _ => continue,
            };
            let text = joined_content_text(item);
            if text.trim().is_empty() {
                continue;
            }
            let ts = v
                .get("timestamp")
                .and_then(|t| t.as_str())
                .and_then(|t| chrono::DateTime::parse_from_rfc3339(t).ok())
                .map(|d| d.timestamp_millis())
                .unwrap_or(0);
            let id = item
                .get("id")
                .and_then(|i| i.as_str())
                .unwrap_or("")
                .to_string();
            messages.push(ChatMessage {
                id,
                role: role.to_string(),
                text,
                timestamp_ms: ts,
            });
        }
    }

    messages.sort_by_key(|m| m.timestamp_ms);
    Ok(messages)
}
