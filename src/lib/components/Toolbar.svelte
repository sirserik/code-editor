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
      closeMenu();
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
</style>
