<script lang="ts">
  import { settingsStore } from "$lib/stores/settings";
  import { activeFileStore, projectRootStore } from "$lib/stores/files";

  interface Props {
    onNewFile: () => void;
    onOpenFile: () => void;
    onOpenFolder: () => void;
    onSave: () => void;
    onSaveAll: () => void;
    onCloseFile: () => void;
    onCloseProject: () => void;
    onToggleSidebar: () => void;
    onToggleTerminal: () => void;
    onGlobalSearch: () => void;
    onQuickOpen: () => void;
    onCommandPalette: () => void;
    onGoToLine: () => void;
    showSidebar: boolean;
    showTerminal: boolean;
  }

  let {
    onNewFile,
    onOpenFile,
    onOpenFolder,
    onSave,
    onSaveAll,
    onCloseFile,
    onCloseProject,
    onToggleSidebar,
    onToggleTerminal,
    onGlobalSearch,
    onQuickOpen,
    onCommandPalette,
    onGoToLine,
    showSidebar,
    showTerminal
  }: Props = $props();

  let activeMenu = $state<string | null>(null);
  let showShortcuts = $state(false);
  let showAbout = $state(false);

  const APP_VERSION = "1.0.0";

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const mod = isMac ? '⌘' : 'Ctrl';

  function toggleMenu(menu: string) {
    activeMenu = activeMenu === menu ? null : menu;
  }

  function closeMenu() {
    activeMenu = null;
  }

  function handleAction(action: () => void) {
    action();
    closeMenu();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (showShortcuts) {
        showShortcuts = false;
      } else if (showAbout) {
        showAbout = false;
      } else {
        closeMenu();
      }
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if activeMenu}
  <div class="menu-backdrop" onclick={closeMenu} role="presentation"></div>
{/if}

<div class="toolbar">
  <!-- File Menu -->
  <div class="menu-container">
    <button
      class="menu-trigger"
      class:active={activeMenu === 'file'}
      onclick={() => toggleMenu('file')}
    >
      File
    </button>
    {#if activeMenu === 'file'}
      <div class="menu-dropdown">
        <button class="menu-item" onclick={() => handleAction(onNewFile)}>
          <span class="menu-label">New File</span>
          <span class="menu-shortcut">{mod}+N</span>
        </button>
        <div class="menu-separator"></div>
        <button class="menu-item" onclick={() => handleAction(onOpenFile)}>
          <span class="menu-label">Open File...</span>
          <span class="menu-shortcut">{mod}+O</span>
        </button>
        <button class="menu-item" onclick={() => handleAction(onOpenFolder)}>
          <span class="menu-label">Open Folder...</span>
          <span class="menu-shortcut">{mod}+⇧+O</span>
        </button>
        <div class="menu-separator"></div>
        <button class="menu-item" onclick={() => handleAction(onSave)} disabled={!$activeFileStore}>
          <span class="menu-label">Save</span>
          <span class="menu-shortcut">{mod}+S</span>
        </button>
        <button class="menu-item" onclick={() => handleAction(onSaveAll)}>
          <span class="menu-label">Save All</span>
          <span class="menu-shortcut">{mod}+⇧+S</span>
        </button>
        <div class="menu-separator"></div>
        <button class="menu-item" onclick={() => handleAction(onCloseFile)} disabled={!$activeFileStore}>
          <span class="menu-label">Close File</span>
          <span class="menu-shortcut">{mod}+W</span>
        </button>
        <button class="menu-item" onclick={() => handleAction(onCloseProject)}>
          <span class="menu-label">Close Project</span>
          <span class="menu-shortcut">{mod}+⇧+W</span>
        </button>
      </div>
    {/if}
  </div>

  <!-- Edit Menu -->
  <div class="menu-container">
    <button
      class="menu-trigger"
      class:active={activeMenu === 'edit'}
      onclick={() => toggleMenu('edit')}
    >
      Edit
    </button>
    {#if activeMenu === 'edit'}
      <div class="menu-dropdown">
        <button class="menu-item" onclick={() => { document.execCommand('undo'); closeMenu(); }}>
          <span class="menu-label">Undo</span>
          <span class="menu-shortcut">{mod}+Z</span>
        </button>
        <button class="menu-item" onclick={() => { document.execCommand('redo'); closeMenu(); }}>
          <span class="menu-label">Redo</span>
          <span class="menu-shortcut">{mod}+⇧+Z</span>
        </button>
        <div class="menu-separator"></div>
        <button class="menu-item" onclick={() => { document.execCommand('cut'); closeMenu(); }}>
          <span class="menu-label">Cut</span>
          <span class="menu-shortcut">{mod}+X</span>
        </button>
        <button class="menu-item" onclick={() => { document.execCommand('copy'); closeMenu(); }}>
          <span class="menu-label">Copy</span>
          <span class="menu-shortcut">{mod}+C</span>
        </button>
        <button class="menu-item" onclick={() => { document.execCommand('paste'); closeMenu(); }}>
          <span class="menu-label">Paste</span>
          <span class="menu-shortcut">{mod}+V</span>
        </button>
        <div class="menu-separator"></div>
        <button class="menu-item" onclick={() => handleAction(onGlobalSearch)}>
          <span class="menu-label">Find in Files</span>
          <span class="menu-shortcut">{mod}+⇧+F</span>
        </button>
      </div>
    {/if}
  </div>

  <!-- View Menu -->
  <div class="menu-container">
    <button
      class="menu-trigger"
      class:active={activeMenu === 'view'}
      onclick={() => toggleMenu('view')}
    >
      View
    </button>
    {#if activeMenu === 'view'}
      <div class="menu-dropdown">
        <button class="menu-item" onclick={() => handleAction(onCommandPalette)}>
          <span class="menu-label">Command Palette</span>
          <span class="menu-shortcut">{mod}+⇧+P</span>
        </button>
        <button class="menu-item" onclick={() => handleAction(onQuickOpen)}>
          <span class="menu-label">Quick Open</span>
          <span class="menu-shortcut">{mod}+P</span>
        </button>
        <div class="menu-separator"></div>
        <button class="menu-item" onclick={() => handleAction(onToggleSidebar)}>
          <span class="menu-label">{showSidebar ? '✓' : ''} Sidebar</span>
          <span class="menu-shortcut">{mod}+B</span>
        </button>
        <button class="menu-item" onclick={() => handleAction(onToggleTerminal)}>
          <span class="menu-label">{showTerminal ? '✓' : ''} Terminal</span>
          <span class="menu-shortcut">{mod}+`</span>
        </button>
        <div class="menu-separator"></div>
        <button class="menu-item" onclick={() => { settingsStore.zoomIn(); closeMenu(); }}>
          <span class="menu-label">Zoom In</span>
          <span class="menu-shortcut">{mod}+=</span>
        </button>
        <button class="menu-item" onclick={() => { settingsStore.zoomOut(); closeMenu(); }}>
          <span class="menu-label">Zoom Out</span>
          <span class="menu-shortcut">{mod}+-</span>
        </button>
        <button class="menu-item" onclick={() => { settingsStore.resetZoom(); closeMenu(); }}>
          <span class="menu-label">Reset Zoom</span>
          <span class="menu-shortcut">{mod}+0</span>
        </button>
      </div>
    {/if}
  </div>

  <!-- Go Menu -->
  <div class="menu-container">
    <button
      class="menu-trigger"
      class:active={activeMenu === 'go'}
      onclick={() => toggleMenu('go')}
    >
      Go
    </button>
    {#if activeMenu === 'go'}
      <div class="menu-dropdown">
        <button class="menu-item" onclick={() => handleAction(onQuickOpen)}>
          <span class="menu-label">Go to File...</span>
          <span class="menu-shortcut">{mod}+P</span>
        </button>
        <button class="menu-item" onclick={() => handleAction(onGoToLine)} disabled={!$activeFileStore}>
          <span class="menu-label">Go to Line...</span>
          <span class="menu-shortcut">{mod}+G</span>
        </button>
        <div class="menu-separator"></div>
        <button class="menu-item" onclick={() => handleAction(onGlobalSearch)}>
          <span class="menu-label">Go to Symbol in Project</span>
          <span class="menu-shortcut">{mod}+⇧+F</span>
        </button>
      </div>
    {/if}
  </div>

  <!-- Help Menu -->
  <div class="menu-container">
    <button
      class="menu-trigger"
      class:active={activeMenu === 'help'}
      onclick={() => toggleMenu('help')}
    >
      Help
    </button>
    {#if activeMenu === 'help'}
      <div class="menu-dropdown">
        <button class="menu-item" onclick={() => { showShortcuts = true; closeMenu(); }}>
          <span class="menu-label">Keyboard Shortcuts</span>
          <span class="menu-shortcut">{mod}+K {mod}+S</span>
        </button>
        <div class="menu-separator"></div>
        <button class="menu-item" onclick={() => { showAbout = true; closeMenu(); }}>
          <span class="menu-label">About</span>
          <span class="menu-shortcut"></span>
        </button>
      </div>
    {/if}
  </div>

  <div class="toolbar-spacer"></div>

  <!-- Right side: zoom & project info -->
  <div class="toolbar-right">
    <div class="zoom-controls">
      <button class="icon-btn" onclick={() => settingsStore.zoomOut()} title="Zoom Out">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          <line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
      </button>
      <span class="zoom-value" onclick={() => settingsStore.resetZoom()} title="Reset Zoom">
        {$settingsStore.fontSize}px
      </span>
      <button class="icon-btn" onclick={() => settingsStore.zoomIn()} title="Zoom In">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          <line x1="11" y1="8" x2="11" y2="14"/>
          <line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
      </button>
    </div>

    {#if $projectRootStore}
      <span class="project-name" title={$projectRootStore}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
        </svg>
        {$projectRootStore.split('/').pop()}
      </span>
    {/if}
  </div>
</div>

<!-- Keyboard Shortcuts Dialog -->
{#if showShortcuts}
  <div class="dialog-overlay" onclick={() => showShortcuts = false} role="presentation">
    <div class="dialog shortcuts-dialog" onclick={(e) => e.stopPropagation()}>
      <div class="dialog-header">
        <h2>Keyboard Shortcuts</h2>
        <button class="close-btn" onclick={() => showShortcuts = false} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="dialog-content">
        <div class="shortcuts-grid">
          <div class="shortcut-category">
            <h3>File</h3>
            <div class="shortcut-item"><span>New File</span><kbd>{mod}+N</kbd></div>
            <div class="shortcut-item"><span>Open File</span><kbd>{mod}+O</kbd></div>
            <div class="shortcut-item"><span>Open Folder</span><kbd>{mod}+Shift+O</kbd></div>
            <div class="shortcut-item"><span>Save</span><kbd>{mod}+S</kbd></div>
            <div class="shortcut-item"><span>Save All</span><kbd>{mod}+Shift+S</kbd></div>
            <div class="shortcut-item"><span>Close File</span><kbd>{mod}+W</kbd></div>
          </div>
          <div class="shortcut-category">
            <h3>Edit</h3>
            <div class="shortcut-item"><span>Undo</span><kbd>{mod}+Z</kbd></div>
            <div class="shortcut-item"><span>Redo</span><kbd>{mod}+Shift+Z</kbd></div>
            <div class="shortcut-item"><span>Cut</span><kbd>{mod}+X</kbd></div>
            <div class="shortcut-item"><span>Copy</span><kbd>{mod}+C</kbd></div>
            <div class="shortcut-item"><span>Paste</span><kbd>{mod}+V</kbd></div>
            <div class="shortcut-item"><span>Find in Files</span><kbd>{mod}+Shift+F</kbd></div>
          </div>
          <div class="shortcut-category">
            <h3>View</h3>
            <div class="shortcut-item"><span>Command Palette</span><kbd>{mod}+Shift+P</kbd></div>
            <div class="shortcut-item"><span>Quick Open</span><kbd>{mod}+P</kbd></div>
            <div class="shortcut-item"><span>Toggle Sidebar</span><kbd>{mod}+B</kbd></div>
            <div class="shortcut-item"><span>Toggle Terminal</span><kbd>{mod}+`</kbd></div>
            <div class="shortcut-item"><span>Zoom In</span><kbd>{mod}+=</kbd></div>
            <div class="shortcut-item"><span>Zoom Out</span><kbd>{mod}+-</kbd></div>
            <div class="shortcut-item"><span>Reset Zoom</span><kbd>{mod}+0</kbd></div>
          </div>
          <div class="shortcut-category">
            <h3>Editor</h3>
            <div class="shortcut-item"><span>Go to Line</span><kbd>{mod}+G</kbd></div>
            <div class="shortcut-item"><span>Duplicate Line</span><kbd>{mod}+D</kbd></div>
            <div class="shortcut-item"><span>Move Line Up</span><kbd>Alt+Up</kbd></div>
            <div class="shortcut-item"><span>Move Line Down</span><kbd>Alt+Down</kbd></div>
            <div class="shortcut-item"><span>Go to Bracket</span><kbd>{mod}+Shift+M</kbd></div>
            <div class="shortcut-item"><span>Indent</span><kbd>Tab</kbd></div>
            <div class="shortcut-item"><span>Outdent</span><kbd>Shift+Tab</kbd></div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- About Dialog -->
{#if showAbout}
  <div class="dialog-overlay" onclick={() => showAbout = false} role="presentation">
    <div class="dialog about-dialog" onclick={(e) => e.stopPropagation()}>
      <div class="dialog-header">
        <h2>About Code Editor</h2>
        <button class="close-btn" onclick={() => showAbout = false} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="dialog-content about-content">
        <div class="app-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
            <line x1="12" y1="2" x2="12" y2="22" stroke="var(--accent)" stroke-width="0.5" opacity="0.5"></line>
          </svg>
        </div>
        <h3>Code Editor</h3>
        <p class="version">Version {APP_VERSION}</p>
        <p class="description">
          A lightweight, fast, and modern code editor built with Tauri, Svelte, and CodeMirror.
        </p>
        <div class="tech-stack">
          <span class="tech-badge">Tauri 2</span>
          <span class="tech-badge">Svelte 5</span>
          <span class="tech-badge">CodeMirror 6</span>
          <span class="tech-badge">Rust</span>
        </div>
        <p class="copyright">MIT License</p>
      </div>
    </div>
  </div>
{/if}

<style>
  .toolbar {
    display: flex;
    align-items: center;
    padding: 0 8px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
    height: 32px;
    position: relative;
    z-index: 100;
  }

  .menu-backdrop {
    position: fixed;
    inset: 0;
    z-index: 99;
  }

  .menu-container {
    position: relative;
  }

  .menu-trigger {
    padding: 4px 12px;
    font-size: 13px;
    color: var(--text-secondary);
    background: transparent;
    border-radius: 4px;
    transition: all 0.1s;
  }

  .menu-trigger:hover,
  .menu-trigger.active {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .menu-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
    min-width: 220px;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    padding: 6px;
    z-index: 1000;
  }

  .menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 8px 12px;
    font-size: 13px;
    color: var(--text-primary);
    background: transparent;
    border-radius: 4px;
    text-align: left;
    transition: background 0.1s;
  }

  .menu-item:hover:not(:disabled) {
    background: var(--accent);
    color: var(--bg-primary);
  }

  .menu-item:hover:not(:disabled) .menu-shortcut {
    color: var(--bg-primary);
    opacity: 0.8;
  }

  .menu-item:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .menu-label {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .menu-shortcut {
    font-size: 11px;
    color: var(--text-muted);
    font-family: system-ui;
  }

  .menu-separator {
    height: 1px;
    background: var(--border);
    margin: 6px 0;
  }

  .toolbar-spacer {
    flex: 1;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 4px;
    background: var(--bg-primary);
    border-radius: 6px;
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    color: var(--text-muted);
    background: transparent;
    border-radius: 4px;
    transition: all 0.1s;
  }

  .icon-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .zoom-value {
    font-size: 11px;
    color: var(--text-secondary);
    padding: 2px 8px;
    cursor: pointer;
    min-width: 40px;
    text-align: center;
  }

  .zoom-value:hover {
    color: var(--text-primary);
  }

  .project-name {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-muted);
    padding: 4px 10px;
    background: var(--bg-primary);
    border-radius: 6px;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Dialog styles */
  .dialog-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .shortcuts-dialog {
    width: 700px;
    max-width: 90vw;
  }

  .about-dialog {
    width: 400px;
    max-width: 90vw;
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
  }

  .dialog-header h2 {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    color: var(--text-muted);
    border-radius: 6px;
  }

  .close-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .dialog-content {
    padding: 20px;
    overflow-y: auto;
  }

  /* Shortcuts grid */
  .shortcuts-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }

  .shortcut-category h3 {
    font-size: 13px;
    font-weight: 600;
    color: var(--accent);
    margin: 0 0 12px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .shortcut-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .shortcut-item kbd {
    font-family: var(--font-mono);
    font-size: 11px;
    padding: 3px 8px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-primary);
  }

  /* About dialog content */
  .about-content {
    text-align: center;
  }

  .app-icon {
    margin-bottom: 16px;
  }

  .about-content h3 {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 8px 0;
  }

  .version {
    font-size: 13px;
    color: var(--text-muted);
    margin: 0 0 16px 0;
  }

  .description {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0 0 20px 0;
  }

  .tech-stack {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin-bottom: 20px;
  }

  .tech-badge {
    font-size: 11px;
    padding: 4px 10px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 12px;
    color: var(--text-secondary);
  }

  .copyright {
    font-size: 12px;
    color: var(--text-muted);
    margin: 0;
  }
</style>
