use git2::{DiffOptions, Repository, StatusOptions};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;
use std::time::{Duration, Instant};

// Cache configuration
const CACHE_TTL_MS: u64 = 2000; // 2 seconds TTL

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitFileStatus {
    pub path: String,
    pub status: String,
    pub staged: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStatus {
    pub branch: String,
    pub ahead: u32,
    pub behind: u32,
    pub files: Vec<GitFileStatus>,
}

// Cached entry with timestamp
struct CachedStatus {
    status: GitStatus,
    timestamp: Instant,
}

// Global cache for git status
static GIT_STATUS_CACHE: once_cell::sync::Lazy<Mutex<HashMap<String, CachedStatus>>> =
    once_cell::sync::Lazy::new(|| Mutex::new(HashMap::new()));

fn invalidate_cache(repo_path: &str) {
    if let Ok(mut cache) = GIT_STATUS_CACHE.lock() {
        cache.remove(repo_path);
    }
}

fn get_cached_status(repo_path: &str) -> Option<GitStatus> {
    let cache = GIT_STATUS_CACHE.lock().ok()?;
    let entry = cache.get(repo_path)?;

    // Check if cache is still valid
    if entry.timestamp.elapsed() < Duration::from_millis(CACHE_TTL_MS) {
        Some(entry.status.clone())
    } else {
        None
    }
}

fn set_cached_status(repo_path: &str, status: GitStatus) {
    if let Ok(mut cache) = GIT_STATUS_CACHE.lock() {
        cache.insert(
            repo_path.to_string(),
            CachedStatus {
                status,
                timestamp: Instant::now(),
            },
        );
    }
}

#[tauri::command]
pub fn git_status(repo_path: String) -> Result<GitStatus, String> {
    // Check cache first
    if let Some(cached) = get_cached_status(&repo_path) {
        return Ok(cached);
    }
    let repo = Repository::open(&repo_path).map_err(|e| format!("Failed to open repository: {}", e))?;

    // Get current branch
    let head = repo.head().map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let branch = head
        .shorthand()
        .unwrap_or("HEAD")
        .to_string();

    // Get ahead/behind counts (simplified - would need remote tracking)
    let ahead = 0u32;
    let behind = 0u32;

    // Get file statuses
    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .include_ignored(false);

    let statuses = repo
        .statuses(Some(&mut opts))
        .map_err(|e| format!("Failed to get statuses: {}", e))?;

    let mut files: Vec<GitFileStatus> = Vec::new();

    for entry in statuses.iter() {
        let status = entry.status();
        let path = entry.path().unwrap_or("").to_string();

        if path.is_empty() {
            continue;
        }

        let (status_str, staged) = if status.is_index_new() {
            ("added", true)
        } else if status.is_index_modified() {
            ("modified", true)
        } else if status.is_index_deleted() {
            ("deleted", true)
        } else if status.is_index_renamed() {
            ("renamed", true)
        } else if status.is_wt_new() {
            ("untracked", false)
        } else if status.is_wt_modified() {
            ("modified", false)
        } else if status.is_wt_deleted() {
            ("deleted", false)
        } else if status.is_wt_renamed() {
            ("renamed", false)
        } else {
            continue;
        };

        files.push(GitFileStatus {
            path,
            status: status_str.to_string(),
            staged,
        });
    }

    let result = GitStatus {
        branch,
        ahead,
        behind,
        files,
    };

    // Cache the result
    set_cached_status(&repo_path, result.clone());

    Ok(result)
}

#[tauri::command]
pub fn git_diff(repo_path: String, file_path: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path).map_err(|e| format!("Failed to open repository: {}", e))?;

    let mut opts = DiffOptions::new();
    opts.pathspec(&file_path);

    let diff = repo
        .diff_index_to_workdir(None, Some(&mut opts))
        .map_err(|e| format!("Failed to get diff: {}", e))?;

    let mut diff_text = String::new();
    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        let prefix = match line.origin() {
            '+' => "+",
            '-' => "-",
            ' ' => " ",
            _ => "",
        };
        if let Ok(content) = std::str::from_utf8(line.content()) {
            diff_text.push_str(prefix);
            diff_text.push_str(content);
        }
        true
    })
    .map_err(|e| format!("Failed to format diff: {}", e))?;

    Ok(diff_text)
}

#[tauri::command]
pub fn git_stage(repo_path: String, file_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| format!("Failed to open repository: {}", e))?;

    let mut index = repo.index().map_err(|e| format!("Failed to get index: {}", e))?;
    index
        .add_path(std::path::Path::new(&file_path))
        .map_err(|e| format!("Failed to stage file: {}", e))?;
    index.write().map_err(|e| format!("Failed to write index: {}", e))?;

    invalidate_cache(&repo_path);
    Ok(())
}

#[tauri::command]
pub fn git_unstage(repo_path: String, file_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| format!("Failed to open repository: {}", e))?;

    let head = repo.head().map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let head_commit = head
        .peel_to_commit()
        .map_err(|e| format!("Failed to get HEAD commit: {}", e))?;

    repo.reset_default(Some(&head_commit.into_object()), &[std::path::Path::new(&file_path)])
        .map_err(|e| format!("Failed to unstage file: {}", e))?;

    invalidate_cache(&repo_path);
    Ok(())
}

#[tauri::command]
pub fn git_commit(repo_path: String, message: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| format!("Failed to open repository: {}", e))?;

    let mut index = repo.index().map_err(|e| format!("Failed to get index: {}", e))?;
    let tree_id = index.write_tree().map_err(|e| format!("Failed to write tree: {}", e))?;
    let tree = repo.find_tree(tree_id).map_err(|e| format!("Failed to find tree: {}", e))?;

    let sig = repo.signature().map_err(|e| format!("Failed to get signature: {}", e))?;

    let head = repo.head().ok();
    let parent_commit = head.and_then(|h| h.peel_to_commit().ok());

    let parents: Vec<&git2::Commit> = parent_commit.iter().collect();

    repo.commit(Some("HEAD"), &sig, &sig, &message, &tree, &parents)
        .map_err(|e| format!("Failed to commit: {}", e))?;

    invalidate_cache(&repo_path);
    Ok(())
}

#[tauri::command]
pub fn git_init(repo_path: String) -> Result<(), String> {
    Repository::init(&repo_path)
        .map_err(|e| format!("Failed to initialize repository: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn git_discard(repo_path: String, file_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| format!("Failed to open repository: {}", e))?;

    // Check if file is untracked
    let mut opts = StatusOptions::new();
    opts.pathspec(&file_path);
    let statuses = repo.statuses(Some(&mut opts))
        .map_err(|e| format!("Failed to get status: {}", e))?;

    if let Some(entry) = statuses.iter().next() {
        if entry.status().is_wt_new() {
            // Untracked file - delete it
            let full_path = Path::new(&repo_path).join(&file_path);
            std::fs::remove_file(&full_path)
                .map_err(|e| format!("Failed to delete untracked file: {}", e))?;
            return Ok(());
        }
    }

    // Tracked file - checkout from HEAD
    let head = repo.head().map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let commit = head.peel_to_commit().map_err(|e| format!("Failed to get commit: {}", e))?;
    let tree = commit.tree().map_err(|e| format!("Failed to get tree: {}", e))?;

    repo.checkout_tree(
        tree.as_object(),
        Some(git2::build::CheckoutBuilder::new()
            .force()
            .path(&file_path))
    ).map_err(|e| format!("Failed to checkout file: {}", e))?;

    invalidate_cache(&repo_path);
    Ok(())
}

#[tauri::command]
pub fn git_stage_all(repo_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| format!("Failed to open repository: {}", e))?;

    let mut index = repo.index().map_err(|e| format!("Failed to get index: {}", e))?;
    index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
        .map_err(|e| format!("Failed to stage all: {}", e))?;
    index.write().map_err(|e| format!("Failed to write index: {}", e))?;

    invalidate_cache(&repo_path);
    Ok(())
}

#[tauri::command]
pub fn git_unstage_all(repo_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| format!("Failed to open repository: {}", e))?;

    let head = repo.head().map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let head_commit = head.peel_to_commit().map_err(|e| format!("Failed to get HEAD commit: {}", e))?;

    repo.reset_default(Some(&head_commit.into_object()), std::iter::empty::<&Path>())
        .map_err(|e| format!("Failed to unstage all: {}", e))?;

    invalidate_cache(&repo_path);
    Ok(())
}

#[tauri::command]
pub fn git_is_repo(path: String) -> bool {
    Repository::open(&path).is_ok()
}

#[tauri::command]
pub fn git_invalidate_cache(repo_path: String) {
    invalidate_cache(&repo_path);
}

#[tauri::command]
pub fn git_status_fresh(repo_path: String) -> Result<GitStatus, String> {
    invalidate_cache(&repo_path);
    git_status(repo_path)
}
