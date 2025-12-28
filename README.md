<p align="center">
  <img src="src-tauri/icons/128x128.png" alt="Code Editor Logo" width="128" height="128">
</p>

<h1 align="center">Code Editor</h1>

<p align="center">
  A lightweight, fast, cross-platform code editor built with Tauri, Svelte 5, and CodeMirror 6.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#keyboard-shortcuts">Shortcuts</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#api-reference">API</a> •
  <a href="#license">License</a>
</p>

---

## Features

### Editor Core

| Feature | Description |
|---------|-------------|
| **Syntax Highlighting** | Support for 25+ languages with semantic highlighting |
| **Multiple Tabs** | Work with multiple files with dirty state indicators |
| **Dark/Light Themes** | Tokyo Night theme with automatic system detection |
| **Zoom Controls** | Adjustable font size (8-32px) with keyboard shortcuts |
| **Line Numbers** | Gutter with line numbers and fold markers |
| **Bracket Matching** | Automatic bracket pairing and highlighting |
| **Auto-indent** | Smart indentation based on language |
| **Selection Highlighting** | Highlight all occurrences of selected text |

### IntelliSense & LSP

| Feature | Description |
|---------|-------------|
| **LSP Integration** | Language Server Protocol support for smart completions |
| **Emmet Expansion** | Tab-triggered Emmet abbreviations in HTML/CSS/JSX |
| **Auto-completion** | Context-aware code suggestions |
| **Server Pooling** | Efficient LSP server management with auto-cleanup |

**Supported LSP Servers:**
- TypeScript/JavaScript (`typescript-language-server`)
- Rust (`rust-analyzer`)
- Python (`pylsp`)
- Go (`gopls`)
- HTML/CSS/JSON (built-in via `vscode-langservers`)

### File Management

| Feature | Description |
|---------|-------------|
| **File Tree** | Visual explorer with colored icons per file type |
| **Virtual Scrolling** | Smooth performance with 10,000+ files |
| **Quick Open** | Fuzzy file search with `Cmd+P` |
| **New File Templates** | Create from templates (React, Vue, Svelte, etc.) |
| **Context Menu** | Right-click for New/Rename/Delete operations |
| **Large File Support** | Chunked loading for files >1MB |

### Search

| Feature | Description |
|---------|-------------|
| **Find in File** | `Cmd+F` with regex support |
| **Find in Project** | `Cmd+Shift+F` with streaming results |
| **Go to Line** | `Cmd+G` to jump to specific line |
| **Case Sensitivity** | Toggle case-sensitive search |
| **Match Highlighting** | Highlight all matches in editor |

**Search Features:**
- Real-time streaming results as files are scanned
- Progress indicator showing files searched
- Cancel button for long-running searches
- Results grouped by file with line numbers
- Click to navigate directly to match

### Git Integration

| Feature | Description |
|---------|-------------|
| **Status Display** | View modified, staged, and untracked files |
| **Stage/Unstage** | Individual file or all files at once |
| **Commit** | Commit with message directly from UI |
| **Diff Viewer** | Side-by-side diff view for changes |
| **Discard Changes** | Revert individual files to last commit |
| **Init Repository** | Initialize new git repository |

**Status Indicators:**
| Icon | Status | Description |
|------|--------|-------------|
| `M` | Modified | File has been changed |
| `A` | Added | New file staged for commit |
| `D` | Deleted | File staged for deletion |
| `R` | Renamed | File has been renamed |
| `?` | Untracked | New file not yet tracked |

### Terminal

| Feature | Description |
|---------|-------------|
| **Integrated PTY** | Full terminal emulation with PTY support |
| **Multiple Terminals** | Create and switch between terminal tabs |
| **Resizable** | Drag to resize terminal panel |
| **Shell Detection** | Auto-detects zsh/bash/sh |
| **Copy/Paste** | Full clipboard support |
| **Colors** | 256-color support with ANSI codes |

### UI/UX

| Feature | Description |
|---------|-------------|
| **Menu Bar** | File, Edit, View, Go, Help menus |
| **Sidebar** | Collapsible with file tree and git panel |
| **Command Palette** | `Cmd+Shift+P` for quick commands |
| **Status Bar** | File info, cursor position, language, zoom |
| **Keyboard Shortcuts** | Comprehensive shortcuts (see table below) |
| **Lazy Loading** | Heavy components loaded on demand |

---

## Performance Optimizations

### 1. File Tree Virtualization
- Only renders visible items in viewport
- Fixed item height (28px) for efficient scrolling
- Overscan buffer (5 items) for smooth scroll
- **Result**: DOM elements reduced from 10,000+ to ~30

### 2. Git Status Caching
- Global cache with 2-second TTL
- Automatic invalidation on git operations
- Background refresh on file changes
- **Result**: 60-80% reduction in git API calls

### 3. Search Streaming
- Results stream in real-time via Tauri events
- Cancellable long-running searches
- Progress indicator with file count
- **Result**: Immediate feedback, no blocking

### 4. Large File Chunking
- Files >1MB load first 1000 lines
- "Load More" button for additional content
- "Load Entire File" for full content
- **Result**: Instant open for any file size

### 5. LSP Server Pooling
- Servers start on-demand per language
- Health checks with auto-restart
- Idle cleanup after 5 minutes
- Warmup on project open
- **Result**: 50-70% faster completions

### 6. Lazy Component Loading
- Terminal, GlobalSearch, CommandPalette load on first use
- Dynamic imports for code splitting
- **Result**: Faster initial load time

---

## System Requirements

### Supported Operating Systems

| OS | Version | Architecture |
|----|---------|--------------|
| **macOS** | 10.15+ (Catalina) | Intel (x86_64), Apple Silicon (M1/M2/M3/M4) |
| **Windows** | 10/11 | x86_64, ARM64 |
| **Linux** | Ubuntu 20.04+, Fedora 36+, Arch | x86_64, ARM64 |

### Minimum Requirements

- **RAM**: 512 MB
- **Disk Space**: ~100 MB
- **Display**: 1280x720 or higher

---

## Installation

### Download

Download the latest release from [Releases](https://github.com/sirserik/code-editor/releases).

### Build from Source

```bash
# Clone the repository
git clone https://github.com/sirserik/code-editor.git
cd code-editor

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

---

## Keyboard Shortcuts

### General

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| New File | `Cmd+N` | `Ctrl+N` |
| Open File | `Cmd+O` | `Ctrl+O` |
| Open Folder | `Cmd+Shift+O` | `Ctrl+Shift+O` |
| Save | `Cmd+S` | `Ctrl+S` |
| Save All | `Cmd+Alt+S` | `Ctrl+Alt+S` |
| Close Tab | `Cmd+W` | `Ctrl+W` |
| Close Project | `Cmd+Shift+W` | `Ctrl+Shift+W` |
| Quick Open | `Cmd+P` | `Ctrl+P` |
| Command Palette | `Cmd+Shift+P` | `Ctrl+Shift+P` |
| Find in File | `Cmd+F` | `Ctrl+F` |
| Find in Project | `Cmd+Shift+F` | `Ctrl+Shift+F` |
| Go to Line | `Cmd+G` | `Ctrl+G` |
| Toggle Sidebar | `Cmd+B` | `Ctrl+B` |
| Toggle Terminal | `` Cmd+` `` | `` Ctrl+` `` |

### Zoom

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Zoom In | `Cmd+=` | `Ctrl+=` |
| Zoom Out | `Cmd+-` | `Ctrl+-` |
| Reset Zoom | `Cmd+0` | `Ctrl+0` |

### Editor

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Duplicate Line | `Cmd+D` | `Ctrl+D` |
| Move Line Up | `Alt+Up` | `Alt+Up` |
| Move Line Down | `Alt+Down` | `Alt+Down` |
| Delete Line | `Cmd+Shift+K` | `Ctrl+Shift+K` |
| Toggle Comment | `Cmd+/` | `Ctrl+/` |
| Jump to Bracket | `Cmd+Shift+M` | `Ctrl+Shift+M` |
| Indent | `Tab` | `Tab` |
| Outdent | `Shift+Tab` | `Shift+Tab` |
| Emmet Expand | `Tab` | `Tab` |

### Terminal

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| New Terminal | Click `+` | Click `+` |
| Close Terminal | Click `×` | Click `×` |
| Switch Terminal | Click tab | Click tab |
| Copy | `Cmd+C` | `Ctrl+Shift+C` |
| Paste | `Cmd+V` | `Ctrl+Shift+V` |

---

## Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Svelte 5 + TypeScript | Reactive UI components |
| **Editor** | CodeMirror 6 | Text editing engine |
| **Backend** | Tauri 2 (Rust) | Native operations |
| **Terminal** | xterm.js + PTY | Terminal emulation |
| **Git** | git2 (Rust) | Git operations |
| **LSP** | LSP Client (Rust) | Code intelligence |

### Project Structure

```
code-editor/
├── src/                              # Frontend (Svelte)
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Editor.svelte         # CodeMirror wrapper
│   │   │   ├── FileTree.svelte       # File explorer (virtualized)
│   │   │   ├── Tabs.svelte           # Tab bar
│   │   │   ├── Terminal.svelte       # xterm.js wrapper
│   │   │   ├── GitPanel.svelte       # Git status & operations
│   │   │   ├── GlobalSearch.svelte   # Project search (streaming)
│   │   │   ├── QuickOpen.svelte      # Fuzzy file finder
│   │   │   ├── CommandPalette.svelte # Command palette
│   │   │   ├── Toolbar.svelte        # Menu bar
│   │   │   ├── StatusBar.svelte      # Bottom status bar
│   │   │   └── Sidebar.svelte        # Left sidebar
│   │   ├── stores/
│   │   │   ├── files.ts              # Open files state
│   │   │   ├── settings.ts           # Editor settings
│   │   │   └── git.ts                # Git state
│   │   ├── codemirror/
│   │   │   ├── setup.ts              # Editor configuration
│   │   │   ├── themes.ts             # Tokyo Night themes
│   │   │   ├── languages.ts          # Language support
│   │   │   └── lsp-completion.ts     # LSP integration
│   │   └── utils/
│   │       ├── ipc.ts                # Tauri command wrappers
│   │       └── keybindings.ts        # Keyboard shortcuts
│   ├── App.svelte                    # Root component
│   └── app.css                       # Global styles
│
├── src-tauri/                        # Backend (Rust)
│   ├── src/
│   │   ├── commands/
│   │   │   ├── file.rs               # File operations
│   │   │   ├── git.rs                # Git commands (cached)
│   │   │   ├── lsp.rs                # LSP server pool
│   │   │   ├── terminal.rs           # PTY management
│   │   │   └── settings.rs           # Settings persistence
│   │   └── lib.rs                    # Tauri setup
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── package.json
├── vite.config.ts
└── README.md
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Svelte)                     │
├─────────────────────────────────────────────────────────────┤
│  Components ←→ Stores ←→ IPC Utils                          │
│       ↓              ↓         ↓                            │
│  [Editor]      [filesStore]  [ipc.ts]                       │
│  [FileTree]    [gitStore]       ↓                           │
│  [Terminal]    [settings]    invoke()                       │
└─────────────────────────────────────────────────────────────┘
                              ↕ IPC
┌─────────────────────────────────────────────────────────────┐
│                        Backend (Rust)                        │
├─────────────────────────────────────────────────────────────┤
│  Commands                                                    │
│  ├── file.rs    → File I/O, Search, Large files             │
│  ├── git.rs     → Git operations (cached)                   │
│  ├── lsp.rs     → LSP server pool                           │
│  ├── terminal.rs → PTY spawn/write/resize                   │
│  └── settings.rs → Config persistence                       │
└─────────────────────────────────────────────────────────────┘
```

---

## API Reference

### File Operations

| Command | Parameters | Returns | Description |
|---------|------------|---------|-------------|
| `read_file` | `path: string` | `string` | Read file contents |
| `write_file` | `path, content` | `void` | Write file contents |
| `list_directory` | `path: string` | `FileEntry[]` | List directory contents |
| `create_file` | `path: string` | `void` | Create new file |
| `create_directory` | `path: string` | `void` | Create new directory |
| `delete_file` | `path: string` | `void` | Delete file or directory |
| `rename_file` | `oldPath, newPath` | `void` | Rename/move file |
| `file_exists` | `path: string` | `boolean` | Check if file exists |

### Large File Handling

| Command | Parameters | Returns | Description |
|---------|------------|---------|-------------|
| `get_file_info` | `path` | `FileInfo` | Get file metadata |
| `read_file_chunk` | `path, startLine, lineCount` | `FileChunk` | Read file portion |
| `read_file_smart` | `path` | `SmartFileContent` | Smart partial loading |

```typescript
interface FileInfo {
  path: string;
  size: number;
  is_binary: boolean;
  line_count: number | null;
}

interface SmartFileContent {
  content: string;
  is_partial: boolean;
  total_size: number;
  total_lines: number;
  loaded_lines: number;
}
```

### Search

| Command | Parameters | Returns | Description |
|---------|------------|---------|-------------|
| `search_in_project` | `rootPath, query, options` | `SearchResult[]` | Search files |
| `search_in_project_grouped` | `rootPath, query, caseSensitive` | `GroupedSearchResult[]` | Grouped results |
| `search_streaming_start` | `rootPath, query, caseSensitive` | `number` | Start streaming search |
| `search_streaming_cancel` | `searchId` | `void` | Cancel search |
| `fuzzy_search_files` | `rootPath, query, limit` | `FuzzySearchResult[]` | Fuzzy file search |

### Git Operations

| Command | Parameters | Returns | Description |
|---------|------------|---------|-------------|
| `git_status` | `repoPath` | `GitStatus` | Get repository status (cached) |
| `git_status_fresh` | `repoPath` | `GitStatus` | Get status (bypass cache) |
| `git_diff` | `repoPath, filePath` | `string` | Get file diff |
| `git_stage` | `repoPath, filePath` | `void` | Stage file |
| `git_unstage` | `repoPath, filePath` | `void` | Unstage file |
| `git_stage_all` | `repoPath` | `void` | Stage all changes |
| `git_unstage_all` | `repoPath` | `void` | Unstage all |
| `git_commit` | `repoPath, message` | `void` | Create commit |
| `git_discard` | `repoPath, filePath` | `void` | Discard changes |
| `git_init` | `repoPath` | `void` | Initialize repository |
| `git_invalidate_cache` | `repoPath` | `void` | Clear status cache |

```typescript
interface GitStatus {
  staged: GitFileStatus[];
  unstaged: GitFileStatus[];
  untracked: string[];
  branch: string | null;
  ahead: number;
  behind: number;
}
```

### LSP Operations

| Command | Parameters | Returns | Description |
|---------|------------|---------|-------------|
| `lsp_start` | `language, workspaceRoot` | `void` | Start LSP server |
| `lsp_stop` | - | `void` | Stop all LSP servers |
| `lsp_stop_language` | `language` | `void` | Stop specific server |
| `lsp_restart` | `language` | `void` | Restart server |
| `lsp_status` | - | `LspServerStatus[]` | Get server statuses |
| `lsp_cleanup_idle` | - | `number` | Cleanup idle servers |
| `lsp_warmup` | `workspaceRoot, languages` | `string[]` | Pre-start servers |
| `lsp_open_file` | `language, path, content` | `void` | Notify file open |
| `lsp_update_file` | `language, path, content` | `void` | Notify file change |
| `lsp_get_completions` | `language, path, line, column` | `CompletionResult[]` | Get completions |
| `emmet_expand` | `abbreviation, language` | `string` | Expand Emmet |

```typescript
interface LspServerStatus {
  language: string;
  status: string;
  uptime_secs: number;
  requests_served: number;
}
```

### Terminal Operations

| Command | Parameters | Returns | Description |
|---------|------------|---------|-------------|
| `terminal_spawn` | - | `string` | Spawn new terminal, returns ID |
| `terminal_write` | `id, data` | `void` | Write to terminal |
| `terminal_resize` | `id, cols, rows` | `void` | Resize terminal |
| `terminal_kill` | `id` | `void` | Kill terminal |

### Settings

| Command | Parameters | Returns | Description |
|---------|------------|---------|-------------|
| `get_settings` | - | `Settings` | Get all settings |
| `set_settings` | `settings` | `void` | Save settings |
| `set_font_size` | `size` | `void` | Update font size |
| `set_theme` | `theme` | `void` | Update theme |
| `zoom_in` | - | `number` | Increase font size |
| `zoom_out` | - | `number` | Decrease font size |
| `reset_zoom` | - | `number` | Reset to default |

---

## Supported Languages

| Language | Extensions | LSP | Emmet |
|----------|------------|-----|-------|
| JavaScript | `.js`, `.mjs`, `.cjs` | ✅ | - |
| TypeScript | `.ts`, `.mts`, `.cts` | ✅ | - |
| JSX | `.jsx` | ✅ | ✅ |
| TSX | `.tsx` | ✅ | ✅ |
| HTML | `.html`, `.htm` | ✅ | ✅ |
| CSS | `.css` | ✅ | ✅ |
| SCSS | `.scss`, `.sass` | ✅ | ✅ |
| JSON | `.json` | ✅ | - |
| Markdown | `.md`, `.mdx` | - | - |
| Python | `.py` | ✅ | - |
| Rust | `.rs` | ✅ | - |
| Go | `.go` | ✅ | - |
| PHP | `.php` | - | ✅ |
| Vue | `.vue` | ✅ | ✅ |
| Svelte | `.svelte` | - | ✅ |
| SQL | `.sql` | - | - |
| YAML | `.yml`, `.yaml` | - | - |
| TOML | `.toml` | - | - |
| Shell | `.sh`, `.bash`, `.zsh` | - | - |
| XML | `.xml` | - | - |
| Java | `.java` | - | - |
| C/C++ | `.c`, `.cpp`, `.h` | - | - |
| Ruby | `.rb` | - | - |
| Swift | `.swift` | - | - |
| Kotlin | `.kt`, `.kts` | - | - |

---

## Configuration

Settings are stored in:
- **macOS**: `~/.config/code-editor/settings.json`
- **Windows**: `%APPDATA%/code-editor/settings.json`
- **Linux**: `~/.config/code-editor/settings.json`

```json
{
  "theme": "dark",
  "fontSize": 14,
  "fontFamily": "JetBrains Mono, Menlo, Monaco, monospace",
  "tabSize": 2,
  "insertSpaces": true
}
```

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

<p align="center">
  Made with Tauri + Svelte + Rust
</p>
