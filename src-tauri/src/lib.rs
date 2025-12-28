mod commands;

use commands::{file, git, settings, lsp, terminal};

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
            // Large file handling
            file::get_file_info,
            file::read_file_chunk,
            file::read_file_bytes,
            file::read_file_smart,
            // Optimized commands
            file::fuzzy_search_files,
            file::get_file_tree_flat,
            file::search_in_project_grouped,
            file::find_matches_in_content,
            // Streaming search
            file::search_streaming_start,
            file::search_streaming_cancel,
            // Git commands
            git::git_status,
            git::git_diff,
            git::git_stage,
            git::git_unstage,
            git::git_commit,
            git::git_init,
            git::git_discard,
            git::git_stage_all,
            git::git_unstage_all,
            git::git_is_repo,
            git::git_invalidate_cache,
            git::git_status_fresh,
            // Settings commands
            settings::get_settings,
            settings::set_settings,
            settings::set_font_size,
            settings::zoom_in,
            settings::zoom_out,
            settings::reset_zoom,
            settings::set_theme,
            // LSP commands
            lsp::lsp_start,
            lsp::lsp_stop,
            lsp::lsp_stop_language,
            lsp::lsp_restart,
            lsp::lsp_status,
            lsp::lsp_cleanup_idle,
            lsp::lsp_warmup,
            lsp::lsp_open_file,
            lsp::lsp_update_file,
            lsp::lsp_get_completions,
            lsp::emmet_expand,
            // Terminal commands
            terminal::terminal_spawn,
            terminal::terminal_write,
            terminal::terminal_resize,
            terminal::terminal_kill,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
