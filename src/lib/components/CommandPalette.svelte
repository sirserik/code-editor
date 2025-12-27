<script lang="ts">
  import { onMount } from "svelte";
  import { filesStore, activeFilePathStore, fileTreeStore, projectRootStore, getLanguageFromPath } from "$lib/stores/files";
  import { settingsStore } from "$lib/stores/settings";
  import { openFileDialog, openFolderDialog, readFile, listDirectory } from "$lib/utils/ipc";

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  interface Command {
    id: string;
    label: string;
    description?: string;
    shortcut?: string;
    action: () => void | Promise<void>;
  }

  let searchInput: HTMLInputElement;
  let query = $state("");
  let selectedIndex = $state(0);

  const commands: Command[] = [
    {
      id: "openFile",
      label: "Open File",
      shortcut: "⌘O",
      action: async () => {
        const path = await openFileDialog();
        if (path) {
          const content = await readFile(path);
          const name = path.split("/").pop() || path;
          filesStore.openFile({
            path,
            name,
            content,
            language: getLanguageFromPath(path),
            isDirty: false,
            cursorPosition: { line: 1, column: 1 },
          });
          activeFilePathStore.set(path);
        }
        onClose();
      },
    },
    {
      id: "openFolder",
      label: "Open Folder",
      shortcut: "⌘⇧O",
      action: async () => {
        const folder = await openFolderDialog();
        if (folder) {
          projectRootStore.set(folder);
          const tree = await listDirectory(folder);
          fileTreeStore.setTree(tree);
        }
        onClose();
      },
    },
    {
      id: "saveFile",
      label: "Save File",
      shortcut: "⌘S",
      action: () => {
        // Trigger save via event
        onClose();
      },
    },
    {
      id: "closeTab",
      label: "Close Tab",
      shortcut: "⌘W",
      action: () => {
        if ($activeFilePathStore) {
          filesStore.closeFile($activeFilePathStore);
          const remaining = $filesStore;
          activeFilePathStore.set(remaining.length > 0 ? remaining[0].path : null);
        }
        onClose();
      },
    },
    {
      id: "toggleTheme",
      label: "Toggle Theme",
      description: "Switch between light and dark theme",
      action: () => {
        settingsStore.update({
          theme: $settingsStore.theme === "dark" ? "light" : "dark",
        });
        onClose();
      },
    },
    {
      id: "newFile",
      label: "New File",
      shortcut: "⌘N",
      action: () => {
        const name = `Untitled-${$filesStore.length + 1}`;
        filesStore.openFile({
          path: name,
          name,
          content: "",
          language: "text",
          isDirty: true,
          cursorPosition: { line: 1, column: 1 },
        });
        activeFilePathStore.set(name);
        onClose();
      },
    },
  ];

  let filteredCommands = $derived(
    query
      ? commands.filter(
          (cmd) =>
            cmd.label.toLowerCase().includes(query.toLowerCase()) ||
            cmd.description?.toLowerCase().includes(query.toLowerCase())
        )
      : commands
  );

  onMount(() => {
    searchInput?.focus();
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, filteredCommands.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }
</script>

<div
  class="command-palette-backdrop"
  onclick={handleBackdropClick}
  onkeydown={handleKeydown}
  role="dialog"
  aria-modal="true"
>
  <div class="command-palette">
    <div class="search-container">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input
        bind:this={searchInput}
        type="text"
        placeholder="Type a command..."
        bind:value={query}
        class="search-input"
      />
    </div>

    <div class="commands-list">
      {#each filteredCommands as command, index}
        <button
          class="command-item"
          class:selected={index === selectedIndex}
          onclick={() => command.action()}
          onmouseenter={() => (selectedIndex = index)}
        >
          <div class="command-info">
            <span class="command-label">{command.label}</span>
            {#if command.description}
              <span class="command-description">{command.description}</span>
            {/if}
          </div>
          {#if command.shortcut}
            <span class="command-shortcut">{command.shortcut}</span>
          {/if}
        </button>
      {/each}

      {#if filteredCommands.length === 0}
        <div class="no-results">No commands found</div>
      {/if}
    </div>
  </div>
</div>

<style>
  .command-palette-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    padding-top: 100px;
    z-index: 1000;
  }

  .command-palette {
    width: 500px;
    max-height: 400px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .search-container {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    color: var(--text-muted);
  }

  .search-input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 14px;
    color: var(--text-primary);
    padding: 0;
  }

  .search-input:focus {
    outline: none;
  }

  .search-input::placeholder {
    color: var(--text-muted);
  }

  .commands-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }

  .command-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 8px 12px;
    border-radius: 4px;
    text-align: left;
    transition: background 0.1s;
  }

  .command-item:hover,
  .command-item.selected {
    background: var(--bg-hover);
  }

  .command-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .command-label {
    font-size: 13px;
    color: var(--text-primary);
  }

  .command-description {
    font-size: 11px;
    color: var(--text-muted);
  }

  .command-shortcut {
    font-size: 11px;
    color: var(--text-muted);
    background: var(--bg-tertiary);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .no-results {
    padding: 16px;
    text-align: center;
    color: var(--text-muted);
  }
</style>
