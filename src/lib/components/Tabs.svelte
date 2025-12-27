<script lang="ts">
  import { filesStore, activeFilePathStore } from "$lib/stores/files";

  function handleTabClick(path: string) {
    activeFilePathStore.set(path);
  }

  function handleCloseTab(e: MouseEvent, path: string) {
    e.stopPropagation();
    filesStore.closeFile(path);
    // If closing active tab, switch to another
    if ($activeFilePathStore === path) {
      const remaining = $filesStore.filter((f) => f.path !== path);
      activeFilePathStore.set(remaining.length > 0 ? remaining[0].path : null);
    }
  }

  function getFileIcon(name: string): string {
    const ext = name.split(".").pop()?.toLowerCase();
    const icons: Record<string, string> = {
      js: "📜",
      ts: "📘",
      jsx: "⚛️",
      tsx: "⚛️",
      py: "🐍",
      rs: "🦀",
      go: "🐹",
      html: "🌐",
      css: "🎨",
      json: "📋",
      md: "📝",
    };
    return icons[ext || ""] || "📄";
  }
</script>

<div class="tabs-bar">
  <div class="tabs-scroll">
    {#each $filesStore as file}
      <button
        class="tab"
        class:active={$activeFilePathStore === file.path}
        class:dirty={file.isDirty}
        onclick={() => handleTabClick(file.path)}
        title={file.path}
      >
        <span class="icon">{getFileIcon(file.name)}</span>
        <span class="name truncate">{file.name}</span>
        {#if file.isDirty}
          <span class="dirty-indicator">●</span>
        {/if}
        <button
          class="close-btn"
          onclick={(e) => handleCloseTab(e, file.path)}
          title="Close"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </button>
    {/each}
  </div>
</div>

<style>
  .tabs-bar {
    display: flex;
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border);
    min-height: var(--tab-height);
  }

  .tabs-scroll {
    display: flex;
    overflow-x: auto;
    flex: 1;
  }

  .tabs-scroll::-webkit-scrollbar {
    height: 3px;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 12px;
    height: var(--tab-height);
    background: transparent;
    border-right: 1px solid var(--border);
    color: var(--text-muted);
    font-size: 13px;
    white-space: nowrap;
    transition: all 0.1s;
    max-width: 200px;
  }

  .tab:hover {
    background: var(--bg-hover);
    color: var(--text-secondary);
  }

  .tab.active {
    background: var(--bg-primary);
    color: var(--text-primary);
    border-bottom: 2px solid var(--accent);
    margin-bottom: -1px;
  }

  .tab.dirty .name {
    font-style: italic;
  }

  .icon {
    font-size: 14px;
    flex-shrink: 0;
  }

  .name {
    flex: 1;
    min-width: 0;
  }

  .dirty-indicator {
    color: var(--accent);
    font-size: 10px;
    margin-left: -4px;
  }

  .close-btn {
    padding: 2px;
    border-radius: 4px;
    opacity: 0;
    transition: all 0.1s;
    color: var(--text-muted);
    margin-left: auto;
  }

  .tab:hover .close-btn {
    opacity: 1;
  }

  .close-btn:hover {
    background: var(--bg-active);
    color: var(--text-primary);
  }
</style>
