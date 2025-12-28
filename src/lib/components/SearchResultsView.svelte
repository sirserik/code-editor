<script lang="ts">
  import { searchResultsStore, filesStore, activeFilePathStore, getLanguageFromPath, projectRootStore } from "$lib/stores/files";
  import { readFile } from "$lib/utils/ipc";
  import FileIcon from "./FileIcon.svelte";

  interface GroupedResult {
    path: string;
    fileName: string;
    relativePath: string;
    directory: string;
    matches: Array<{ line: number; content: string }>;
  }

  let expandedFiles = $state<Set<string>>(new Set());

  let groupedResults = $derived.by(() => {
    const groups = new Map<string, GroupedResult>();

    for (const result of $searchResultsStore.results) {
      if (!groups.has(result.path)) {
        const fileName = result.path.split("/").pop() || result.path;
        const relativePath = getRelativePath(result.path);
        const parts = relativePath.split("/");
        const directory = parts.length > 1 ? parts.slice(0, -1).join("/") : "";

        groups.set(result.path, {
          path: result.path,
          fileName,
          relativePath,
          directory,
          matches: []
        });
        // Auto-expand all
        expandedFiles.add(result.path);
      }
      groups.get(result.path)!.matches.push({
        line: result.line,
        content: result.content
      });
    }

    return Array.from(groups.values());
  });

  let totalMatches = $derived($searchResultsStore.results.length);
  let totalFiles = $derived(groupedResults.length);

  function getRelativePath(fullPath: string): string {
    if (!$projectRootStore) return fullPath;
    return fullPath.replace($projectRootStore + "/", "");
  }

  async function openResult(path: string, line: number) {
    try {
      const content = await readFile(path);
      const name = path.split("/").pop() || path;
      filesStore.openFile({
        path,
        name,
        content,
        language: getLanguageFromPath(path),
        isDirty: false,
        cursorPosition: { line, column: 1 },
      });
      activeFilePathStore.set(path);
      searchResultsStore.hide();
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

  function highlightMatch(content: string): string {
    const query = $searchResultsStore.query;
    if (!query) return escapeHtml(content);
    try {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedContent = escapeHtml(content);
      return escapedContent.replace(
        new RegExp(`(${escaped})`, 'gi'),
        '<mark>$1</mark>'
      );
    } catch {
      return escapeHtml(content);
    }
  }

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function closeResults() {
    searchResultsStore.hide();
  }
</script>

<div class="search-results-view">
  <div class="header">
    <div class="header-info">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <span class="title">Search Results</span>
      <span class="query">"{$searchResultsStore.query}"</span>
    </div>
    <div class="header-stats">
      <span class="stat">{totalMatches} result{totalMatches === 1 ? '' : 's'}</span>
      <span class="stat-separator">in</span>
      <span class="stat">{totalFiles} file{totalFiles === 1 ? '' : 's'}</span>
    </div>
    <button class="close-btn" onclick={closeResults} title="Close search results">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </div>

  <div class="results-container">
    {#if groupedResults.length === 0}
      <div class="no-results">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <p>No results found for "{$searchResultsStore.query}"</p>
      </div>
    {:else}
      {#each groupedResults as group}
        <div class="file-group">
          <button
            class="file-header"
            onclick={() => toggleFile(group.path)}
          >
            <span class="expand-icon" class:expanded={expandedFiles.has(group.path)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5l8 7-8 7z"/>
              </svg>
            </span>
            <FileIcon name={group.fileName} isDirectory={false} size={20} />
            <span class="file-name">{group.fileName}</span>
            {#if group.directory}
              <span class="file-directory">{group.directory}</span>
            {/if}
            <span class="match-count">{group.matches.length}</span>
          </button>

          {#if expandedFiles.has(group.path)}
            <div class="matches-list">
              {#each group.matches as match}
                <button
                  class="match-item"
                  onclick={() => openResult(group.path, match.line)}
                >
                  <span class="line-number">{match.line}</span>
                  <span class="line-content">{@html highlightMatch(match.content)}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .search-results-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-primary);
  }

  .header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 20px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
  }

  .header-info {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text-secondary);
  }

  .title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .query {
    font-size: 14px;
    color: var(--accent);
    font-weight: 500;
  }

  .header-stats {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-muted);
    margin-left: auto;
  }

  .stat {
    color: var(--text-secondary);
    font-weight: 500;
  }

  .stat-separator {
    color: var(--text-muted);
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border-radius: 4px;
    color: var(--text-muted);
    transition: all 0.15s;
  }

  .close-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .results-container {
    flex: 1;
    overflow: auto;
    padding: 8px 0;
  }

  .no-results {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted);
    gap: 16px;
  }

  .no-results p {
    font-size: 14px;
  }

  .file-group {
    margin: 0 12px 8px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--border);
  }

  .file-header {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 12px 16px;
    text-align: left;
    background: var(--bg-secondary);
    transition: background 0.15s;
  }

  .file-header:hover {
    background: var(--bg-hover);
  }

  .expand-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
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

  .match-count {
    font-size: 11px;
    background: var(--accent);
    color: var(--bg-primary);
    padding: 3px 8px;
    border-radius: 12px;
    font-weight: 600;
  }

  .matches-list {
    background: var(--bg-primary);
    border-top: 1px solid var(--border);
  }

  .match-item {
    display: flex;
    gap: 16px;
    width: 100%;
    padding: 10px 16px 10px 60px;
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

  .line-number {
    color: var(--accent);
    font-weight: 600;
    min-width: 50px;
    text-align: right;
    flex-shrink: 0;
    font-family: var(--font-mono, monospace);
  }

  .line-content {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-secondary);
    font-family: var(--font-mono, monospace);
  }

  .line-content :global(mark) {
    background: #fbbf24;
    color: #000;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: 600;
  }
</style>
