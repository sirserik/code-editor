<script lang="ts">
  import Sidebar from "$lib/components/Sidebar.svelte";
  import Tabs from "$lib/components/Tabs.svelte";
  import Editor from "$lib/components/Editor.svelte";
  import Terminal from "$lib/components/Terminal.svelte";
  import StatusBar from "$lib/components/StatusBar.svelte";
  import CommandPalette from "$lib/components/CommandPalette.svelte";
  import { filesStore, activeFileStore } from "$lib/stores/files";
  import { settingsStore } from "$lib/stores/settings";
  import { setupKeybindings } from "$lib/utils/keybindings";
  import { onMount } from "svelte";

  let showTerminal = $state(false);
  let showCommandPalette = $state(false);
  let sidebarWidth = $state(250);

  onMount(() => {
    setupKeybindings({
      onToggleTerminal: () => (showTerminal = !showTerminal),
      onToggleCommandPalette: () => (showCommandPalette = !showCommandPalette),
    });

    // Apply theme
    document.documentElement.dataset.theme = $settingsStore.theme;
  });

  $effect(() => {
    document.documentElement.dataset.theme = $settingsStore.theme;
  });
</script>

<div class="app">
  <div class="main-container">
    <Sidebar bind:width={sidebarWidth} />

    <div class="editor-area">
      <Tabs />

      <div class="editor-container">
        {#if $activeFileStore}
          <Editor file={$activeFileStore} />
        {:else}
          <div class="welcome">
            <div class="welcome-content">
              <h1>Code Editor</h1>
              <p>Open a file or folder to start editing</p>
              <div class="shortcuts">
                <div class="shortcut">
                  <kbd>⌘</kbd><kbd>O</kbd>
                  <span>Open File</span>
                </div>
                <div class="shortcut">
                  <kbd>⌘</kbd><kbd>⇧</kbd><kbd>O</kbd>
                  <span>Open Folder</span>
                </div>
                <div class="shortcut">
                  <kbd>⌘</kbd><kbd>P</kbd>
                  <span>Command Palette</span>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>

      {#if showTerminal}
        <Terminal onClose={() => (showTerminal = false)} />
      {/if}
    </div>
  </div>

  <StatusBar {showTerminal} onToggleTerminal={() => (showTerminal = !showTerminal)} />

  {#if showCommandPalette}
    <CommandPalette onClose={() => (showCommandPalette = false)} />
  {/if}
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    overflow: hidden;
  }

  .main-container {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .editor-area {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }

  .editor-container {
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  .welcome {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    background: var(--bg-primary);
  }

  .welcome-content {
    text-align: center;
    color: var(--text-muted);
  }

  .welcome-content h1 {
    font-size: 2rem;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--text-secondary);
  }

  .welcome-content p {
    margin-bottom: 32px;
  }

  .shortcuts {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
  }

  .shortcut {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .shortcut kbd {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    min-width: 24px;
    text-align: center;
  }

  .shortcut span {
    color: var(--text-secondary);
    margin-left: 8px;
  }
</style>
