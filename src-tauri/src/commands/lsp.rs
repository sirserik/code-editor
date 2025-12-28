use lsp_types::{
    CompletionParams, CompletionItem, CompletionItemKind, ClientCapabilities,
    InitializeParams, Position, TextDocumentIdentifier, TextDocumentPositionParams,
    Url, TextDocumentItem, DidChangeTextDocumentParams, VersionedTextDocumentIdentifier,
    TextDocumentContentChangeEvent, TextDocumentClientCapabilities,
    CompletionClientCapabilities, CompletionItemCapability,
    WorkspaceClientCapabilities, WorkspaceFolder, DidOpenTextDocumentParams,
};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read, Write};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

// Global LSP manager
static LSP_MANAGER: Lazy<Arc<Mutex<LspManager>>> = Lazy::new(|| {
    Arc::new(Mutex::new(LspManager::new()))
});

// Request ID counter
static REQUEST_ID: AtomicI64 = AtomicI64::new(1);

fn next_request_id() -> i64 {
    REQUEST_ID.fetch_add(1, Ordering::SeqCst)
}

// Server idle timeout (5 minutes)
const SERVER_IDLE_TIMEOUT: Duration = Duration::from_secs(300);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionResult {
    pub label: String,
    pub kind: String,
    pub detail: Option<String>,
    pub insert_text: Option<String>,
    pub additional_text_edits: Option<Vec<TextEdit>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextEdit {
    pub start_line: u32,
    pub start_col: u32,
    pub end_line: u32,
    pub end_col: u32,
    pub new_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LspServerStatus {
    pub language: String,
    pub status: String, // "running", "stopped", "error"
    pub uptime_secs: u64,
    pub requests_served: u64,
}

struct LspServer {
    process: Child,
    #[allow(dead_code)]
    language: String,
    #[allow(dead_code)]
    initialized: bool,
    #[allow(dead_code)]
    pending_responses: HashMap<i64, tokio::sync::oneshot::Sender<Value>>,
    started_at: Instant,
    last_used: Instant,
    requests_served: u64,
    workspace_root: String,
}

impl LspServer {
    fn is_alive(&mut self) -> bool {
        match self.process.try_wait() {
            Ok(None) => true,  // Still running
            Ok(Some(_)) => false,  // Exited
            Err(_) => false,  // Error checking
        }
    }

    fn touch(&mut self) {
        self.last_used = Instant::now();
        self.requests_served += 1;
    }

    fn is_idle(&self) -> bool {
        self.last_used.elapsed() > SERVER_IDLE_TIMEOUT
    }
}

struct LspManager {
    servers: HashMap<String, LspServer>,
    open_documents: HashMap<String, i32>, // path -> version
}

impl LspManager {
    fn new() -> Self {
        Self {
            servers: HashMap::new(),
            open_documents: HashMap::new(),
        }
    }

    fn get_server_command(language: &str) -> Option<(String, Vec<String>)> {
        match language {
            "typescript" | "javascript" | "tsx" | "jsx" => {
                Some(("typescript-language-server".to_string(), vec!["--stdio".to_string()]))
            }
            "php" => {
                Some(("intelephense".to_string(), vec!["--stdio".to_string()]))
            }
            "rust" => {
                Some(("rust-analyzer".to_string(), vec![]))
            }
            "python" => {
                Some(("pylsp".to_string(), vec![]))
            }
            "go" => {
                Some(("gopls".to_string(), vec![]))
            }
            "html" | "css" | "scss" | "less" => {
                Some(("vscode-css-language-server".to_string(), vec!["--stdio".to_string()]))
            }
            "json" => {
                Some(("vscode-json-language-server".to_string(), vec!["--stdio".to_string()]))
            }
            _ => None,
        }
    }

    fn get_language_id(language: &str) -> &str {
        match language {
            "tsx" => "typescriptreact",
            "jsx" => "javascriptreact",
            _ => language,
        }
    }

    fn start_server(&mut self, language: &str, workspace_root: &str) -> Result<(), String> {
        // Check if server exists and is alive
        if let Some(server) = self.servers.get_mut(language) {
            if server.is_alive() {
                server.touch();
                return Ok(());
            } else {
                // Server died, remove it
                self.servers.remove(language);
            }
        }

        let (cmd, args) = Self::get_server_command(language)
            .ok_or_else(|| format!("No language server for: {}", language))?;

        let mut process = Command::new(&cmd)
            .args(&args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("Failed to start {}: {}. Make sure it's installed.", cmd, e))?;

        // Send initialize request
        let initialize_params = InitializeParams {
            process_id: Some(std::process::id()),
            root_uri: Some(Url::from_file_path(workspace_root).unwrap()),
            capabilities: ClientCapabilities {
                text_document: Some(TextDocumentClientCapabilities {
                    completion: Some(CompletionClientCapabilities {
                        completion_item: Some(CompletionItemCapability {
                            snippet_support: Some(true),
                            ..Default::default()
                        }),
                        ..Default::default()
                    }),
                    ..Default::default()
                }),
                workspace: Some(WorkspaceClientCapabilities {
                    workspace_folders: Some(true),
                    ..Default::default()
                }),
                ..Default::default()
            },
            workspace_folders: Some(vec![WorkspaceFolder {
                uri: Url::from_file_path(workspace_root).unwrap(),
                name: workspace_root.split('/').last().unwrap_or("workspace").to_string(),
            }]),
            ..Default::default()
        };

        let request = json!({
            "jsonrpc": "2.0",
            "id": next_request_id(),
            "method": "initialize",
            "params": initialize_params
        });

        Self::send_message(&mut process, &request)?;

        // Read initialize response
        let _response = Self::read_message(&mut process)?;

        // Send initialized notification
        let initialized = json!({
            "jsonrpc": "2.0",
            "method": "initialized",
            "params": {}
        });
        Self::send_message(&mut process, &initialized)?;

        let now = Instant::now();
        self.servers.insert(language.to_string(), LspServer {
            process,
            language: language.to_string(),
            initialized: true,
            pending_responses: HashMap::new(),
            started_at: now,
            last_used: now,
            requests_served: 0,
            workspace_root: workspace_root.to_string(),
        });

        Ok(())
    }

    fn send_message(process: &mut Child, message: &Value) -> Result<(), String> {
        let content = serde_json::to_string(message).map_err(|e| e.to_string())?;
        let header = format!("Content-Length: {}\r\n\r\n", content.len());

        let stdin = process.stdin.as_mut().ok_or("No stdin")?;
        stdin.write_all(header.as_bytes()).map_err(|e| e.to_string())?;
        stdin.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
        stdin.flush().map_err(|e| e.to_string())?;

        Ok(())
    }

    fn read_message(process: &mut Child) -> Result<Value, String> {
        let stdout = process.stdout.as_mut().ok_or("No stdout")?;
        let mut reader = BufReader::new(stdout);

        // Read headers
        let mut content_length: usize = 0;
        loop {
            let mut line = String::new();
            reader.read_line(&mut line).map_err(|e| e.to_string())?;

            if line == "\r\n" || line == "\n" {
                break;
            }

            if line.to_lowercase().starts_with("content-length:") {
                content_length = line
                    .split(':')
                    .nth(1)
                    .ok_or("Invalid header")?
                    .trim()
                    .parse()
                    .map_err(|e: std::num::ParseIntError| e.to_string())?;
            }
        }

        // Read content
        let mut content = vec![0u8; content_length];
        reader.read_exact(&mut content).map_err(|e| e.to_string())?;

        serde_json::from_slice(&content).map_err(|e| e.to_string())
    }

    fn notify_open(&mut self, language: &str, path: &str, content: &str) -> Result<(), String> {
        let server = self.servers.get_mut(language).ok_or("Server not running")?;
        server.touch();

        let uri = Url::from_file_path(path).map_err(|_| "Invalid path")?;
        let version = self.open_documents.entry(path.to_string()).or_insert(0);
        *version += 1;

        let params = DidOpenTextDocumentParams {
            text_document: TextDocumentItem {
                uri,
                language_id: Self::get_language_id(language).to_string(),
                version: *version,
                text: content.to_string(),
            },
        };

        let notification = json!({
            "jsonrpc": "2.0",
            "method": "textDocument/didOpen",
            "params": params
        });

        Self::send_message(&mut server.process, &notification)
    }

    fn notify_change(&mut self, language: &str, path: &str, content: &str) -> Result<(), String> {
        let server = self.servers.get_mut(language).ok_or("Server not running")?;
        server.touch();

        let uri = Url::from_file_path(path).map_err(|_| "Invalid path")?;
        let version = self.open_documents.entry(path.to_string()).or_insert(0);
        *version += 1;

        let params = DidChangeTextDocumentParams {
            text_document: VersionedTextDocumentIdentifier {
                uri,
                version: *version,
            },
            content_changes: vec![TextDocumentContentChangeEvent {
                range: None,
                range_length: None,
                text: content.to_string(),
            }],
        };

        let notification = json!({
            "jsonrpc": "2.0",
            "method": "textDocument/didChange",
            "params": params
        });

        Self::send_message(&mut server.process, &notification)
    }

    fn get_completions(&mut self, language: &str, path: &str, line: u32, column: u32) -> Result<Vec<CompletionResult>, String> {
        let server = self.servers.get_mut(language).ok_or("Server not running")?;
        server.touch();

        let uri = Url::from_file_path(path).map_err(|_| "Invalid path")?;
        let params = CompletionParams {
            text_document_position: TextDocumentPositionParams {
                text_document: TextDocumentIdentifier { uri },
                position: Position { line, character: column },
            },
            work_done_progress_params: Default::default(),
            partial_result_params: Default::default(),
            context: None,
        };

        let request = json!({
            "jsonrpc": "2.0",
            "id": next_request_id(),
            "method": "textDocument/completion",
            "params": params
        });

        Self::send_message(&mut server.process, &request)?;
        let response = Self::read_message(&mut server.process)?;

        // Parse completion response
        let result = response.get("result");
        if result.is_none() {
            return Ok(vec![]);
        }

        let items: Vec<CompletionItem> = match result.unwrap() {
            Value::Array(arr) => serde_json::from_value(Value::Array(arr.clone())).unwrap_or_default(),
            Value::Object(obj) => {
                if let Some(items) = obj.get("items") {
                    serde_json::from_value(items.clone()).unwrap_or_default()
                } else {
                    vec![]
                }
            }
            _ => vec![],
        };

        Ok(items.into_iter().map(|item| {
            let label = item.label.clone();
            CompletionResult {
                label: label.clone(),
                kind: kind_to_string(item.kind),
                detail: item.detail,
                insert_text: item.insert_text.or(Some(label)),
                additional_text_edits: item.additional_text_edits.map(|edits| {
                    edits.into_iter().map(|edit| TextEdit {
                        start_line: edit.range.start.line,
                        start_col: edit.range.start.character,
                        end_line: edit.range.end.line,
                        end_col: edit.range.end.character,
                        new_text: edit.new_text,
                    }).collect()
                }),
            }
        }).collect())
    }

    fn stop_server(&mut self, language: &str) -> Result<(), String> {
        if let Some(mut server) = self.servers.remove(language) {
            // Send shutdown request
            let shutdown = json!({
                "jsonrpc": "2.0",
                "id": next_request_id(),
                "method": "shutdown"
            });
            let _ = Self::send_message(&mut server.process, &shutdown);

            // Send exit notification
            let exit = json!({
                "jsonrpc": "2.0",
                "method": "exit"
            });
            let _ = Self::send_message(&mut server.process, &exit);

            // Wait a bit then kill if needed
            std::thread::sleep(Duration::from_millis(100));
            let _ = server.process.kill();
        }
        Ok(())
    }

    fn stop_all(&mut self) {
        let languages: Vec<String> = self.servers.keys().cloned().collect();
        for lang in languages {
            let _ = self.stop_server(&lang);
        }
    }

    fn cleanup_idle_servers(&mut self) {
        let idle_languages: Vec<String> = self.servers.iter()
            .filter(|(_, server)| server.is_idle())
            .map(|(lang, _)| lang.clone())
            .collect();

        for lang in idle_languages {
            let _ = self.stop_server(&lang);
        }
    }

    fn get_status(&self) -> Vec<LspServerStatus> {
        self.servers.iter().map(|(lang, server)| {
            LspServerStatus {
                language: lang.clone(),
                status: "running".to_string(),
                uptime_secs: server.started_at.elapsed().as_secs(),
                requests_served: server.requests_served,
            }
        }).collect()
    }

    fn restart_server(&mut self, language: &str) -> Result<(), String> {
        let workspace_root = self.servers
            .get(language)
            .map(|s| s.workspace_root.clone())
            .ok_or("Server not found")?;

        self.stop_server(language)?;
        self.start_server(language, &workspace_root)
    }
}

fn kind_to_string(kind: Option<CompletionItemKind>) -> String {
    match kind {
        Some(CompletionItemKind::TEXT) => "text",
        Some(CompletionItemKind::METHOD) => "method",
        Some(CompletionItemKind::FUNCTION) => "function",
        Some(CompletionItemKind::CONSTRUCTOR) => "constructor",
        Some(CompletionItemKind::FIELD) => "field",
        Some(CompletionItemKind::VARIABLE) => "variable",
        Some(CompletionItemKind::CLASS) => "class",
        Some(CompletionItemKind::INTERFACE) => "interface",
        Some(CompletionItemKind::MODULE) => "module",
        Some(CompletionItemKind::PROPERTY) => "property",
        Some(CompletionItemKind::UNIT) => "unit",
        Some(CompletionItemKind::VALUE) => "value",
        Some(CompletionItemKind::ENUM) => "enum",
        Some(CompletionItemKind::KEYWORD) => "keyword",
        Some(CompletionItemKind::SNIPPET) => "snippet",
        Some(CompletionItemKind::COLOR) => "color",
        Some(CompletionItemKind::FILE) => "file",
        Some(CompletionItemKind::REFERENCE) => "reference",
        Some(CompletionItemKind::FOLDER) => "folder",
        Some(CompletionItemKind::ENUM_MEMBER) => "enum_member",
        Some(CompletionItemKind::CONSTANT) => "constant",
        Some(CompletionItemKind::STRUCT) => "struct",
        Some(CompletionItemKind::EVENT) => "event",
        Some(CompletionItemKind::OPERATOR) => "operator",
        Some(CompletionItemKind::TYPE_PARAMETER) => "type_parameter",
        _ => "text",
    }.to_string()
}

// Tauri Commands

#[tauri::command]
pub async fn lsp_start(language: String, workspace_root: String) -> Result<(), String> {
    let mut manager = LSP_MANAGER.lock().map_err(|e| e.to_string())?;
    manager.start_server(&language, &workspace_root)
}

#[tauri::command]
pub async fn lsp_stop() -> Result<(), String> {
    let mut manager = LSP_MANAGER.lock().map_err(|e| e.to_string())?;
    manager.stop_all();
    Ok(())
}

#[tauri::command]
pub async fn lsp_stop_language(language: String) -> Result<(), String> {
    let mut manager = LSP_MANAGER.lock().map_err(|e| e.to_string())?;
    manager.stop_server(&language)
}

#[tauri::command]
pub async fn lsp_restart(language: String) -> Result<(), String> {
    let mut manager = LSP_MANAGER.lock().map_err(|e| e.to_string())?;
    manager.restart_server(&language)
}

#[tauri::command]
pub async fn lsp_status() -> Result<Vec<LspServerStatus>, String> {
    let manager = LSP_MANAGER.lock().map_err(|e| e.to_string())?;
    Ok(manager.get_status())
}

#[tauri::command]
pub async fn lsp_cleanup_idle() -> Result<u32, String> {
    let mut manager = LSP_MANAGER.lock().map_err(|e| e.to_string())?;
    let before = manager.servers.len();
    manager.cleanup_idle_servers();
    let after = manager.servers.len();
    Ok((before - after) as u32)
}

#[tauri::command]
pub async fn lsp_open_file(language: String, path: String, content: String) -> Result<(), String> {
    let mut manager = LSP_MANAGER.lock().map_err(|e| e.to_string())?;
    manager.notify_open(&language, &path, &content)
}

#[tauri::command]
pub async fn lsp_update_file(language: String, path: String, content: String) -> Result<(), String> {
    let mut manager = LSP_MANAGER.lock().map_err(|e| e.to_string())?;
    manager.notify_change(&language, &path, &content)
}

#[tauri::command]
pub async fn lsp_get_completions(language: String, path: String, line: u32, column: u32) -> Result<Vec<CompletionResult>, String> {
    let mut manager = LSP_MANAGER.lock().map_err(|e| e.to_string())?;
    manager.get_completions(&language, &path, line, column)
}

// Warm up LSP servers for common languages in a project
#[tauri::command]
pub async fn lsp_warmup(workspace_root: String, languages: Vec<String>) -> Result<Vec<String>, String> {
    let mut manager = LSP_MANAGER.lock().map_err(|e| e.to_string())?;
    let mut started = Vec::new();

    for lang in languages {
        if manager.start_server(&lang, &workspace_root).is_ok() {
            started.push(lang);
        }
    }

    Ok(started)
}

// Simple built-in Emmet expansion
#[tauri::command]
pub fn emmet_expand(abbreviation: String, _language: String) -> Result<String, String> {
    expand_emmet(&abbreviation)
}

fn expand_emmet(abbr: &str) -> Result<String, String> {
    // Simple emmet parser for common patterns
    let mut result = String::new();
    let mut chars = abbr.chars().peekable();

    parse_element(&mut chars, &mut result, 0)?;

    Ok(result)
}

fn parse_element(chars: &mut std::iter::Peekable<std::str::Chars>, result: &mut String, indent: usize) -> Result<(), String> {
    let indent_str = "  ".repeat(indent);

    // Parse tag name
    let mut tag = String::new();
    let mut id = String::new();
    let mut classes = Vec::new();
    let mut count = 1;
    let mut text = String::new();

    while let Some(&c) = chars.peek() {
        match c {
            'a'..='z' | 'A'..='Z' | '0'..='9' | '-' | '_' if id.is_empty() && classes.is_empty() => {
                tag.push(chars.next().unwrap());
            }
            '#' => {
                chars.next();
                while let Some(&c) = chars.peek() {
                    if c.is_alphanumeric() || c == '-' || c == '_' {
                        id.push(chars.next().unwrap());
                    } else {
                        break;
                    }
                }
            }
            '.' => {
                chars.next();
                let mut class = String::new();
                while let Some(&c) = chars.peek() {
                    if c.is_alphanumeric() || c == '-' || c == '_' {
                        class.push(chars.next().unwrap());
                    } else {
                        break;
                    }
                }
                if !class.is_empty() {
                    classes.push(class);
                }
            }
            '*' => {
                chars.next();
                let mut num = String::new();
                while let Some(&c) = chars.peek() {
                    if c.is_ascii_digit() {
                        num.push(chars.next().unwrap());
                    } else {
                        break;
                    }
                }
                count = num.parse().unwrap_or(1);
            }
            '{' => {
                chars.next();
                while let Some(&c) = chars.peek() {
                    if c == '}' {
                        chars.next();
                        break;
                    }
                    text.push(chars.next().unwrap());
                }
            }
            '>' | '+' | '(' | ')' | ' ' => break,
            _ => { chars.next(); }
        }
    }

    // Default to div if only id/class specified
    if tag.is_empty() && (!id.is_empty() || !classes.is_empty()) {
        tag = "div".to_string();
    }

    // Handle self-closing tags
    let self_closing = matches!(tag.as_str(),
        "img" | "input" | "br" | "hr" | "meta" | "link" | "area" | "base" | "col" | "embed" | "param" | "source" | "track" | "wbr"
    );

    for i in 0..count {
        if !tag.is_empty() {
            result.push_str(&indent_str);
            result.push('<');
            result.push_str(&tag);

            if !id.is_empty() {
                let actual_id = if count > 1 {
                    format!("{}_{}", id, i + 1)
                } else {
                    id.clone()
                };
                result.push_str(&format!(" id=\"{}\"", actual_id));
            }

            if !classes.is_empty() {
                result.push_str(&format!(" class=\"{}\"", classes.join(" ")));
            }

            if self_closing {
                result.push_str(" />");
            } else {
                result.push('>');
            }
        }

        // Handle children
        if let Some(&c) = chars.peek() {
            if c == '>' {
                chars.next();
                if !self_closing && !tag.is_empty() {
                    result.push('\n');
                }
                parse_element(chars, result, indent + 1)?;
                if !self_closing && !tag.is_empty() {
                    result.push('\n');
                    result.push_str(&indent_str);
                }
            }
        }

        if !tag.is_empty() && !self_closing {
            if !text.is_empty() {
                result.push_str(&text);
            }
            result.push_str(&format!("</{}>", tag));
        }

        // Handle siblings
        if let Some(&c) = chars.peek() {
            if c == '+' {
                chars.next();
                result.push('\n');
                parse_element(chars, result, indent)?;
            }
        }
    }

    Ok(())
}
