use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;
use std::collections::HashMap;
use std::sync::Mutex;
use walkdir::WalkDir;
use regex::Regex;
use tauri::{AppHandle, Emitter};

// Search state management
static SEARCH_COUNTER: AtomicU32 = AtomicU32::new(0);
static ACTIVE_SEARCHES: once_cell::sync::Lazy<Mutex<HashMap<u32, Arc<AtomicBool>>>> =
    once_cell::sync::Lazy::new(|| Mutex::new(HashMap::new()));

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

// ============================================
// LARGE FILE HANDLING
// ============================================

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub size: u64,
    pub is_binary: bool,
    pub line_count: Option<u64>,
}

/// Get file info without reading content
#[tauri::command]
pub fn get_file_info(path: String) -> Result<FileInfo, String> {
    let file_path = Path::new(&path);
    let metadata = fs::metadata(&file_path)
        .map_err(|e| format!("Failed to get file info: {}", e))?;

    let extension = file_path.extension()
        .map(|e| e.to_string_lossy().to_string())
        .unwrap_or_default();
    let file_name = file_path.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    let is_binary = is_binary_file(&extension, &file_name);

    // Count lines for text files under 10MB
    let line_count = if !is_binary && metadata.len() < 10 * 1024 * 1024 {
        if let Ok(file) = fs::File::open(&file_path) {
            let reader = BufReader::new(file);
            Some(reader.lines().count() as u64)
        } else {
            None
        }
    } else {
        None
    };

    Ok(FileInfo {
        path,
        size: metadata.len(),
        is_binary,
        line_count,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileChunk {
    pub content: String,
    pub start_line: u64,
    pub end_line: u64,
    pub total_lines: u64,
    pub has_more: bool,
}

/// Read file in chunks by line range
#[tauri::command]
pub fn read_file_chunk(
    path: String,
    start_line: u64,
    line_count: u64,
) -> Result<FileChunk, String> {
    let file = fs::File::open(&path)
        .map_err(|e| format!("Failed to open file: {}", e))?;
    let reader = BufReader::new(file);

    let mut content = String::new();
    let mut current_line: u64 = 0;
    let mut lines_read: u64 = 0;
    let end_line = start_line + line_count;

    for line_result in reader.lines() {
        current_line += 1;

        if current_line < start_line {
            continue;
        }

        if current_line >= end_line {
            break;
        }

        if let Ok(line) = line_result {
            if !content.is_empty() {
                content.push('\n');
            }
            content.push_str(&line);
            lines_read += 1;
        }
    }

    // Count total lines (cached would be better but this works)
    let file2 = fs::File::open(&path)
        .map_err(|e| format!("Failed to open file: {}", e))?;
    let total_lines = BufReader::new(file2).lines().count() as u64;

    Ok(FileChunk {
        content,
        start_line,
        end_line: start_line + lines_read,
        total_lines,
        has_more: start_line + lines_read < total_lines,
    })
}

/// Read file by byte range (for very large files)
#[tauri::command]
pub fn read_file_bytes(
    path: String,
    offset: u64,
    length: u64,
) -> Result<String, String> {
    use std::io::{Read, Seek, SeekFrom};

    let mut file = fs::File::open(&path)
        .map_err(|e| format!("Failed to open file: {}", e))?;

    file.seek(SeekFrom::Start(offset))
        .map_err(|e| format!("Failed to seek: {}", e))?;

    let mut buffer = vec![0u8; length as usize];
    let bytes_read = file.read(&mut buffer)
        .map_err(|e| format!("Failed to read: {}", e))?;

    buffer.truncate(bytes_read);

    String::from_utf8(buffer)
        .map_err(|e| format!("Invalid UTF-8: {}", e))
}

// Large file threshold (1MB)
const LARGE_FILE_THRESHOLD: u64 = 1024 * 1024;

/// Smart read - returns full content for small files, first chunk for large files
#[tauri::command]
pub fn read_file_smart(path: String) -> Result<SmartFileContent, String> {
    let file_path = Path::new(&path);
    let metadata = fs::metadata(&file_path)
        .map_err(|e| format!("Failed to get file info: {}", e))?;

    let extension = file_path.extension()
        .map(|e| e.to_string_lossy().to_string())
        .unwrap_or_default();
    let file_name = file_path.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    if is_binary_file(&extension, &file_name) {
        return Err("Cannot read binary file".to_string());
    }

    let size = metadata.len();

    if size <= LARGE_FILE_THRESHOLD {
        // Small file - read entirely
        let content = fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read file: {}", e))?;
        let line_count = content.lines().count() as u64;

        Ok(SmartFileContent {
            content,
            is_partial: false,
            total_size: size,
            total_lines: line_count,
            loaded_lines: line_count,
        })
    } else {
        // Large file - read first 1000 lines
        let chunk = read_file_chunk(path, 1, 1000)?;

        Ok(SmartFileContent {
            content: chunk.content,
            is_partial: true,
            total_size: size,
            total_lines: chunk.total_lines,
            loaded_lines: chunk.end_line - chunk.start_line,
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SmartFileContent {
    pub content: String,
    pub is_partial: bool,
    pub total_size: u64,
    pub total_lines: u64,
    pub loaded_lines: u64,
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

// ============================================
// OPTIMIZED COMMANDS
// ============================================

#[derive(Debug, Serialize, Deserialize)]
pub struct FuzzySearchResult {
    pub path: String,
    pub name: String,
    pub score: i32,
    pub directory: String,
}

/// Fuzzy search files with scoring - much faster than JS implementation
#[tauri::command]
pub fn fuzzy_search_files(
    root_path: String,
    query: String,
    limit: Option<usize>,
) -> Result<Vec<FuzzySearchResult>, String> {
    let limit = limit.unwrap_or(50);
    let query_lower = query.to_lowercase();
    let query_chars: Vec<char> = query_lower.chars().collect();

    if query_chars.is_empty() {
        return Ok(Vec::new());
    }

    let exclude_patterns = ["node_modules", "dist", ".git", "target", "__pycache__", ".next", "build", ".svelte-kit"];
    let mut results: Vec<FuzzySearchResult> = Vec::new();

    for entry in WalkDir::new(&root_path)
        .follow_links(true)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            !exclude_patterns.iter().any(|p| name == *p)
        })
    {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        if !entry.file_type().is_file() {
            continue;
        }

        let path = entry.path();
        let name = path.file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();
        let name_lower = name.to_lowercase();

        // Calculate fuzzy match score
        if let Some(score) = fuzzy_match_score(&query_chars, &name_lower) {
            let full_path = path.to_string_lossy().to_string();
            let directory = path.parent()
                .map(|p| p.strip_prefix(&root_path).unwrap_or(p))
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();

            results.push(FuzzySearchResult {
                path: full_path,
                name,
                score,
                directory,
            });
        }
    }

    // Sort by score (higher is better), then by name length (shorter is better)
    results.sort_by(|a, b| {
        b.score.cmp(&a.score)
            .then_with(|| a.name.len().cmp(&b.name.len()))
    });

    results.truncate(limit);
    Ok(results)
}

/// Fuzzy matching algorithm - returns score if matches, None if doesn't match
fn fuzzy_match_score(query: &[char], target: &str) -> Option<i32> {
    let target_chars: Vec<char> = target.chars().collect();
    let mut score: i32 = 0;
    let mut query_idx = 0;
    let mut prev_match_idx: Option<usize> = None;
    let mut consecutive = 0;

    for (i, &c) in target_chars.iter().enumerate() {
        if query_idx < query.len() && c == query[query_idx] {
            // Bonus for consecutive matches
            if let Some(prev) = prev_match_idx {
                if i == prev + 1 {
                    consecutive += 1;
                    score += 5 * consecutive; // Consecutive match bonus
                } else {
                    consecutive = 0;
                }
            }

            // Bonus for matching at word boundaries
            if i == 0 || !target_chars[i - 1].is_alphanumeric() {
                score += 10; // Word boundary bonus
            }

            // Bonus for matching uppercase in camelCase
            if c.is_uppercase() {
                score += 5;
            }

            score += 1; // Base match score
            prev_match_idx = Some(i);
            query_idx += 1;
        }
    }

    if query_idx == query.len() {
        // All query characters matched
        // Bonus for shorter names (more relevant)
        score += (100 - target.len().min(100)) as i32;
        Some(score)
    } else {
        None
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FlatFileEntry {
    pub path: String,
    pub name: String,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
    pub depth: usize,
    #[serde(rename = "isLast")]
    pub is_last: bool,
    pub expanded: bool,
    #[serde(rename = "hasChildren")]
    pub has_children: bool,
}

/// Get flattened file tree - computed once in Rust instead of recursively in JS
#[tauri::command]
pub fn get_file_tree_flat(
    root_path: String,
    expanded_paths: Vec<String>,
) -> Result<Vec<FlatFileEntry>, String> {
    let root = Path::new(&root_path);
    if !root.exists() || !root.is_dir() {
        return Err("Invalid root path".to_string());
    }

    let mut results: Vec<FlatFileEntry> = Vec::new();
    let expanded_set: std::collections::HashSet<_> = expanded_paths.into_iter().collect();

    flatten_directory(root, &root_path, 0, &expanded_set, &mut results)?;

    Ok(results)
}

fn flatten_directory(
    dir: &Path,
    root_path: &str,
    depth: usize,
    expanded_set: &std::collections::HashSet<String>,
    results: &mut Vec<FlatFileEntry>,
) -> Result<(), String> {
    let skip_dirs = ["node_modules", "target", ".git", "__pycache__", ".next", ".svelte-kit", "build", "dist"];

    let mut entries: Vec<_> = fs::read_dir(dir)
        .map_err(|e| format!("Failed to read directory: {}", e))?
        .filter_map(|e| e.ok())
        .filter(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            !skip_dirs.contains(&name.as_str())
        })
        .collect();

    // Sort: directories first, then alphabetically
    entries.sort_by(|a, b| {
        let a_is_dir = a.path().is_dir();
        let b_is_dir = b.path().is_dir();
        match (a_is_dir, b_is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.file_name().to_string_lossy().to_lowercase()
                .cmp(&b.file_name().to_string_lossy().to_lowercase()),
        }
    });

    let len = entries.len();
    for (i, entry) in entries.into_iter().enumerate() {
        let path = entry.path();
        let path_str = path.to_string_lossy().to_string();
        let name = entry.file_name().to_string_lossy().to_string();
        let is_directory = path.is_dir();
        let is_last = i == len - 1;
        let is_expanded = expanded_set.contains(&path_str);

        let has_children = if is_directory {
            fs::read_dir(&path)
                .map(|rd| rd.filter_map(|e| e.ok()).next().is_some())
                .unwrap_or(false)
        } else {
            false
        };

        results.push(FlatFileEntry {
            path: path_str.clone(),
            name,
            is_directory,
            depth,
            is_last,
            expanded: is_expanded,
            has_children,
        });

        // Recursively add children if expanded
        if is_directory && is_expanded {
            flatten_directory(&path, root_path, depth + 1, expanded_set, results)?;
        }
    }

    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GroupedSearchResult {
    pub path: String,
    pub directory: String,
    pub filename: String,
    pub matches: Vec<SearchMatch>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchMatch {
    pub line: i32,
    pub content: String,
    #[serde(rename = "matchStart")]
    pub match_start: i32,
    #[serde(rename = "matchEnd")]
    pub match_end: i32,
}

/// Enhanced search with pre-grouped results
#[tauri::command]
pub fn search_in_project_grouped(
    root_path: String,
    query: String,
    case_sensitive: bool,
) -> Result<Vec<GroupedSearchResult>, String> {
    let max_results = 500;
    let exclude_patterns = ["node_modules", "dist", ".git", "target", "__pycache__", ".next", "build"];

    let query_search = if case_sensitive {
        query.clone()
    } else {
        query.to_lowercase()
    };

    let mut grouped: std::collections::HashMap<String, GroupedSearchResult> = std::collections::HashMap::new();
    let mut total_matches = 0;

    for entry in WalkDir::new(&root_path)
        .follow_links(true)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            !exclude_patterns.iter().any(|p| name == *p)
        })
    {
        if total_matches >= max_results {
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

        if is_binary_file(&extension, &file_name) {
            continue;
        }

        if let Ok(file) = fs::File::open(path) {
            let reader = BufReader::new(file);
            let path_str = path.to_string_lossy().to_string();

            for (line_num, line) in reader.lines().enumerate() {
                if total_matches >= max_results {
                    break;
                }

                if let Ok(line_content) = line {
                    let search_content = if case_sensitive {
                        line_content.clone()
                    } else {
                        line_content.to_lowercase()
                    };

                    if let Some(pos) = search_content.find(&query_search) {
                        total_matches += 1;

                        let group = grouped.entry(path_str.clone()).or_insert_with(|| {
                            let directory = path.parent()
                                .map(|p| p.strip_prefix(&root_path).unwrap_or(p))
                                .map(|p| p.to_string_lossy().to_string())
                                .unwrap_or_default();

                            GroupedSearchResult {
                                path: path_str.clone(),
                                directory,
                                filename: file_name.clone(),
                                matches: Vec::new(),
                            }
                        });

                        group.matches.push(SearchMatch {
                            line: (line_num + 1) as i32,
                            content: line_content.trim().chars().take(200).collect(),
                            match_start: pos as i32,
                            match_end: (pos + query.len()) as i32,
                        });
                    }
                }
            }
        }
    }

    let mut results: Vec<GroupedSearchResult> = grouped.into_values().collect();
    results.sort_by(|a, b| a.path.cmp(&b.path));

    Ok(results)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TextMatch {
    pub start: usize,
    pub end: usize,
    pub line: usize,
}

/// Find all matches in content for editor highlighting - much faster than JS iteration
#[tauri::command]
pub fn find_matches_in_content(
    content: String,
    query: String,
    case_sensitive: bool,
) -> Vec<TextMatch> {
    if query.is_empty() {
        return Vec::new();
    }

    let search_content = if case_sensitive {
        content.clone()
    } else {
        content.to_lowercase()
    };

    let search_query = if case_sensitive {
        query.clone()
    } else {
        query.to_lowercase()
    };

    let mut matches = Vec::new();
    let mut pos = 0;
    let mut line = 1;
    let mut line_start = 0;

    while let Some(found_pos) = search_content[pos..].find(&search_query) {
        let absolute_pos = pos + found_pos;

        // Count lines up to this position
        for (i, c) in content[line_start..absolute_pos].chars().enumerate() {
            if c == '\n' {
                line += 1;
                line_start = line_start + i + 1;
            }
        }

        matches.push(TextMatch {
            start: absolute_pos,
            end: absolute_pos + query.len(),
            line,
        });

        pos = absolute_pos + 1;
    }

    matches
}

// ============================================
// STREAMING SEARCH
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamSearchResult {
    pub path: String,
    pub filename: String,
    pub directory: String,
    pub matches: Vec<SearchMatch>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchProgress {
    pub files_searched: u32,
    pub matches_found: u32,
    pub current_file: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchComplete {
    pub total_files: u32,
    pub total_matches: u32,
    pub cancelled: bool,
}

/// Start streaming search - emits results as they are found
#[tauri::command]
pub async fn search_streaming_start(
    app: AppHandle,
    root_path: String,
    query: String,
    case_sensitive: bool,
) -> Result<u32, String> {
    let search_id = SEARCH_COUNTER.fetch_add(1, Ordering::SeqCst);
    let cancel_flag = Arc::new(AtomicBool::new(false));

    // Store cancel flag
    {
        let mut searches = ACTIVE_SEARCHES.lock().unwrap();
        searches.insert(search_id, cancel_flag.clone());
    }

    // Spawn search task
    let app_clone = app.clone();
    std::thread::spawn(move || {
        run_streaming_search(app_clone, search_id, root_path, query, case_sensitive, cancel_flag);
    });

    Ok(search_id)
}

/// Cancel an active search
#[tauri::command]
pub fn search_streaming_cancel(search_id: u32) -> Result<(), String> {
    let searches = ACTIVE_SEARCHES.lock().unwrap();
    if let Some(flag) = searches.get(&search_id) {
        flag.store(true, Ordering::SeqCst);
        Ok(())
    } else {
        Err(format!("Search {} not found", search_id))
    }
}

fn run_streaming_search(
    app: AppHandle,
    search_id: u32,
    root_path: String,
    query: String,
    case_sensitive: bool,
    cancel_flag: Arc<AtomicBool>,
) {
    let exclude_patterns = ["node_modules", "dist", ".git", "target", "__pycache__", ".next", "build", ".svelte-kit"];
    let query_search = if case_sensitive { query.clone() } else { query.to_lowercase() };

    let mut files_searched: u32 = 0;
    let mut total_matches: u32 = 0;
    let max_matches = 1000;
    let batch_size = 5; // Emit progress every N files

    for entry in WalkDir::new(&root_path)
        .follow_links(true)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            !exclude_patterns.iter().any(|p| name == *p)
        })
    {
        // Check cancellation
        if cancel_flag.load(Ordering::SeqCst) {
            break;
        }

        if total_matches >= max_matches {
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

        if is_binary_file(&extension, &file_name) {
            continue;
        }

        files_searched += 1;

        // Emit progress periodically
        if files_searched % batch_size == 0 {
            let _ = app.emit(&format!("search-{}-progress", search_id), SearchProgress {
                files_searched,
                matches_found: total_matches,
                current_file: file_name.clone(),
            });
        }

        // Search in file
        if let Ok(file) = fs::File::open(path) {
            let reader = BufReader::new(file);
            let path_str = path.to_string_lossy().to_string();
            let mut file_matches: Vec<SearchMatch> = Vec::new();

            for (line_num, line) in reader.lines().enumerate() {
                if cancel_flag.load(Ordering::SeqCst) {
                    break;
                }

                if total_matches >= max_matches {
                    break;
                }

                if let Ok(line_content) = line {
                    let search_content = if case_sensitive {
                        line_content.clone()
                    } else {
                        line_content.to_lowercase()
                    };

                    // Find all matches in this line
                    let mut pos = 0;
                    while let Some(found_pos) = search_content[pos..].find(&query_search) {
                        let absolute_pos = pos + found_pos;
                        total_matches += 1;

                        file_matches.push(SearchMatch {
                            line: (line_num + 1) as i32,
                            content: line_content.trim().chars().take(200).collect(),
                            match_start: absolute_pos as i32,
                            match_end: (absolute_pos + query.len()) as i32,
                        });

                        pos = absolute_pos + 1;

                        if total_matches >= max_matches {
                            break;
                        }
                    }
                }
            }

            // Emit file result if there are matches
            if !file_matches.is_empty() {
                let directory = path.parent()
                    .map(|p| p.strip_prefix(&root_path).unwrap_or(p))
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_default();

                let _ = app.emit(&format!("search-{}-result", search_id), StreamSearchResult {
                    path: path_str,
                    filename: file_name,
                    directory,
                    matches: file_matches,
                });
            }
        }
    }

    // Emit completion
    let _ = app.emit(&format!("search-{}-complete", search_id), SearchComplete {
        total_files: files_searched,
        total_matches,
        cancelled: cancel_flag.load(Ordering::SeqCst),
    });

    // Cleanup
    let mut searches = ACTIVE_SEARCHES.lock().unwrap();
    searches.remove(&search_id);
}
