# Code Editor

A lightweight, cross-platform code editor built with Tauri, Svelte, and CodeMirror.

## Features

- **Fast & Lightweight** - Built with Tauri for minimal resource usage
- **Syntax Highlighting** - Support for JavaScript, TypeScript, Python, Rust, HTML, CSS, and more
- **File Explorer** - Browse and manage your project files
- **Multiple Tabs** - Work with multiple files simultaneously
- **Integrated Terminal** - Run commands without leaving the editor
- **Git Integration** - View changes, stage files, and commit
- **Dark/Light Theme** - Beautiful Catppuccin-based themes
- **Command Palette** - Quick access to all commands (Cmd/Ctrl+P)

## Screenshots

(Coming soon)

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

### Development

```bash
# Clone the repository
git clone https://github.com/serik/code-editor.git
cd code-editor

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Build

```bash
# Build for production
npm run tauri build
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + O` | Open file |
| `Cmd/Ctrl + Shift + O` | Open folder |
| `Cmd/Ctrl + S` | Save file |
| `Cmd/Ctrl + P` | Command palette |
| `Cmd/Ctrl + W` | Close tab |
| `Cmd/Ctrl + F` | Find in file |
| `Cmd/Ctrl + Shift + F` | Find in files |
| `Cmd/Ctrl + `` ` `` | Toggle terminal |
| `Cmd/Ctrl + B` | Toggle sidebar |

## Tech Stack

- **Frontend**: [Svelte 5](https://svelte.dev/) + TypeScript
- **Editor**: [CodeMirror 6](https://codemirror.net/)
- **Backend**: [Rust](https://www.rust-lang.org/) + [Tauri 2](https://tauri.app/)
- **Terminal**: [xterm.js](https://xtermjs.org/)
- **Git**: [git2-rs](https://github.com/rust-lang/git2-rs)

## Project Structure

```
code-editor/
├── src/                      # Svelte frontend
│   ├── lib/
│   │   ├── components/       # UI components
│   │   ├── stores/           # Svelte stores
│   │   ├── codemirror/       # CodeMirror setup
│   │   └── utils/            # Utilities
│   ├── App.svelte
│   └── main.ts
├── src-tauri/                # Rust backend
│   ├── src/
│   │   ├── commands/         # Tauri commands
│   │   ├── lib.rs
│   │   └── main.rs
│   └── Cargo.toml
└── package.json
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
