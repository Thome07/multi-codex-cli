use crate::models::{AuthStatus, CodexBinaryInfo, CodexDetectionResult, CodexUpdateResult};
use crate::paths::ensure_secure_dir;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

/// Parse semver from version string (e.g. "codex-cli 0.162.0")
pub fn parse_version_tuple(version_str: &str) -> (u32, u32, u32) {
    for part in version_str.split_whitespace() {
        let clean = part.trim_start_matches('v');
        let nums: Vec<&str> = clean.split('.').collect();
        if nums.len() >= 2 {
            let maj = nums[0].parse::<u32>().unwrap_or(0);
            let min = nums[1].parse::<u32>().unwrap_or(0);
            let patch = nums.get(2).and_then(|p| p.parse::<u32>().ok()).unwrap_or(0);
            return (maj, min, patch);
        }
    }
    (0, 0, 0)
}

/// Discover all available Codex binary candidates on the system
pub fn discover_all_codex_binaries(custom_path: Option<&str>) -> Vec<(PathBuf, Option<String>, (u32, u32, u32))> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Some(cp) = custom_path {
        let p = PathBuf::from(cp);
        if p.is_file() {
            candidates.push(p);
        }
    }

    // Common system locations
    for path_str in &[
        "/usr/local/bin/codex",
        "/usr/bin/codex",
        "/bin/codex",
    ] {
        let p = PathBuf::from(path_str);
        if p.is_file() && !candidates.iter().any(|c| c == &p) {
            candidates.push(p);
        }
    }

    // System PATH via which
    if let Ok(p) = which::which("codex") {
        if !candidates.iter().any(|c| c == &p) {
            candidates.push(p);
        }
    }

    // User ~/.local/bin/codex
    if let Some(home) = dirs::home_dir() {
        let user_bin = home.join(".local").join("bin").join("codex");
        if user_bin.is_file() && !candidates.iter().any(|c| c == &user_bin) {
            candidates.push(user_bin);
        }
    }

    // Test execution and get version for each candidate
    let mut results = Vec::new();
    for p in candidates {
        if let Ok(output) = Command::new(&p).arg("--version").output() {
            if output.status.success() {
                let v_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
                let semver = parse_version_tuple(&v_str);
                results.push((p, Some(v_str), semver));
            } else {
                results.push((p, None, (0, 0, 0)));
            }
        }
    }

    results
}

/// Locate the best Codex CLI executable on the system.
/// If custom_path is set, it takes precedence.
/// Otherwise, selects the candidate with the highest version!
pub fn find_codex_binary(custom_path: Option<&str>) -> Option<PathBuf> {
    if let Some(cp) = custom_path {
        let p = PathBuf::from(cp);
        if p.is_file() {
            return Some(p);
        }
    }

    let all = discover_all_codex_binaries(None);
    if all.is_empty() {
        return None;
    }

    // Sort by version descending. If versions are equal, prefer /usr/local/bin or system path over ~/.local/bin
    let mut sorted = all;
    sorted.sort_by(|a, b| {
        b.2.cmp(&a.2).then_with(|| {
            let a_is_usr = a.0.starts_with("/usr");
            let b_is_usr = b.0.starts_with("/usr");
            b_is_usr.cmp(&a_is_usr)
        })
    });

    sorted.first().map(|(p, _, _)| p.clone())
}

/// Detect the Codex CLI, verify execution, and extract version and all candidate binaries
pub fn detect_codex_cli(custom_path: Option<&str>) -> CodexDetectionResult {
    let all = discover_all_codex_binaries(custom_path);
    let chosen = find_codex_binary(custom_path);
    let active_path_str = chosen.as_ref().map(|p| p.to_string_lossy().to_string());

    let all_candidates: Vec<CodexBinaryInfo> = all
        .iter()
        .map(|(p, v, _)| {
            let p_str = p.to_string_lossy().to_string();
            let is_active = Some(&p_str) == active_path_str.as_ref();
            CodexBinaryInfo {
                path: p_str,
                version: v.clone(),
                is_active,
            }
        })
        .collect();

    let binary = match chosen {
        Some(b) => b,
        None => {
            return CodexDetectionResult {
                found: false,
                path: None,
                version: None,
                is_official: false,
                error: Some("OpenAI Codex CLI não foi encontrado no PATH nem nos diretórios padrão.".to_string()),
                all_candidates,
            }
        }
    };

    let binary_str = binary.to_string_lossy().to_string();

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
                    all_candidates,
                }
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                CodexDetectionResult {
                    found: true,
                    path: Some(binary_str),
                    version: None,
                    is_official: false,
                    error: Some(format!("Falha ao executar codex --version: {}", stderr)),
                    all_candidates,
                }
            }
        }
        Err(e) => CodexDetectionResult {
            found: false,
            path: Some(binary_str),
            version: None,
            is_official: false,
            error: Some(format!("Não foi possível iniciar o executável do Codex: {}", e)),
            all_candidates,
        },
    }
}

/// Update the Codex CLI globally via `sudo npm install -g @openai/codex@latest`
/// and sync ~/.local/bin if present.
pub fn update_codex_cli_executable(sudo_password: Option<&str>) -> CodexUpdateResult {
    let password = sudo_password.filter(|s| !s.is_empty()).unwrap_or("golg3200");

    let old_detection = detect_codex_cli(None);
    let old_version = old_detection.version.clone();

    // 1. Run sudo npm install -g @openai/codex@latest
    let child_res = Command::new("sudo")
        .args(["-S", "npm", "install", "-g", "@openai/codex@latest"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn();

    let mut child = match child_res {
        Ok(c) => c,
        Err(e) => {
            return CodexUpdateResult {
                success: false,
                old_version,
                new_version: None,
                message: format!("Falha ao iniciar processo sudo: {}", e),
                path: old_detection.path,
            };
        }
    };

    if let Some(mut stdin) = child.stdin.take() {
        use std::io::Write;
        let _ = writeln!(stdin, "{}", password);
    }

    let output = match child.wait_with_output() {
        Ok(o) => o,
        Err(e) => {
            return CodexUpdateResult {
                success: false,
                old_version,
                new_version: None,
                message: format!("Erro ao aguardar processo de atualização: {}", e),
                path: old_detection.path,
            };
        }
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return CodexUpdateResult {
            success: false,
            old_version,
            new_version: None,
            message: format!("Falha na atualização do npm via sudo: {}", stderr),
            path: old_detection.path,
        };
    }

    // 2. Also update ~/.local if present, so both copies remain identical
    if let Some(home) = dirs::home_dir() {
        let user_bin = home.join(".local").join("bin").join("codex");
        if user_bin.is_file() {
            let _ = Command::new("npm")
                .args(["--prefix", home.join(".local").to_string_lossy().as_ref(), "install", "-g", "@openai/codex@latest"])
                .output();
        }
    }

    // 3. Re-detect after update
    let new_detection = detect_codex_cli(None);
    let new_version = new_detection.version.clone();

    CodexUpdateResult {
        success: true,
        old_version,
        new_version: new_version.clone(),
        message: format!(
            "Codex CLI atualizado com sucesso para {}",
            new_version.unwrap_or_else(|| "versão mais recente".to_string())
        ),
        path: new_detection.path,
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
