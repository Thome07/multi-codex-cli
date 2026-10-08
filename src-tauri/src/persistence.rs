use crate::models::{AppSettings, Profile};
use crate::paths::{get_profiles_file_path, get_settings_file_path, init_base_directories};
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;

/// Atomically write bytes to a file by writing to a temporary file in the same directory and renaming it
fn atomic_write_json<T: serde::Serialize>(path: &Path, data: &T) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("Falha ao criar diretório pai: {}", e))?;
        }
    }

    let temp_path = path.with_extension("tmp");
    let json_bytes = serde_json::to_vec_pretty(data)
        .map_err(|e| format!("Falha ao serializar dados para JSON: {}", e))?;

    {
        let mut file = File::create(&temp_path)
            .map_err(|e| format!("Falha ao criar arquivo temporário {:?}: {}", temp_path, e))?;
        file.write_all(&json_bytes)
            .map_err(|e| format!("Falha ao gravar no arquivo temporário: {}", e))?;
        file.sync_all()
            .map_err(|e| format!("Falha ao sincronizar dados em disco: {}", e))?;
    }

    fs::rename(&temp_path, path)
        .map_err(|e| format!("Falha ao substituir arquivo atomicamente {:?}: {}", path, e))?;

    Ok(())
}

pub fn load_profiles() -> Result<Vec<Profile>, String> {
    let _ = init_base_directories();
    let file_path = get_profiles_file_path();

    if !file_path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Falha ao ler arquivo de perfis {:?}: {}", file_path, e))?;

    if content.trim().is_empty() {
        return Ok(Vec::new());
    }

    let mut profiles: Vec<Profile> = serde_json::from_str(&content)
        .map_err(|e| format!("Falha ao deserializar perfis: {}", e))?;

    // Sort by order_index
    profiles.sort_by_key(|p| p.order_index);

    Ok(profiles)
}

pub fn save_profiles(profiles: &[Profile]) -> Result<(), String> {
    let _ = init_base_directories();
    let file_path = get_profiles_file_path();
    atomic_write_json(&file_path, &profiles)
}

pub fn load_settings() -> Result<AppSettings, String> {
    let _ = init_base_directories();
    let file_path = get_settings_file_path();

    if !file_path.exists() {
        return Ok(AppSettings::default());
    }

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Falha ao ler configurações {:?}: {}", file_path, e))?;

    if content.trim().is_empty() {
        return Ok(AppSettings::default());
    }

    let settings: AppSettings = serde_json::from_str(&content)
        .map_err(|e| format!("Falha ao deserializar configurações: {}", e))?;

    Ok(settings)
}

pub fn save_settings(settings: &AppSettings) -> Result<(), String> {
    let _ = init_base_directories();
    let file_path = get_settings_file_path();
    atomic_write_json(&file_path, settings)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_atomic_write_and_read() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.json");

        let settings = AppSettings::default();
        atomic_write_json(&file_path, &settings).unwrap();

        assert!(file_path.exists());
        let content = fs::read_to_string(&file_path).unwrap();
        let loaded: AppSettings = serde_json::from_str(&content).unwrap();
        assert_eq!(loaded.terminal_font_size, 13);
    }
}
