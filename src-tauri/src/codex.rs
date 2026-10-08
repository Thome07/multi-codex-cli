use crate::models::{AuthStatus, CodexDetectionResult};
use crate::paths::ensure_secure_dir;
use std::path::{Path, PathBuf};
use std::process::Command;

/// Locate the Codex CLI executable on the system
pub fn find_codex_binary(custom_path: Option<&str>) -> Option<PathBuf> {
    // 1. Check custom configured path if provided
    if let Some(cp) = custom_path {
        let p = PathBuf::from(cp);
        if p.is_file() {
            return Some(p);
        }
    }

    // 2. Check standard user ~/.local/bin/codex
    if let Some(home) = dirs::home_dir() {
        let user_bin = home.join(".local").join("bin").join("codex");
        if user_bin.is_file() {
            return Some(user_bin);
        }
    }

    // 3. Check system PATH via which crate
    if let Ok(p) = which::which("codex") {
        return Some(p);
    }

    // 4. Common fallback locations on Linux / Fedora
    for fallback in &["/usr/local/bin/codex", "/usr/bin/codex", "/bin/codex"] {
        let p = PathBuf::from(fallback);
        if p.is_file() {
            return Some(p);
        }
    }

    None
}

/// Detect the Codex CLI, verify execution, and extract version
pub fn detect_codex_cli(custom_path: Option<&str>) -> CodexDetectionResult {
    let binary = match find_codex_binary(custom_path) {
        Some(b) => b,
        None => {
            return CodexDetectionResult {
                found: false,
                path: None,
                version: None,
                is_official: false,
                error: Some("OpenAI Codex CLI não foi encontrado no PATH nem nos diretórios padrão.".to_string()),
            }
        }
    };

    let binary_str = binary.to_string_lossy().to_string();

    // Execute --version to verify it runs and is the official CLI
    match Command::new(&binary).arg("--version").output() {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                let is_official = stdout.to_lowercase().contains("codex-cli") || stdout.to_lowercase().contains("codex");
                CodexDetectionResult {
                    found: true,
                    path: Some(binary_str),
                    version: Some(stdout),
                    is_official,
                    error: None,
                }
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                CodexDetectionResult {
                    found: true,
                    path: Some(binary_str),
                    version: None,
                    is_official: false,
                    error: Some(format!("Falha ao executar codex --version: {}", stderr)),
                }
            }
        }
        Err(e) => CodexDetectionResult {
            found: false,
            path: Some(binary_str),
            version: None,
            is_official: false,
            error: Some(format!("Não foi possível iniciar o executável do Codex: {}", e)),
        },
    }
}

/// Check the authentication status for a specific profile by inspecting its isolated CODEX_HOME
pub fn check_profile_auth_status(codex_bin: &str, codex_home: &str) -> AuthStatus {
    let home_path = Path::new(codex_home);
    if let Err(e) = ensure_secure_dir(home_path) {
        return AuthStatus::Error(format!("Não foi possível criar CODEX_HOME: {}", e));
    }

    // Run `codex login status` with CODEX_HOME set
    let output_result = Command::new(codex_bin)
        .arg("login")
        .arg("status")
        .env("CODEX_HOME", codex_home)
        .output();

    match output_result {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            let combined = format!("{}\n{}", stdout, stderr).to_lowercase();

            if combined.contains("logged in using") {
                // Extract detail if possible (e.g. "ChatGPT" or API key)
                let detail = if combined.contains("chatgpt") {
                    "ChatGPT".to_string()
                } else if combined.contains("api key") {
                    "API Key".to_string()
                } else {
                    stdout.clone()
                };
                AuthStatus::LoggedIn(detail)
            } else if combined.contains("not logged in") {
                AuthStatus::NotLoggedIn
            } else if output.status.success() {
                AuthStatus::LoggedIn("Conectado".to_string())
            } else {
                // Check if auth.json exists as a fallback check
                let auth_file = home_path.join("auth.json");
                if auth_file.exists() && auth_file.metadata().map(|m| m.len() > 0).unwrap_or(false) {
                    AuthStatus::LoggedIn("ChatGPT (Sessão salva)".to_string())
                } else {
                    AuthStatus::NotLoggedIn
                }
            }
        }
        Err(e) => AuthStatus::Error(format!("Erro ao executar verificação de login: {}", e)),
    }
}

/// Perform logout for a specific profile's CODEX_HOME
pub fn logout_profile_session(codex_bin: &str, codex_home: &str) -> Result<(), String> {
    let home_path = Path::new(codex_home);
    if !home_path.exists() {
        return Ok(());
    }

    // Execute official `codex logout`
    let result = Command::new(codex_bin)
        .arg("logout")
        .env("CODEX_HOME", codex_home)
        .output();

    match result {
        Ok(output) => {
            if output.status.success() {
                // Also ensure auth.json is removed if still lingering
                let auth_file = home_path.join("auth.json");
                if auth_file.exists() {
                    let _ = std::fs::remove_file(auth_file);
                }
                Ok(())
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                // As fallback, remove auth.json directly from isolated directory
                let auth_file = home_path.join("auth.json");
                if auth_file.exists() {
                    let _ = std::fs::remove_file(auth_file);
                    Ok(())
                } else {
                    Err(format!("Falha no logout: {}", stderr))
                }
            }
        }
        Err(e) => {
            // As fallback, remove auth.json directly
            let auth_file = home_path.join("auth.json");
            if auth_file.exists() {
                let _ = std::fs::remove_file(auth_file);
                Ok(())
            } else {
                Err(format!("Erro ao invocar comando de logout: {}", e))
            }
        }
    }
}
