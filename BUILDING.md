# Building Code Editor

This guide explains how to build Code Editor from source on different operating systems.

## Table of Contents

- [Prerequisites](#prerequisites)
- [macOS](#macos)
- [Windows](#windows)
- [Linux](#linux)
- [Cross-Compilation](#cross-compilation)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Code Editor is built with [Tauri](https://tauri.app), which requires:

1. **Node.js** (v18 or later)
2. **Rust** (latest stable)
3. **Platform-specific dependencies** (see below)

---

## macOS

### Step 1: Install Xcode Command Line Tools

```bash
xcode-select --install
```

### Step 2: Install Node.js

**Option A: Using Homebrew (recommended)**
```bash
# Install Homebrew if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node
```

**Option B: Using nvm**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.zshrc  # or ~/.bashrc
nvm install 20
nvm use 20
```

**Option C: Direct download**
Download from https://nodejs.org/en/download/

### Step 3: Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Follow the prompts (press Enter for default installation).

**Restart terminal** or run:
```bash
source ~/.cargo/env
```

Verify installation:
```bash
rustc --version
# Should output: rustc 1.XX.X
```

### Step 4: Clone and Build

```bash
# Clone repository
git clone https://github.com/sirserik/code-editor.git
cd code-editor

# Install npm dependencies
npm install

# Build for production
npm run tauri build
```

### Build Output

The built application will be in:
```
src-tauri/target/release/bundle/
├── macos/
│   └── Code Editor.app
└── dmg/
    └── Code Editor_0.1.0_x64.dmg
```

### Build for Apple Silicon (M1/M2/M3/M4)

If you're on an Intel Mac and want to build for Apple Silicon:

```bash
# Add ARM target
rustup target add aarch64-apple-darwin

# Build for ARM
npm run tauri build -- --target aarch64-apple-darwin
```

### Build Universal Binary (Intel + Apple Silicon)

```bash
# Add both targets
rustup target add aarch64-apple-darwin
rustup target add x86_64-apple-darwin

# Build universal binary
npm run tauri build -- --target universal-apple-darwin
```

---

## Windows

### Step 1: Install Visual Studio Build Tools

Download and install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/).

During installation, select:
- **"Desktop development with C++"** workload
- **Windows 10/11 SDK**
- **MSVC v143 - VS 2022 C++ x64/x86 build tools**

### Step 2: Install WebView2

Windows 10 (1803+) and Windows 11 have WebView2 pre-installed. For older versions:
Download from https://developer.microsoft.com/en-us/microsoft-edge/webview2/

### Step 3: Install Node.js

Download and install from https://nodejs.org/en/download/

Or using winget:
```powershell
winget install OpenJS.NodeJS.LTS
```

Or using Chocolatey:
```powershell
choco install nodejs-lts
```

### Step 4: Install Rust

Download and run the installer from https://rustup.rs

Or using PowerShell:
```powershell
winget install Rustlang.Rustup
```

**Restart your terminal/PowerShell** after installation.

Verify:
```powershell
rustc --version
```

### Step 5: Clone and Build

```powershell
# Clone repository
git clone https://github.com/sirserik/code-editor.git
cd code-editor

# Install npm dependencies
npm install

# Build for production
npm run tauri build
```

### Build Output

```
src-tauri\target\release\bundle\
├── msi\
│   └── Code Editor_0.1.0_x64_en-US.msi
└── nsis\
    └── Code Editor_0.1.0_x64-setup.exe
```

---

## Linux

### Ubuntu / Debian

#### Step 1: Install system dependencies

```bash
sudo apt update
sudo apt install -y \
    libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libxdo-dev \
    libssl-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

#### Step 2: Install Node.js

```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Or using nvm:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
```

#### Step 3: Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

#### Step 4: Clone and Build

```bash
git clone https://github.com/sirserik/code-editor.git
cd code-editor
npm install
npm run tauri build
```

### Fedora / RHEL

#### Step 1: Install system dependencies

```bash
sudo dnf install -y \
    webkit2gtk4.1-devel \
    openssl-devel \
    curl \
    wget \
    file \
    libxdo-devel \
    libappindicator-gtk3-devel \
    librsvg2-devel \
    gcc \
    gcc-c++
```

#### Step 2: Install Node.js

```bash
sudo dnf install -y nodejs
```

Or using nvm (see Ubuntu instructions).

#### Step 3: Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

#### Step 4: Clone and Build

```bash
git clone https://github.com/sirserik/code-editor.git
cd code-editor
npm install
npm run tauri build
```

### Arch Linux

#### Step 1: Install dependencies

```bash
sudo pacman -S --needed \
    webkit2gtk-4.1 \
    base-devel \
    curl \
    wget \
    file \
    openssl \
    appmenu-gtk-module \
    libappindicator-gtk3 \
    librsvg \
    libxdo
```

#### Step 2: Install Node.js and Rust

```bash
sudo pacman -S nodejs npm rust
```

#### Step 3: Clone and Build

```bash
git clone https://github.com/sirserik/code-editor.git
cd code-editor
npm install
npm run tauri build
```

### Build Output (Linux)

```
src-tauri/target/release/bundle/
├── deb/
│   └── code-editor_0.1.0_amd64.deb
├── rpm/
│   └── code-editor-0.1.0-1.x86_64.rpm
└── appimage/
    └── code-editor_0.1.0_amd64.AppImage
```

---

## Cross-Compilation

### From macOS to Windows

Cross-compilation to Windows from macOS is **not recommended**. Use:
- GitHub Actions (see `.github/workflows/`)
- A Windows VM
- Docker with Windows container

### From macOS to Linux

```bash
# Install cross-compilation tools
brew install FiloSottile/musl-cross/musl-cross

# Add Linux target
rustup target add x86_64-unknown-linux-gnu

# Build (requires additional setup)
npm run tauri build -- --target x86_64-unknown-linux-gnu
```

**Note:** Cross-compiling to Linux requires setting up a proper toolchain and is complex. Using GitHub Actions or a Linux VM is recommended.

---

## Development Mode

For development with hot-reload:

```bash
npm run tauri dev
```

This starts both the Vite dev server and the Tauri application.

---

## Build Options

### Debug Build

```bash
npm run tauri build -- --debug
```

### Verbose Output

```bash
npm run tauri build -- --verbose
```

### Skip Bundle Creation

To only compile without creating installers:

```bash
cd src-tauri
cargo build --release
```

---

## Troubleshooting

### Common Issues

#### "cargo not found"

Rust is not in PATH. Run:
```bash
source ~/.cargo/env
```

Or add to your shell profile:
```bash
echo 'source ~/.cargo/env' >> ~/.zshrc  # or ~/.bashrc
```

#### "node not found" / "npm not found"

Node.js is not installed or not in PATH. Reinstall Node.js.

#### Build fails on macOS with Xcode errors

```bash
sudo xcode-select --reset
xcode-select --install
```

#### WebView2 errors on Windows

Install WebView2 Runtime from Microsoft.

#### Linux: "webkit2gtk not found"

Install the correct version:
```bash
# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.1-dev

# Fedora
sudo dnf install webkit2gtk4.1-devel
```

#### Build takes too long

First build compiles all Rust dependencies (~2-5 minutes). Subsequent builds are faster.

To speed up:
```bash
# Use all CPU cores
export CARGO_BUILD_JOBS=$(nproc)
```

#### Out of memory during build

Limit parallel jobs:
```bash
export CARGO_BUILD_JOBS=2
```

### Getting Help

- Check [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites)
- Open an issue: https://github.com/sirserik/code-editor/issues

---

## CI/CD

For automated builds on all platforms, see `.github/workflows/build.yml`.

GitHub Actions can build for:
- macOS (Intel + Apple Silicon)
- Windows (x64)
- Linux (x64, deb, rpm, AppImage)
