use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};

const APP_DIR_NAME: &str = "codex-manager";

/// Returns ~/.config/codex-manager
pub fn get_config_dir() -> PathBuf {
    if let Some(config_home) = std::env::var_os("XDG_CONFIG_HOME") {
        PathBuf::from(config_home).join(APP_DIR_NAME)
    } else if let Some(home) = dirs::home_dir() {
        home.join(".config").join(APP_DIR_NAME)
    } else {
        PathBuf::from(".").join(".codex-manager-config")
    }
}

/// Returns ~/.local/share/codex-manager
pub fn get_data_dir() -> PathBuf {
    if let Some(data_home) = std::env::var_os("XDG_DATA_HOME") {
        PathBuf::from(data_home).join(APP_DIR_NAME)
    } else if let Some(home) = dirs::home_dir() {
        home.join(".local").join("share").join(APP_DIR_NAME)
    } else {
        PathBuf::from(".").join(".codex-manager-data")
    }
}

/// Returns ~/.local/state/codex-manager
pub fn get_state_dir() -> PathBuf {
    if let Some(state_home) = std::env::var_os("XDG_STATE_HOME") {
        PathBuf::from(state_home).join(APP_DIR_NAME)
    } else if let Some(home) = dirs::home_dir() {
        home.join(".local").join("state").join(APP_DIR_NAME)
    } else {
        PathBuf::from(".").join(".codex-manager-state")
    }
}

/// Path to profiles metadata: ~/.config/codex-manager/profiles.json
pub fn get_profiles_file_path() -> PathBuf {
    get_config_dir().join("profiles.json")
}

/// Path to settings file: ~/.config/codex-manager/settings.json
pub fn get_settings_file_path() -> PathBuf {
    get_config_dir().join("settings.json")
}

/// Path to log directory: ~/.local/state/codex-manager/logs
pub fn get_logs_dir() -> PathBuf {
    get_state_dir().join("logs")
}

/// Path to profile root: ~/.local/share/codex-manager/profiles/<profile_id>
pub fn get_profile_dir(profile_id: &str) -> PathBuf {
    // Validate profile_id to prevent path traversal
    let sanitized_id: String = profile_id
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
        .collect();
    get_data_dir().join("profiles").join(sanitized_id)
}

/// Path to profile CODEX_HOME: ~/.local/share/codex-manager/profiles/<profile_id>/codex-home
pub fn get_profile_codex_home(profile_id: &str) -> PathBuf {
    get_profile_dir(profile_id).join("codex-home")
}

/// Ensure directory exists with secure permissions (0700 on Unix)
pub fn ensure_secure_dir(path: &Path) -> std::io::Result<()> {
    if !path.exists() {
        fs::create_dir_all(path)?;
        // Set permissions to 0700 (owner only read/write/execute)
        let perms = fs::Permissions::from_mode(0o700);
        let _ = fs::set_permissions(path, perms);
    }
    Ok(())
}

/// Initialize all essential base directories
pub fn init_base_directories() -> std::io::Result<()> {
    ensure_secure_dir(&get_config_dir())?;
    ensure_secure_dir(&get_data_dir())?;
    ensure_secure_dir(&get_data_dir().join("profiles"))?;
    ensure_secure_dir(&get_state_dir())?;
    ensure_secure_dir(&get_logs_dir())?;
    Ok(())
}

/// Validate that a working directory path is safe and exists
pub fn validate_working_dir(path_str: &str) -> Result<PathBuf, String> {
    let path = Path::new(path_str);
    if !path.exists() {
        return Err(format!("O diretório especificado não existe: {}", path_str));
    }
    if !path.is_dir() {
        return Err(format!("O caminho especificado não é um diretório: {}", path_str));
    }
    path.canonicalize().map_err(|e| format!("Falha ao resolver caminho canônico: {}", e))
}
