<script lang="ts">
  import { onMount } from "svelte";
  import { projectRootStore, filesStore, activeFilePathStore, getLanguageFromPath } from "$lib/stores/files";
  import { readFile, fuzzySearchFiles, getAllFiles, type FuzzySearchResult } from "$lib/utils/ipc";

  interface Props {
    onClose: () => void;
  }

  interface FileMatch {
    path: string;
    name: string;
    relativePath: string;
    matchedIndices?: number[];
  }

  let { onClose }: Props = $props();

  let query = $state("");
  let results = $state<FileMatch[]>([]);
  let selectedIndex = $state(0);
  let inputEl: HTMLInputElement;
  let initialFiles = $state<FileMatch[]>([]);
  let isLoading = $state(true);
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;

  async function loadInitialFiles() {
    if (!$projectRootStore) {
      isLoading = false;
      return;
    }

    try {
      const files = await getAllFiles($projectRootStore);
      initialFiles = files.slice(0, 50).map(path => ({
        path,
        name: path.split("/").pop() || path,
        relativePath: path.replace($projectRootStore + "/", ""),
      }));
      results = initialFiles;
    } catch (err) {
      console.error("Failed to get files:", err);
    }
    isLoading = false;
  }

  async function performSearch(q: string) {
    if (!$projectRootStore) return;

    if (!q.trim()) {
      results = initialFiles;
      selectedIndex = 0;
      return;
    }

    try {
      const searchResults = await fuzzySearchFiles($projectRootStore, q, 50);
      results = searchResults.map((r: FuzzySearchResult) => ({
        path: r.path,
        name: r.filename,
        relativePath: r.path.replace($projectRootStore + "/", ""),
        matchedIndices: r.matched_indices,
      }));
      selectedIndex = 0;
    } catch (err) {
      console.error("Fuzzy search failed:", err);
    }
  }

  async function openFile(file: FileMatch) {
    try {
      const content = await readFile(file.path);
      filesStore.openFile({
        path: file.path,
        name: file.name,
        content,
        language: getLanguageFromPath(file.path),
        isDirty: false,
        cursorPosition: { line: 1, column: 1 },
      });
      activeFilePathStore.set(file.path);
      onClose();
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
    } else if (e.key === "Enter" && results[selectedIndex]) {
      openFile(results[selectedIndex]);
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  // Debounced search
  $effect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    searchTimeout = setTimeout(() => performSearch(query), 50);
  });

  onMount(() => {
    inputEl?.focus();
    loadInitialFiles();
  });
</script>

<div class="quick-open-backdrop" onclick={handleBackdropClick} role="dialog" aria-modal="true">
  <div class="quick-open">
    <div class="search-box">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input
        type="text"
        bind:value={query}
        bind:this={inputEl}
        onkeydown={handleKeydown}
        placeholder="Search files by name..."
      />
    </div>

    <div class="results">
      {#if isLoading}
        <div class="loading">Loading files...</div>
      {:else if results.length === 0}
        <div class="no-results">
          {#if query}
            No files found
          {:else if !$projectRootStore}
            Open a folder first
          {:else}
            Start typing to search
          {/if}
        </div>
      {:else}
        {#each results as file, index}
          <button
            class="result-item"
            class:selected={index === selectedIndex}
            onclick={() => openFile(file)}
            onmouseenter={() => selectedIndex = index}
          >
            <span class="file-icon">{getFileIcon(file.name)}</span>
            <span class="file-name">
              {#if file.matchedIndices && file.matchedIndices.length > 0}
                {#each file.name.split("") as char, i}
                  {#if file.matchedIndices.includes(i)}
                    <span class="highlight">{char}</span>
                  {:else}
                    {char}
                  {/if}
                {/each}
              {:else}
                {file.name}
              {/if}
            </span>
            <span class="file-path">{file.relativePath}</span>
          </button>
        {/each}
      {/if}
    </div>
  </div>
</div>

<script context="module" lang="ts">
  function getFileIcon(name: string): string {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    const icons: Record<string, string> = {
      js: "📜", ts: "📘", jsx: "⚛️", tsx: "⚛️",
      py: "🐍", rs: "🦀", go: "🐹", php: "🐘",
      java: "☕", c: "🔧", cpp: "🔧", h: "🔧",
      html: "🌐", css: "🎨", json: "📋", md: "📝",
      sql: "🗃️", env: "🔐", yml: "⚙️", yaml: "⚙️",
      toml: "⚙️", xml: "📰", svg: "🖼️",
    };
    return icons[ext] || "📄";
  }
</script>

<style>
  .quick-open-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    padding-top: 15vh;
    z-index: 1000;
  }

  .quick-open {
    width: 600px;
    max-width: 90vw;
    max-height: 60vh;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    color: var(--text-muted);
  }

  .search-box input {
    flex: 1;
    background: transparent;
    border: none;
    font-size: 16px;
    color: var(--text-primary);
    outline: none;
  }

  .search-box input::placeholder {
    color: var(--text-muted);
  }

  .results {
    flex: 1;
    overflow: auto;
  }

  .loading, .no-results {
    padding: 24px;
    text-align: center;
    color: var(--text-muted);
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 8px 16px;
    text-align: left;
    transition: background 0.1s;
  }

  .result-item:hover,
  .result-item.selected {
    background: var(--bg-hover);
  }

  .file-icon {
    font-size: 16px;
    width: 24px;
    text-align: center;
    flex-shrink: 0;
  }

  .file-name {
    color: var(--text-primary);
    font-weight: 500;
  }

  .file-name .highlight {
    color: var(--accent);
    font-weight: 700;
  }

  .file-path {
    color: var(--text-muted);
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-left: auto;
  }
</style>
