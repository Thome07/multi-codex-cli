#[cfg(test)]
mod tests {
    use crate::paths::get_profile_codex_home;
    use tempfile::tempdir;
    use uuid::Uuid;

    #[test]
    fn test_profile_isolation_paths() {
        let id1 = Uuid::new_v4().to_string();
        let id2 = Uuid::new_v4().to_string();

        let home1 = get_profile_codex_home(&id1);
        let home2 = get_profile_codex_home(&id2);

        assert_ne!(home1, home2);
        assert!(home1.to_string_lossy().contains(&id1));
        assert!(home2.to_string_lossy().contains(&id2));
    }

    #[test]
    fn test_profile_lifecycle_mock() {
        let dir = tempdir().unwrap();
        let profiles_file = dir.path().join("profiles.json");

        // Create profiles
        let p1 = crate::models::Profile {
            id: Uuid::new_v4().to_string(),
            name: "Codex Pessoal".to_string(),
            description: Some("Conta primária".to_string()),
            color: "#10b981".to_string(),
            icon: None,
            codex_home: dir.path().join("p1-home").to_string_lossy().to_string(),
            default_project_dir: None,
            created_at: chrono::Utc::now().to_rfc3339(),
            last_used_at: None,
            order_index: 0,
            is_pinned: false,
        };

        let p2 = crate::models::Profile {
            id: Uuid::new_v4().to_string(),
            name: "Codex Trabalho".to_string(),
            description: None,
            color: "#3b82f6".to_string(),
            icon: None,
            codex_home: dir.path().join("p2-home").to_string_lossy().to_string(),
            default_project_dir: None,
            created_at: chrono::Utc::now().to_rfc3339(),
            last_used_at: None,
            order_index: 1,
            is_pinned: true,
        };

        let list = vec![p1.clone(), p2.clone()];
        let json_str = serde_json::to_string(&list).unwrap();
        std::fs::write(&profiles_file, json_str).unwrap();

        // Read and verify
        let read_back: Vec<crate::models::Profile> =
            serde_json::from_str(&std::fs::read_to_string(&profiles_file).unwrap()).unwrap();

        assert_eq!(read_back.len(), 2);
        assert_eq!(read_back[0].name, "Codex Pessoal");
        assert_eq!(read_back[1].name, "Codex Trabalho");
        assert!(read_back[1].is_pinned);
    }

    #[test]
    fn test_pty_echo_execution() {
        use portable_pty::{native_pty_system, CommandBuilder, PtySize};
        use std::io::Read;

        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .unwrap();

        let mut cmd = CommandBuilder::new("echo");
        cmd.arg("CODEX_MANAGER_PTY_OK");

        let mut child = pair.slave.spawn_command(cmd).unwrap();
        let mut reader = pair.master.try_clone_reader().unwrap();

        let mut output = String::new();
        let mut buffer = [0u8; 256];
        loop {
            match reader.read(&mut buffer) {
                Ok(0) => break,
                Ok(n) => {
                    output.push_str(&String::from_utf8_lossy(&buffer[..n]));
                    if output.contains("CODEX_MANAGER_PTY_OK") {
                        break;
                    }
                }
                Err(_) => break,
            }
        }

        let _ = child.wait();
        assert!(output.contains("CODEX_MANAGER_PTY_OK"));
    }
}
