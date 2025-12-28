mod commands;

use commands::{file, git, settings};

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
            file::file_exists,
            file::search_in_project,
            file::get_all_files,
            // Git commands
            git::git_status,
            git::git_diff,
            git::git_stage,
            git::git_unstage,
            git::git_commit,
            // Settings commands
            settings::get_settings,
            settings::set_settings,
            settings::set_font_size,
            settings::zoom_in,
            settings::zoom_out,
            settings::reset_zoom,
            settings::set_theme,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
