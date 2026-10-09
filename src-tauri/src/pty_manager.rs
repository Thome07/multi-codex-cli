use crate::models::{PtyExitPayload, PtyOutputPayload, SessionInfo};
use parking_lot::Mutex;
use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub struct ActiveSession {
    pub info: SessionInfo,
    pub master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    pub writer: Arc<Mutex<Box<dyn Write + Send>>>,
    pub child: Arc<Mutex<Box<dyn Child + Send + Sync>>>,
}

pub struct PtyManager {
    sessions: Arc<Mutex<HashMap<String, ActiveSession>>>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Spawn a new PTY session running Codex CLI (or a custom command like `codex login`)
    pub fn spawn_session(
        &self,
        app_handle: AppHandle,
        session_id: String,
        profile_id: String,
        profile_name: String,
        profile_color: String,
        codex_bin: String,
        codex_home: String,
        working_dir: String,
        cols: u16,
        rows: u16,
        custom_args: Option<Vec<String>>,
        is_login_session: bool,
    ) -> Result<SessionInfo, String> {
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Falha ao alocar pseudo-terminal (PTY): {}", e))?;

        let mut cmd = CommandBuilder::new(&codex_bin);
        if is_login_session {
            if let Some(args) = custom_args {
                for arg in args {
                    cmd.arg(arg);
                }
            }
        } else {
            cmd.arg("--no-daemon");
            if let Some(args) = custom_args {
                for arg in args {
                    if arg != "--no-daemon" {
                        cmd.arg(arg);
                    }
                }
            }
        }

        // Set isolated environment variables
        cmd.env("CODEX_HOME", &codex_home);
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");
        cmd.env("FORCE_COLOR", "3");
        cmd.env("CLICOLOR_FORCE", "1");
        cmd.env("LANG", std::env::var("LANG").unwrap_or_else(|_| "pt_BR.UTF-8".to_string()));
        cmd.env("LC_ALL", std::env::var("LC_ALL").unwrap_or_else(|_| "pt_BR.UTF-8".to_string()));

        // Inherit PATH and user home
        if let Ok(path) = std::env::var("PATH") {
            cmd.env("PATH", path);
        }
        if let Ok(home) = std::env::var("HOME") {
            cmd.env("HOME", home);
        }

        // Set working directory
        cmd.cwd(&working_dir);

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Falha ao iniciar processo no PTY: {}", e))?;

        let pid = child.process_id().unwrap_or(0);
        let master = pair.master;
        let reader = master
            .try_clone_reader()
            .map_err(|e| format!("Falha ao clonar leitor do PTY: {}", e))?;
        let writer = master
            .take_writer()
            .map_err(|e| format!("Falha ao obter escritor do PTY: {}", e))?;

        let title = if is_login_session {
            format!("{} (Login)", profile_name)
        } else {
            profile_name.clone()
        };

        let session_info = SessionInfo {
            id: session_id.clone(),
            profile_id,
            profile_name,
            profile_color,
            cwd: working_dir,
            created_at: chrono::Utc::now().to_rfc3339(),
            pid,
            is_alive: true,
            is_login_session,
            title,
        };

        let active_session = ActiveSession {
            info: session_info.clone(),
            master: Arc::new(Mutex::new(master)),
            writer: Arc::new(Mutex::new(writer)),
            child: Arc::new(Mutex::new(child)),
        };

        {
            let mut lock = self.sessions.lock();
            lock.insert(session_id.clone(), active_session);
        }

        // Spawn background reader thread for this session
        let app_handle_clone = app_handle.clone();
        let sessions_map_clone = self.sessions.clone();
        let sid = session_id.clone();

        thread::spawn(move || {
            let mut buffer = [0u8; 4096];
            let mut reader = reader;

            loop {
                match reader.read(&mut buffer) {
                    Ok(0) => {
                        // EOF reached (child process exited)
                        break;
                    }
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buffer[..n]).to_string();
                        let _ = app_handle_clone.emit(
                            "pty-output",
                            PtyOutputPayload {
                                session_id: sid.clone(),
                                data,
                            },
                        );
                    }
                    Err(e) => {
                        // Check if session was killed or closed
                        let is_active = {
                            let lock = sessions_map_clone.lock();
                            lock.contains_key(&sid)
                        };
                        if is_active {
                            eprintln!("Erro de leitura no PTY da sessão {}: {}", sid, e);
                        }
                        break;
                    }
                }
            }

            // Process has exited or closed
            let mut exit_code: Option<i32> = None;
            {
                let mut lock = sessions_map_clone.lock();
                if let Some(mut session) = lock.remove(&sid) {
                    let mut child = session.child.lock();
                    let _ = child.kill();
                    if let Ok(status) = child.wait() {
                        exit_code = Some(status.exit_code() as i32);
                    }
                    session.info.is_alive = false;
                }
            }

            let _ = app_handle_clone.emit(
                "pty-exit",
                PtyExitPayload {
                    session_id: sid,
                    exit_code,
                },
            );
        });

        Ok(session_info)
    }

    /// Write user keyboard / paste input into the PTY
    pub fn write_to_session(&self, session_id: &str, data: &str) -> Result<(), String> {
        let lock = self.sessions.lock();
        if let Some(session) = lock.get(session_id) {
            let mut writer = session.writer.lock();
            writer
                .write_all(data.as_bytes())
                .map_err(|e| format!("Falha ao escrever no PTY: {}", e))?;
            writer.flush().map_err(|e| format!("Falha ao descarregar buffer do PTY: {}", e))?;
            Ok(())
        } else {
            Err(format!("Sessão não encontrada: {}", session_id))
        }
    }

    /// Resize PTY terminal dimensions
    pub fn resize_session(&self, session_id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let lock = self.sessions.lock();
        if let Some(session) = lock.get(session_id) {
            let master = session.master.lock();
            master
                .resize(PtySize {
                    rows,
                    cols,
                    pixel_width: 0,
                    pixel_height: 0,
                })
                .map_err(|e| format!("Falha ao redimensionar PTY: {}", e))?;
            Ok(())
        } else {
            Err(format!("Sessão não encontrada: {}", session_id))
        }
    }

    /// Gracefully terminate and remove session
    pub fn kill_session(&self, session_id: &str) -> Result<(), String> {
        let session_opt = {
            let mut lock = self.sessions.lock();
            lock.remove(session_id)
        };

        if let Some(session) = session_opt {
            let mut child = session.child.lock();
            // Attempt gentle signal/kill
            let _ = child.kill();
            // Small wait for process cleanup
            thread::sleep(Duration::from_millis(50));
            Ok(())
        } else {
            Ok(()) // Already closed or doesn't exist
        }
    }

    /// List all active sessions
    pub fn list_sessions(&self) -> Vec<SessionInfo> {
        let lock = self.sessions.lock();
        lock.values().map(|s| s.info.clone()).collect()
    }

    /// Count active sessions for a given profile ID
    pub fn count_profile_sessions(&self, profile_id: &str) -> usize {
        let lock = self.sessions.lock();
        lock.values().filter(|s| s.info.profile_id == profile_id).count()
    }
}
