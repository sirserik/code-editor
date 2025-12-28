use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Emitter, AppHandle};

const MIN_FONT_SIZE: u32 = 8;
const MAX_FONT_SIZE: u32 = 72;
const DEFAULT_FONT_SIZE: u32 = 14;
const ZOOM_STEP: u32 = 2;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub font_size: u32,
    pub font_family: String,
    pub theme: String,
    pub tab_size: u32,
    pub word_wrap: bool,
    pub line_numbers: bool,
    pub minimap: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            font_size: DEFAULT_FONT_SIZE,
            font_family: "JetBrains Mono, monospace".to_string(),
            theme: "dark".to_string(),
            tab_size: 2,
            word_wrap: false,
            line_numbers: true,
            minimap: true,
        }
    }
}

static SETTINGS: Lazy<Mutex<Settings>> = Lazy::new(|| {
    Mutex::new(load_settings().unwrap_or_default())
});

fn get_settings_path() -> Option<PathBuf> {
    dirs::config_dir().map(|p| p.join("code-editor").join("settings.json"))
}

fn load_settings() -> Option<Settings> {
    let path = get_settings_path()?;
    let content = fs::read_to_string(&path).ok()?;
    serde_json::from_str(&content).ok()
}

fn save_settings(settings: &Settings) -> Result<(), String> {
    let path = get_settings_path().ok_or("Could not get config directory")?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let content = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;

    Ok(())
}

fn emit_settings_change(app: &AppHandle, settings: &Settings) {
    let _ = app.emit("settings-changed", settings.clone());
}

#[tauri::command]
pub fn get_settings() -> Result<Settings, String> {
    let settings = SETTINGS.lock().map_err(|e| e.to_string())?;
    Ok(settings.clone())
}

#[tauri::command]
pub fn set_settings(app: AppHandle, new_settings: Settings) -> Result<Settings, String> {
    let mut settings = SETTINGS.lock().map_err(|e| e.to_string())?;
    *settings = new_settings;
    save_settings(&settings)?;
    emit_settings_change(&app, &settings);
    Ok(settings.clone())
}

#[tauri::command]
pub fn set_font_size(app: AppHandle, size: u32) -> Result<Settings, String> {
    let clamped = size.clamp(MIN_FONT_SIZE, MAX_FONT_SIZE);
    let mut settings = SETTINGS.lock().map_err(|e| e.to_string())?;
    settings.font_size = clamped;
    save_settings(&settings)?;
    emit_settings_change(&app, &settings);
    Ok(settings.clone())
}

#[tauri::command]
pub fn zoom_in(app: AppHandle) -> Result<Settings, String> {
    let mut settings = SETTINGS.lock().map_err(|e| e.to_string())?;
    let new_size = (settings.font_size + ZOOM_STEP).min(MAX_FONT_SIZE);
    settings.font_size = new_size;
    save_settings(&settings)?;
    emit_settings_change(&app, &settings);
    Ok(settings.clone())
}

#[tauri::command]
pub fn zoom_out(app: AppHandle) -> Result<Settings, String> {
    let mut settings = SETTINGS.lock().map_err(|e| e.to_string())?;
    let new_size = settings.font_size.saturating_sub(ZOOM_STEP).max(MIN_FONT_SIZE);
    settings.font_size = new_size;
    save_settings(&settings)?;
    emit_settings_change(&app, &settings);
    Ok(settings.clone())
}

#[tauri::command]
pub fn reset_zoom(app: AppHandle) -> Result<Settings, String> {
    let mut settings = SETTINGS.lock().map_err(|e| e.to_string())?;
    settings.font_size = DEFAULT_FONT_SIZE;
    save_settings(&settings)?;
    emit_settings_change(&app, &settings);
    Ok(settings.clone())
}

#[tauri::command]
pub fn set_theme(app: AppHandle, theme: String) -> Result<Settings, String> {
    let mut settings = SETTINGS.lock().map_err(|e| e.to_string())?;
    settings.theme = theme;
    save_settings(&settings)?;
    emit_settings_change(&app, &settings);
    Ok(settings.clone())
}
