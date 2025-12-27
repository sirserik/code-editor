<script lang="ts">
  import { fileTreeStore, filesStore, activeFilePathStore, getLanguageFromPath, projectRootStore } from "$lib/stores/files";
  import { readFile, listDirectory } from "$lib/utils/ipc";
  import type { FileEntry } from "$lib/stores/files";

  async function handleFileClick(entry: FileEntry) {
    if (entry.isDirectory) {
      // Toggle expand
      if (!entry.children) {
        // Load children
        const children = await listDirectory(entry.path);
        fileTreeStore.setTree(
          updateTreeWithChildren($fileTreeStore, entry.path, children)
        );
      }
      fileTreeStore.toggleExpand(entry.path);
    } else {
      // Open file
      try {
        const content = await readFile(entry.path);
        filesStore.openFile({
          path: entry.path,
          name: entry.name,
          content,
          language: getLanguageFromPath(entry.path),
          isDirty: false,
          cursorPosition: { line: 1, column: 1 },
        });
        activeFilePathStore.set(entry.path);
      } catch (err) {
        console.error("Failed to open file:", err);
      }
    }
  }

  function updateTreeWithChildren(
    tree: FileEntry[],
    path: string,
    children: FileEntry[]
  ): FileEntry[] {
    return tree.map((entry) => {
      if (entry.path === path) {
        return { ...entry, children, isExpanded: true };
      }
      if (entry.children) {
        return {
          ...entry,
          children: updateTreeWithChildren(entry.children, path, children),
        };
      }
      return entry;
    });
  }

  function getFileIcon(entry: FileEntry): string {
    if (entry.isDirectory) {
      return entry.isExpanded ? "📂" : "📁";
    }
    const ext = entry.name.split(".").pop()?.toLowerCase();
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
      svg: "🖼️",
      png: "🖼️",
      jpg: "🖼️",
      git: "📦",
      lock: "🔒",
    };
    return icons[ext || ""] || "📄";
  }
</script>

<div class="file-tree">
  {#if $fileTreeStore.length === 0}
    <div class="empty-state">
      <p>No folder opened</p>
      <p class="hint">Open a folder to start working</p>
    </div>
  {:else}
    <div class="tree-root">
      {#if $projectRootStore}
        <div class="root-name">{$projectRootStore.split("/").pop()}</div>
      {/if}
      {#each $fileTreeStore as entry}
        <svelte:self {entry} depth={0} />
      {/each}
    </div>
  {/if}
</div>

{#snippet entryRow(entry: FileEntry, depth: number)}
  <div
    class="tree-item"
    class:directory={entry.isDirectory}
    class:active={$activeFilePathStore === entry.path}
    style="padding-left: {12 + depth * 16}px"
    onclick={() => handleFileClick(entry)}
    onkeydown={(e) => e.key === "Enter" && handleFileClick(entry)}
    role="treeitem"
    tabindex="0"
  >
    <span class="icon">{getFileIcon(entry)}</span>
    <span class="name truncate">{entry.name}</span>
  </div>
  {#if entry.isDirectory && entry.isExpanded && entry.children}
    {#each entry.children as child}
      {@render entryRow(child, depth + 1)}
    {/each}
  {/if}
{/snippet}

{#if $$props.entry}
  {@render entryRow($$props.entry, $$props.depth || 0)}
{/if}

<style>
  .file-tree {
    flex: 1;
    overflow: auto;
    padding: 4px 0;
  }

  .empty-state {
    padding: 16px;
    text-align: center;
    color: var(--text-muted);
  }

  .empty-state .hint {
    font-size: 12px;
    margin-top: 8px;
  }

  .root-name {
    padding: 4px 12px;
    font-weight: 600;
    font-size: 11px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .tree-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-secondary);
    transition: background 0.1s;
  }

  .tree-item:hover {
    background: var(--bg-hover);
  }

  .tree-item.active {
    background: var(--bg-active);
    color: var(--text-primary);
  }

  .tree-item.directory {
    font-weight: 500;
  }

  .icon {
    font-size: 14px;
    width: 18px;
    text-align: center;
    flex-shrink: 0;
  }

  .name {
    flex: 1;
    min-width: 0;
  }
</style>
