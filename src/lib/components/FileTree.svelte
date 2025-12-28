<script lang="ts">
  import { fileTreeStore, filesStore, activeFilePathStore, getLanguageFromPath, projectRootStore } from "$lib/stores/files";
  import { readFile, listDirectory, deleteFile, renameFile, createFile, createDirectory, confirmDialog, messageDialog } from "$lib/utils/ipc";
  import type { FileEntry } from "$lib/stores/files";
  import ContextMenu from "./ContextMenu.svelte";
  import FileIcon from "./FileIcon.svelte";

  let contextMenu = $state<{ x: number; y: number; entry: FileEntry } | null>(null);

  async function handleFileClick(entry: FileEntry) {
    if (entry.isDirectory) {
      if (!entry.children) {
        try {
          const children = await listDirectory(entry.path);
          fileTreeStore.setTree(
            updateTreeWithChildren($fileTreeStore, entry.path, children)
          );
        } catch (err) {
          console.error("Failed to load directory:", err);
        }
      } else {
        fileTreeStore.toggleExpand(entry.path);
      }
    } else {
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

  function handleContextMenu(e: MouseEvent, entry: FileEntry) {
    e.preventDefault();
    contextMenu = { x: e.clientX, y: e.clientY, entry };
  }

  async function handleNewFile(parentPath: string) {
    const name = prompt("Enter file name:");
    if (!name) return;

    const newPath = `${parentPath}/${name}`;
    try {
      await createFile(newPath);
      await refreshDirectory(parentPath);
    } catch (err) {
      console.error("Failed to create file:", err);
      messageDialog("Error", "Failed to create file: " + err, "error");
    }
  }

  async function handleNewFolder(parentPath: string) {
    const name = prompt("Enter folder name:");
    if (!name) return;

    const newPath = `${parentPath}/${name}`;
    try {
      await createDirectory(newPath);
      await refreshDirectory(parentPath);
    } catch (err) {
      console.error("Failed to create folder:", err);
      messageDialog("Error", "Failed to create folder: " + err, "error");
    }
  }

  async function handleRename(entry: FileEntry) {
    const newName = prompt("Enter new name:", entry.name);
    if (!newName || newName === entry.name) return;

    const parentPath = entry.path.substring(0, entry.path.lastIndexOf("/"));
    const newPath = `${parentPath}/${newName}`;

    try {
      await renameFile(entry.path, newPath);
      // Update open file if it was renamed
      if (!entry.isDirectory && $activeFilePathStore === entry.path) {
        activeFilePathStore.set(newPath);
      }
      await refreshDirectory(parentPath);
    } catch (err) {
      console.error("Failed to rename:", err);
      messageDialog("Error", "Failed to rename: " + err, "error");
    }
  }

  async function handleDelete(entry: FileEntry) {
    const confirmed = await confirmDialog(
      "Delete",
      `Are you sure you want to delete "${entry.name}"?`
    );

    if (!confirmed) return;

    try {
      await deleteFile(entry.path);
      // Close file if it was open
      if (!entry.isDirectory) {
        filesStore.closeFile(entry.path);
        if ($activeFilePathStore === entry.path) {
          const remaining = $filesStore.filter(f => f.path !== entry.path);
          activeFilePathStore.set(remaining.length > 0 ? remaining[0].path : null);
        }
      }
      const parentPath = entry.path.substring(0, entry.path.lastIndexOf("/"));
      await refreshDirectory(parentPath);
    } catch (err) {
      console.error("Failed to delete:", err);
      messageDialog("Error", "Failed to delete: " + err, "error");
    }
  }

  async function refreshDirectory(path: string) {
    if (!$projectRootStore) return;

    if (path === $projectRootStore) {
      const tree = await listDirectory($projectRootStore);
      fileTreeStore.setTree(tree);
    } else {
      // Find and refresh the parent directory
      const children = await listDirectory(path);
      fileTreeStore.setTree(updateTreeWithChildren($fileTreeStore, path, children));
    }
  }

  function getContextMenuItems(entry: FileEntry) {
    const parentPath = entry.isDirectory ? entry.path : entry.path.substring(0, entry.path.lastIndexOf("/"));

    return [
      { label: "New File", icon: "📄", action: () => handleNewFile(parentPath) },
      { label: "New Folder", icon: "📁", action: () => handleNewFolder(parentPath) },
      { separator: true, label: "", action: () => {} },
      { label: "Rename", icon: "✏️", action: () => handleRename(entry) },
      { label: "Delete", icon: "🗑️", action: () => handleDelete(entry) },
    ];
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

  function sortEntries(entries: FileEntry[]): FileEntry[] {
    return [...entries].sort((a, b) => {
      // Directories first
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      // Then alphabetically
      return a.name.localeCompare(b.name);
    });
  }

  function flattenTree(entries: FileEntry[], depth: number = 0, parentHasMore: boolean[] = []): Array<{entry: FileEntry, depth: number, isLast: boolean, guides: boolean[]}> {
    let result: Array<{entry: FileEntry, depth: number, isLast: boolean, guides: boolean[]}> = [];
    const sorted = sortEntries(entries);

    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      const isLast = i === sorted.length - 1;
      const guides = [...parentHasMore];

      result.push({ entry, depth, isLast, guides });

      if (entry.isDirectory && entry.isExpanded && entry.children) {
        const newGuides = [...parentHasMore, !isLast];
        result = result.concat(flattenTree(entry.children, depth + 1, newGuides));
      }
    }
    return result;
  }

  let flatItems = $derived(flattenTree($fileTreeStore));
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
      {#each flatItems as {entry, depth, isLast, guides}}
        <div
          class="tree-item"
          class:directory={entry.isDirectory}
          class:file={!entry.isDirectory}
          class:active={$activeFilePathStore === entry.path}
          onclick={() => handleFileClick(entry)}
          oncontextmenu={(e) => handleContextMenu(e, entry)}
          onkeydown={(e) => e.key === "Enter" && handleFileClick(entry)}
          role="treeitem"
          aria-selected={$activeFilePathStore === entry.path}
          tabindex="0"
        >
          <div class="indent-guides">
            {#each guides as hasLine}
              <span class="guide" class:has-line={hasLine}></span>
            {/each}
            {#if depth > 0}
              <span class="guide connector" class:last={isLast}></span>
            {/if}
          </div>
          <FileIcon name={entry.name} isDirectory={entry.isDirectory} isExpanded={entry.isExpanded} size={20} />
          <span class="name truncate">{entry.name}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if contextMenu}
  <ContextMenu
    x={contextMenu.x}
    y={contextMenu.y}
    items={getContextMenuItems(contextMenu.entry)}
    onClose={() => contextMenu = null}
  />
{/if}

<style>
  .file-tree {
    flex: 1;
    overflow: auto;
    padding: 4px 0;
    font-size: 13px;
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
    padding: 8px 12px 4px;
    font-weight: 600;
    font-size: 11px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 4px;
  }

  .tree-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px 4px 8px;
    cursor: pointer;
    color: var(--text-secondary);
    transition: background 0.1s;
    height: 28px;
    font-size: 13px;
  }

  .tree-item:hover {
    background: var(--bg-hover);
  }

  .tree-item.active {
    background: var(--bg-active);
    color: var(--text-primary);
  }

  .tree-item.directory {
    font-weight: 600;
    color: var(--text-primary);
  }

  .tree-item.file {
    color: var(--text-secondary);
  }

  .indent-guides {
    display: flex;
    align-items: stretch;
    height: 100%;
  }

  .guide {
    width: 16px;
    position: relative;
    flex-shrink: 0;
  }

  .guide.has-line::before {
    content: "";
    position: absolute;
    left: 7px;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--border);
  }

  .guide.connector::before {
    content: "";
    position: absolute;
    left: 7px;
    top: 0;
    height: 50%;
    width: 1px;
    background: var(--border);
  }

  .guide.connector::after {
    content: "";
    position: absolute;
    left: 7px;
    top: 50%;
    width: 8px;
    height: 1px;
    background: var(--border);
  }

  .guide.connector:not(.last)::before {
    height: 100%;
  }

  .name {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
