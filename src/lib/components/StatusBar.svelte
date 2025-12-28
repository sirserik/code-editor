<script lang="ts">
  import { activeFileStore } from "$lib/stores/files";
  import { settingsStore } from "$lib/stores/settings";
  import { gitStore } from "$lib/stores/git";

  interface Props {
    showTerminal: boolean;
    onToggleTerminal: () => void;
  }

  let { showTerminal, onToggleTerminal }: Props = $props();

  function toggleTheme() {
    settingsStore.update({
      theme: $settingsStore.theme === "dark" ? "light" : "dark",
    });
  }
</script>

<footer class="status-bar">
  <div class="left">
    {#if $gitStore}
      <button class="status-item" title="Git Branch">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="6" y1="3" x2="6" y2="15"></line>
          <circle cx="18" cy="6" r="3"></circle>
          <circle cx="6" cy="18" r="3"></circle>
          <path d="M18 9a9 9 0 0 1-9 9"></path>
        </svg>
        <span>{$gitStore.branch}</span>
        {#if $gitStore.ahead > 0}
          <span class="badge">↑{$gitStore.ahead}</span>
        {/if}
        {#if $gitStore.behind > 0}
          <span class="badge">↓{$gitStore.behind}</span>
        {/if}
      </button>
    {/if}
  </div>

  <div class="right">
    <!-- Zoom controls -->
    <div class="zoom-controls">
      <button class="zoom-btn" onclick={() => settingsStore.zoomOut()} title="Zoom Out (Cmd/Ctrl -)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
      </button>
      <button class="zoom-value" onclick={() => settingsStore.resetZoom()} title="Reset Zoom">
        {$settingsStore.fontSize}px
      </button>
      <button class="zoom-btn" onclick={() => settingsStore.zoomIn()} title="Zoom In (Cmd/Ctrl +)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="11" y1="8" x2="11" y2="14"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
      </button>
    </div>

    {#if $activeFileStore}
      <span class="status-item">
        Ln {$activeFileStore.cursorPosition.line}, Col {$activeFileStore.cursorPosition.column}
      </span>
      <span class="status-item">
        {$activeFileStore.language.toUpperCase()}
      </span>
      <span class="status-item">
        {$settingsStore.insertSpaces ? "Spaces" : "Tabs"}: {$settingsStore.tabSize}
      </span>
    {/if}
    <button class="status-item" onclick={onToggleTerminal} title="Toggle Terminal">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="4 17 10 11 4 5"></polyline>
        <line x1="12" y1="19" x2="20" y2="19"></line>
      </svg>
      <span>Terminal</span>
    </button>
    <button class="status-item" onclick={toggleTheme} title="Toggle Theme">
      {#if $settingsStore.theme === "dark"}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      {:else}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      {/if}
    </button>
  </div>
</footer>

<style>
  .status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--statusbar-height);
    padding: 0 8px;
    background: var(--accent);
    color: var(--bg-primary);
    font-size: 12px;
  }

  .left,
  .right {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 8px;
    height: 100%;
    background: transparent;
    color: inherit;
    transition: background 0.1s;
  }

  .status-item:hover {
    background: rgba(0, 0, 0, 0.1);
  }

  .badge {
    font-size: 10px;
    padding: 0 4px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 2px;
  }

  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-right: 8px;
    padding: 0 4px;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
  }

  .zoom-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    background: transparent;
    color: inherit;
    border-radius: 3px;
    transition: background 0.1s;
  }

  .zoom-btn:hover {
    background: rgba(0, 0, 0, 0.15);
  }

  .zoom-value {
    padding: 2px 6px;
    font-size: 11px;
    font-weight: 500;
    background: transparent;
    color: inherit;
    border-radius: 3px;
    min-width: 36px;
    text-align: center;
  }

  .zoom-value:hover {
    background: rgba(0, 0, 0, 0.15);
  }
</style>
