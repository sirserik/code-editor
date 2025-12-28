use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::Path;
use walkdir::WalkDir;
use regex::Regex;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub path: String,
    pub name: String,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub path: String,
    pub line: i32,
    pub content: String,
    #[serde(rename = "match")]
    pub match_text: String,
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

    let read_dir = fs::read_dir(path).map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in read_dir {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let entry_path = entry.path();
        let name = entry_path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        // Skip common ignore patterns but allow dotfiles
        if name == "node_modules" || name == "target" || name == "__pycache__" || name == ".git" {
            continue;
        }

        entries.push(FileEntry {
            path: entry_path.to_string_lossy().to_string(),
            name,
            is_directory: entry_path.is_dir(),
        });
    }

    // Sort: directories first, then alphabetically (case-insensitive)
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
    // Create parent directories if needed
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent directories: {}", e))?;
    }
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

#[tauri::command]
pub fn file_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

#[tauri::command]
pub fn search_in_project(
    root_path: String,
    query: String,
    include: Option<String>,
    exclude: Option<String>,
    case_sensitive: bool,
    use_regex: bool,
) -> Result<Vec<SearchResult>, String> {
    let mut results = Vec::new();
    let max_results = 500;

    // Parse exclude patterns
    let exclude_patterns: Vec<&str> = exclude
        .as_deref()
        .unwrap_or("node_modules,dist,.git,target")
        .split(',')
        .map(|s| s.trim())
        .collect();

    // Parse include patterns (file extensions)
    let include_patterns: Option<Vec<&str>> = include.as_ref().map(|i| {
        i.split(',')
            .map(|s| s.trim().trim_start_matches('*').trim_start_matches('.'))
            .collect()
    });

    // Compile regex if needed
    let search_regex = if use_regex {
        let pattern = if case_sensitive { &query } else { &format!("(?i){}", query) };
        Some(Regex::new(pattern).map_err(|e| format!("Invalid regex: {}", e))?)
    } else {
        None
    };

    for entry in WalkDir::new(&root_path)
        .follow_links(true)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            !exclude_patterns.iter().any(|p| name.contains(p))
        })
    {
        if results.len() >= max_results {
            break;
        }

        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        if !entry.file_type().is_file() {
            continue;
        }

        let path = entry.path();
        let extension = path.extension()
            .map(|e| e.to_string_lossy().to_string())
            .unwrap_or_default();

        // Check include patterns
        if let Some(ref patterns) = include_patterns {
            if !patterns.is_empty() && !patterns.iter().any(|p| extension == *p || p.is_empty()) {
                continue;
            }
        }

        // Skip binary files
        let file_name = path.file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();
        if is_binary_file(&extension, &file_name) {
            continue;
        }

        // Read and search file
        if let Ok(file) = fs::File::open(path) {
            let reader = BufReader::new(file);

            for (line_num, line) in reader.lines().enumerate() {
                if results.len() >= max_results {
                    break;
                }

                if let Ok(line_content) = line {
                    let found = if let Some(ref regex) = search_regex {
                        regex.is_match(&line_content)
                    } else if case_sensitive {
                        line_content.contains(&query)
                    } else {
                        line_content.to_lowercase().contains(&query.to_lowercase())
                    };

                    if found {
                        results.push(SearchResult {
                            path: path.to_string_lossy().to_string(),
                            line: (line_num + 1) as i32,
                            content: line_content.trim().chars().take(200).collect(),
                            match_text: query.clone(),
                        });
                    }
                }
            }
        }
    }

    Ok(results)
}

#[tauri::command]
pub fn get_all_files(root_path: String) -> Result<Vec<String>, String> {
    let mut files = Vec::new();
    let max_files = 10000;

    let exclude_patterns = ["node_modules", "dist", ".git", "target", "__pycache__", ".next", "build"];

    for entry in WalkDir::new(&root_path)
        .follow_links(true)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            !exclude_patterns.iter().any(|p| name == *p)
        })
    {
        if files.len() >= max_files {
            break;
        }

        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        if !entry.file_type().is_file() {
            continue;
        }

        let path = entry.path();
        let extension = path.extension()
            .map(|e| e.to_string_lossy().to_string())
            .unwrap_or_default();
        let file_name = path.file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        // Skip binary files
        if is_binary_file(&extension, &file_name) {
            continue;
        }

        files.push(path.to_string_lossy().to_string());
    }

    Ok(files)
}

fn is_binary_file(extension: &str, file_name: &str) -> bool {
    let binary_extensions = [
        "png", "jpg", "jpeg", "gif", "bmp", "ico", "webp", "svg",
        "mp3", "mp4", "avi", "mkv", "mov", "wav", "flac",
        "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
        "zip", "tar", "gz", "rar", "7z",
        "exe", "dll", "so", "dylib",
        "woff", "woff2", "ttf", "otf", "eot",
        "db", "sqlite", "sqlite3",
        "o", "a", "pyc", "class",
    ];

    let binary_names = [
        "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
        "Cargo.lock", "composer.lock", "Gemfile.lock",
    ];

    binary_extensions.contains(&extension.to_lowercase().as_str()) ||
    binary_names.contains(&file_name)
}
