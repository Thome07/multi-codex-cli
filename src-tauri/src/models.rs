use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: String,
    pub icon: Option<String>,
    pub codex_home: String,
    pub default_project_dir: Option<String>,
    pub created_at: String,
    pub last_used_at: Option<String>,
    pub order_index: usize,
    pub is_pinned: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CreateProfileRequest {
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub default_project_dir: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProfileRequest {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub default_project_dir: Option<String>,
    pub is_pinned: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "status", content = "detail", rename_all = "snake_case")]
pub enum AuthStatus {
    LoggedIn(String),
    NotLoggedIn,
    Authenticating,
    Error(String),
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileSummary {
    pub profile: Profile,
    pub auth_status: AuthStatus,
    pub active_sessions_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub codex_path: Option<String>,
    pub default_working_dir: Option<String>,
    pub terminal_font_family: String,
    pub terminal_font_size: u16,
    pub terminal_line_height: f32,
    pub terminal_cursor_style: String, // "block" | "underline" | "bar"
    pub terminal_cursor_blink: bool,
    pub terminal_scrollback: u32,
    pub theme: String,
    pub confirm_close_session: bool,
    pub warn_duplicate_working_dir: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            codex_path: None,
            default_working_dir: None,
            terminal_font_family: "JetBrains Mono, Menlo, Monaco, Consolas, 'Courier New', monospace".to_string(),
            terminal_font_size: 13,
            terminal_line_height: 1.25,
            terminal_cursor_style: "block".to_string(),
            terminal_cursor_blink: true,
            terminal_scrollback: 5000,
            theme: "dark".to_string(),
            confirm_close_session: true,
            warn_duplicate_working_dir: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionInfo {
    pub id: String,
    pub profile_id: String,
    pub profile_name: String,
    pub profile_color: String,
    pub cwd: String,
    pub created_at: String,
    pub pid: u32,
    pub is_alive: bool,
    pub is_login_session: bool,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexBinaryInfo {
    pub path: String,
    pub version: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexDetectionResult {
    pub found: bool,
    pub path: Option<String>,
    pub version: Option<String>,
    pub is_official: bool,
    pub error: Option<String>,
    #[serde(default)]
    pub all_candidates: Vec<CodexBinaryInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexUpdateResult {
    pub success: bool,
    pub old_version: Option<String>,
    pub new_version: Option<String>,
    pub message: String,
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PtyOutputPayload {
    pub session_id: String,
    pub data: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PtyExitPayload {
    pub session_id: String,
    pub exit_code: Option<i32>,
}
