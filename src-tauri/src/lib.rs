mod commands;

use commands::{file, git};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // File commands
            file::read_file,
            file::write_file,
            file::list_directory,
            file::create_file,
            file::create_directory,
            file::delete_file,
            file::rename_file,
            // Git commands
            git::git_status,
            git::git_diff,
            git::git_stage,
            git::git_unstage,
            git::git_commit,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
