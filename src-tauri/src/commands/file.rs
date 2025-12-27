use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub path: String,
    pub name: String,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
pub fn list_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let path = Path::new(&path);

    if !path.exists() {
        return Err("Directory does not exist".to_string());
    }

    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let mut entries: Vec<FileEntry> = Vec::new();

    // Read directory entries (only one level deep)
    let read_dir = fs::read_dir(path).map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in read_dir {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let entry_path = entry.path();
        let name = entry_path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        // Skip hidden files and common ignore patterns
        if name.starts_with('.') || name == "node_modules" || name == "target" || name == "__pycache__" {
            continue;
        }

        entries.push(FileEntry {
            path: entry_path.to_string_lossy().to_string(),
            name,
            is_directory: entry_path.is_dir(),
        });
    }

    // Sort: directories first, then alphabetically
    entries.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

#[tauri::command]
pub fn create_file(path: String) -> Result<(), String> {
    fs::File::create(&path).map_err(|e| format!("Failed to create file: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))
}

#[tauri::command]
pub fn delete_file(path: String) -> Result<(), String> {
    let path = Path::new(&path);
    if path.is_dir() {
        fs::remove_dir_all(path).map_err(|e| format!("Failed to delete directory: {}", e))
    } else {
        fs::remove_file(path).map_err(|e| format!("Failed to delete file: {}", e))
    }
}

#[tauri::command]
pub fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(&old_path, &new_path).map_err(|e| format!("Failed to rename file: {}", e))
}
