use git2::{DiffOptions, Repository, StatusOptions};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct GitFileStatus {
    pub path: String,
    pub status: String,
    pub staged: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitStatus {
    pub branch: String,
    pub ahead: u32,
    pub behind: u32,
    pub files: Vec<GitFileStatus>,
}

#[tauri::command]
pub fn git_status(repo_path: String) -> Result<GitStatus, String> {
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

    Ok(GitStatus {
        branch,
        ahead,
        behind,
        files,
    })
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

    Ok(())
}
