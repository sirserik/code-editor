<script lang="ts">
  import { projectRootStore, filesStore, activeFilePathStore, getLanguageFromPath, searchHighlightStore } from "$lib/stores/files";
  import { searchStreamingStart, searchStreamingCancel, readFile, type StreamSearchResult, type SearchProgress, type SearchComplete } from "$lib/utils/ipc";
  import { listen, type UnlistenFn } from "@tauri-apps/api/event";
  import { onMount } from "svelte";
  import FileIcon from "./FileIcon.svelte";

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  interface DisplayGroupedResult {
    path: string;
    fileName: string;
    directory: string;
    matches: Array<{ line: number; content: string; matchStart: number; matchEnd: number }>;
  }

  let query = $state("");
  let isSearching = $state(false);
  let caseSensitive = $state(false);
  let groupedResults = $state<DisplayGroupedResult[]>([]);
  let expandedFiles = $state<Set<string>>(new Set());
  let searchInput: HTMLInputElement;

  // Streaming state
  let currentSearchId = $state<number | null>(null);
  let filesSearched = $state(0);
  let matchesFound = $state(0);
  let currentFile = $state("");
  let unlisteners: UnlistenFn[] = [];

  let totalMatches = $derived(groupedResults.reduce((acc, g) => acc + g.matches.length, 0));
  let totalFiles = $derived(groupedResults.length);

  $effect(() => {
    // Auto-expand all on new results (only first 10 files)
    if (groupedResults.length > 0 && groupedResults.length <= 10) {
      expandedFiles = new Set(groupedResults.map(r => r.path));
    }
  });

  $effect(() => {
    // Focus input on mount
    searchInput?.focus();
  });

  // Cleanup on unmount
  onMount(() => {
    return () => {
      cleanupListeners();
      if (currentSearchId !== null) {
        searchStreamingCancel(currentSearchId).catch(() => {});
      }
    };
  });

  function cleanupListeners() {
    unlisteners.forEach(unlisten => unlisten());
    unlisteners = [];
  }

  function getRelativePath(fullPath: string): string {
    if (!$projectRootStore) return fullPath;
    return fullPath.replace($projectRootStore + "/", "");
  }

  let errorMessage = $state("");

  async function handleSearch() {
    if (!query.trim()) return;

    if (!$projectRootStore) {
      errorMessage = "Please open a folder first";
      return;
    }

    // Cancel previous search if running
    if (currentSearchId !== null) {
      await searchStreamingCancel(currentSearchId).catch(() => {});
      cleanupListeners();
    }

    isSearching = true;
    errorMessage = "";
    groupedResults = [];
    filesSearched = 0;
    matchesFound = 0;
    currentFile = "";

    try {
      // Start streaming search
      const searchId = await searchStreamingStart($projectRootStore, query, caseSensitive);
      currentSearchId = searchId;

      // Listen for results
      const resultUnlisten = await listen<StreamSearchResult>(`search-${searchId}-result`, (event) => {
        const result = event.payload;
        const relativePath = getRelativePath(result.path);
        const parts = relativePath.split("/");
        const directory = parts.length > 1 ? parts.slice(0, -1).join("/") : "";

        groupedResults = [...groupedResults, {
          path: result.path,
          fileName: result.filename,
          directory,
          matches: result.matches.map(m => ({
            line: m.line,
            content: m.content,
            matchStart: m.matchStart,
            matchEnd: m.matchEnd,
          })),
        }];
      });
      unlisteners.push(resultUnlisten);

      // Listen for progress
      const progressUnlisten = await listen<SearchProgress>(`search-${searchId}-progress`, (event) => {
        filesSearched = event.payload.files_searched;
        matchesFound = event.payload.matches_found;
        currentFile = event.payload.current_file;
      });
      unlisteners.push(progressUnlisten);

      // Listen for completion
      const completeUnlisten = await listen<SearchComplete>(`search-${searchId}-complete`, (event) => {
        filesSearched = event.payload.total_files;
        matchesFound = event.payload.total_matches;
        isSearching = false;
        currentSearchId = null;
        cleanupListeners();
      });
      unlisteners.push(completeUnlisten);

    } catch (err) {
      console.error("Search failed:", err);
      errorMessage = "Search failed: " + err;
      isSearching = false;
    }
  }

  async function handleCancel() {
    if (currentSearchId !== null) {
      await searchStreamingCancel(currentSearchId).catch(() => {});
      cleanupListeners();
      isSearching = false;
      currentSearchId = null;
    }
  }

  async function openResult(path: string, line: number) {
    try {
      const content = await readFile(path);
      const name = path.split("/").pop() || path;

      // Set search highlight for the editor
      searchHighlightStore.set(query);

      filesStore.openFile({
        path,
        name,
        content,
        language: getLanguageFromPath(path),
        isDirty: false,
        cursorPosition: { line, column: 1 },
      });
      activeFilePathStore.set(path);
      onClose();
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  }

  function toggleFile(path: string) {
    if (expandedFiles.has(path)) {
      expandedFiles.delete(path);
    } else {
      expandedFiles.add(path);
    }
    expandedFiles = new Set(expandedFiles);
  }

  function highlightMatch(content: string, matchStart: number, matchEnd: number): string {
    const before = escapeHtml(content.slice(0, matchStart));
    const match = escapeHtml(content.slice(matchStart, matchEnd));
    const after = escapeHtml(content.slice(matchEnd));
    return `${before}<mark>${match}</mark>${after}`;
  }

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      handleSearch();
    } else if (e.key === "Escape") {
      onClose();
    }
  }
</script>

<div class="global-search" onkeydown={(e) => e.key === "Escape" && onClose()}>
  <div class="search-header">
    <div class="search-input-row">
      <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input
        bind:this={searchInput}
        type="text"
        bind:value={query}
        placeholder="Search in project..."
        class="search-input"
        onkeydown={handleKeydown}
      />
      <div class="search-options">
        <label class="option" title="Case sensitive">
          <input type="checkbox" bind:checked={caseSensitive} />
          <span>Aa</span>
        </label>
      </div>
      {#if isSearching}
        <button class="cancel-btn" onclick={handleCancel}>
          Cancel
        </button>
      {:else}
        <button class="search-btn" onclick={handleSearch} disabled={!query.trim()}>
          Search
        </button>
      {/if}
      <button class="close-btn" onclick={onClose}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    {#if isSearching}
      <div class="progress-info">
        <span class="spinner"></span>
        <span>Searching... {filesSearched} files, {matchesFound} matches</span>
        {#if currentFile}
          <span class="current-file">{currentFile}</span>
        {/if}
      </div>
    {:else if errorMessage}
      <div class="results-info error">{errorMessage}</div>
    {:else if groupedResults.length > 0}
      <div class="results-info">
        <span class="count">{totalMatches}</span> results in <span class="count">{totalFiles}</span> files
      </div>
    {:else if query && !isSearching}
      <div class="results-info no-results">No results found</div>
    {/if}
  </div>

  <div class="results-container">
    {#each groupedResults as group}
      <div class="file-group">
        <button class="file-header" onclick={() => toggleFile(group.path)}>
          <span class="expand-icon" class:expanded={expandedFiles.has(group.path)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5l8 7-8 7z"/>
            </svg>
          </span>
          <FileIcon name={group.fileName} isDirectory={false} size={18} />
          <span class="file-name">{group.fileName}</span>
          {#if group.directory}
            <span class="file-directory">{group.directory}</span>
          {/if}
          <span class="match-badge">{group.matches.length}</span>
        </button>

        {#if expandedFiles.has(group.path)}
          <div class="matches-list">
            {#each group.matches as match}
              <button class="match-item" onclick={() => openResult(group.path, match.line)}>
                <span class="line-num">{match.line}</span>
                <span class="line-text">{@html highlightMatch(match.content, match.matchStart, match.matchEnd)}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .global-search {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-primary);
  }

  .search-header {
    padding: 16px 20px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
  }

  .search-input-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .search-icon {
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    font-size: 15px;
    padding: 10px 14px;
    border-radius: 6px;
    background: var(--bg-primary);
    border: 1px solid var(--border);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .search-options {
    display: flex;
    gap: 8px;
  }

  .option {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-muted);
    transition: all 0.15s;
  }

  .option:has(input:checked) {
    background: var(--accent);
    color: var(--bg-primary);
    border-color: var(--accent);
  }

  .option input {
    display: none;
  }

  .search-btn {
    padding: 10px 20px;
    background: var(--accent);
    color: var(--bg-primary);
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    transition: background 0.15s;
  }

  .search-btn:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .search-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .cancel-btn {
    padding: 10px 20px;
    background: #ef4444;
    color: white;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    transition: background 0.15s;
  }

  .cancel-btn:hover {
    background: #dc2626;
  }

  .close-btn {
    padding: 8px;
    border-radius: 6px;
    color: var(--text-muted);
    transition: all 0.15s;
  }

  .close-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid transparent;
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    display: inline-block;
    flex-shrink: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .progress-info {
    margin-top: 12px;
    font-size: 13px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .current-file {
    color: var(--text-secondary);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 11px;
    opacity: 0.7;
  }

  .results-info {
    margin-top: 12px;
    font-size: 13px;
    color: var(--text-muted);
  }

  .results-info .count {
    color: var(--accent);
    font-weight: 600;
  }

  .results-info.no-results {
    color: var(--text-muted);
  }

  .results-info.error {
    color: #ef4444;
  }

  .results-container {
    flex: 1;
    overflow: auto;
    padding: 12px;
  }

  .file-group {
    margin-bottom: 8px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--border);
    background: var(--bg-secondary);
  }

  .file-header {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 12px 16px;
    text-align: left;
    transition: background 0.15s;
  }

  .file-header:hover {
    background: var(--bg-hover);
  }

  .expand-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    color: var(--text-muted);
    transition: transform 0.15s;
  }

  .expand-icon.expanded {
    transform: rotate(90deg);
  }

  .file-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .file-directory {
    font-size: 12px;
    color: var(--text-muted);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .match-badge {
    font-size: 11px;
    background: var(--accent);
    color: var(--bg-primary);
    padding: 3px 10px;
    border-radius: 12px;
    font-weight: 600;
  }

  .matches-list {
    border-top: 1px solid var(--border);
    background: var(--bg-primary);
  }

  .match-item {
    display: flex;
    gap: 16px;
    width: 100%;
    padding: 10px 16px 10px 54px;
    text-align: left;
    font-size: 13px;
    transition: background 0.1s;
    border-bottom: 1px solid var(--border);
  }

  .match-item:last-child {
    border-bottom: none;
  }

  .match-item:hover {
    background: var(--bg-hover);
  }

  .line-num {
    color: var(--accent);
    font-weight: 600;
    min-width: 45px;
    text-align: right;
    flex-shrink: 0;
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 12px;
  }

  .line-text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-secondary);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 12px;
  }

  .line-text :global(mark) {
    background: #fbbf24;
    color: #000;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 700;
  }
</style>
