<script lang="ts">
  import FileTree from "./FileTree.svelte";
  import GitPanel from "./GitPanel.svelte";
  import { projectRootStore } from "$lib/stores/files";
  import { openFolderDialog, listDirectory } from "$lib/utils/ipc";
  import { fileTreeStore } from "$lib/stores/files";

  interface Props {
    width?: number;
  }

  let { width = $bindable(250) }: Props = $props();

  let activeTab: "files" | "git" = $state("files");
  let isResizing = $state(false);

  async function handleOpenFolder() {
    const folder = await openFolderDialog();
    if (folder) {
      projectRootStore.set(folder);
      const tree = await listDirectory(folder);
      fileTreeStore.setTree(tree);
    }
  }

  function startResize(e: MouseEvent) {
    isResizing = true;
    const startX = e.clientX;
    const startWidth = width;

    function onMouseMove(e: MouseEvent) {
      const delta = e.clientX - startX;
      width = Math.max(150, Math.min(500, startWidth + delta));
    }

    function onMouseUp() {
      isResizing = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }
</script>

<aside class="sidebar" style="width: {width}px">
  <div class="sidebar-tabs">
    <button
      class="tab"
      class:active={activeTab === "files"}
      onclick={() => (activeTab = "files")}
      title="Explorer"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      </svg>
    </button>
    <button
      class="tab"
      class:active={activeTab === "git"}
      onclick={() => (activeTab = "git")}
      title="Source Control"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="18" cy="18" r="3"></circle>
        <circle cx="6" cy="6" r="3"></circle>
        <path d="M13 6h3a2 2 0 0 1 2 2v7"></path>
        <line x1="6" y1="9" x2="6" y2="21"></line>
      </svg>
    </button>
  </div>

  <div class="sidebar-content">
    {#if activeTab === "files"}
      <div class="panel-header">
        <span>EXPLORER</span>
        <button class="icon-btn" onclick={handleOpenFolder} title="Open Folder">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            <line x1="12" y1="11" x2="12" y2="17"></line>
            <line x1="9" y1="14" x2="15" y2="14"></line>
          </svg>
        </button>
      </div>
      <FileTree />
    {:else if activeTab === "git"}
      <div class="panel-header">
        <span>SOURCE CONTROL</span>
      </div>
      <GitPanel />
    {/if}
  </div>

  <div
    class="resize-handle"
    class:active={isResizing}
    onmousedown={startResize}
    role="separator"
    aria-orientation="vertical"
  ></div>
</aside>

<style>
  .sidebar {
    display: flex;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border);
    position: relative;
    flex-shrink: 0;
  }

  .sidebar-tabs {
    display: flex;
    flex-direction: column;
    padding: 8px 4px;
    gap: 4px;
    background: var(--bg-tertiary);
  }

  .tab {
    padding: 8px;
    border-radius: 4px;
    color: var(--text-muted);
    transition: all 0.15s;
  }

  .tab:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
  }

  .tab.active {
    color: var(--accent);
    background: var(--bg-hover);
  }

  .sidebar-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    letter-spacing: 0.5px;
  }

  .icon-btn {
    padding: 4px;
    border-radius: 4px;
    color: var(--text-muted);
  }

  .icon-btn:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
  }

  .resize-handle {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    cursor: col-resize;
    background: transparent;
    transition: background 0.15s;
  }

  .resize-handle:hover,
  .resize-handle.active {
    background: var(--accent);
  }
</style>
