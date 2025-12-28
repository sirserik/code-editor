use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

// Terminal instance storage
struct TerminalState {
    terminals: Mutex<HashMap<u32, TerminalInstance>>,
    next_id: Mutex<u32>,
}

struct TerminalInstance {
    writer: Box<dyn Write + Send>,
    _master: Box<dyn portable_pty::MasterPty + Send>,
}

// Global state
static TERMINAL_STATE: once_cell::sync::Lazy<TerminalState> = once_cell::sync::Lazy::new(|| {
    TerminalState {
        terminals: Mutex::new(HashMap::new()),
        next_id: Mutex::new(1),
    }
});

#[derive(Serialize, Deserialize)]
pub struct TerminalSpawnResult {
    id: u32,
}

#[tauri::command]
pub async fn terminal_spawn(
    app: AppHandle,
    working_dir: Option<String>,
) -> Result<TerminalSpawnResult, String> {
    let pty_system = native_pty_system();

    // Create PTY with default size
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    // Get the shell
    let shell = if cfg!(target_os = "windows") {
        std::env::var("COMSPEC").unwrap_or_else(|_| "cmd.exe".to_string())
    } else {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())
    };

    // Build command
    let mut cmd = CommandBuilder::new(&shell);

    // Set working directory if provided
    if let Some(dir) = working_dir {
        if std::path::Path::new(&dir).exists() {
            cmd.cwd(&dir);
        }
    }

    // Spawn the child process
    let mut child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;

    // Get writer for sending input
    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to get PTY writer: {}", e))?;

    // Get reader for receiving output
    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to clone PTY reader: {}", e))?;

    // Generate terminal ID
    let id = {
        let mut next_id = TERMINAL_STATE.next_id.lock().unwrap();
        let id = *next_id;
        *next_id += 1;
        id
    };

    // Store terminal instance
    {
        let mut terminals = TERMINAL_STATE.terminals.lock().unwrap();
        terminals.insert(
            id,
            TerminalInstance {
                writer,
                _master: pair.master,
            },
        );
    }

    // Spawn reader thread to emit output events
    let app_clone = app.clone();
    let terminal_id = id;
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    // EOF - terminal closed
                    let _ = app_clone.emit(&format!("terminal-{}-close", terminal_id), ());
                    break;
                }
                Ok(n) => {
                    // Convert to string (lossy for invalid UTF-8)
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app_clone.emit(&format!("terminal-{}-output", terminal_id), data);
                }
                Err(e) => {
                    eprintln!("Terminal read error: {}", e);
                    let _ = app_clone.emit(&format!("terminal-{}-close", terminal_id), ());
                    break;
                }
            }
        }
        // Cleanup
        let mut terminals = TERMINAL_STATE.terminals.lock().unwrap();
        terminals.remove(&terminal_id);
    });

    // Wait for child in background
    std::thread::spawn(move || {
        let _ = child.wait();
    });

    Ok(TerminalSpawnResult { id })
}

#[tauri::command]
pub async fn terminal_write(id: u32, data: String) -> Result<(), String> {
    let mut terminals = TERMINAL_STATE.terminals.lock().unwrap();

    if let Some(terminal) = terminals.get_mut(&id) {
        terminal
            .writer
            .write_all(data.as_bytes())
            .map_err(|e| format!("Failed to write to terminal: {}", e))?;
        terminal
            .writer
            .flush()
            .map_err(|e| format!("Failed to flush terminal: {}", e))?;
        Ok(())
    } else {
        Err(format!("Terminal {} not found", id))
    }
}

#[tauri::command]
pub async fn terminal_resize(_id: u32, _cols: u16, _rows: u16) -> Result<(), String> {
    // Note: resizing requires keeping the master PTY handle
    // For now, we'll just acknowledge the resize
    // In a more complete implementation, you'd call master.resize()
    Ok(())
}

#[tauri::command]
pub async fn terminal_kill(id: u32) -> Result<(), String> {
    let mut terminals = TERMINAL_STATE.terminals.lock().unwrap();

    if terminals.remove(&id).is_some() {
        Ok(())
    } else {
        Err(format!("Terminal {} not found", id))
    }
}
