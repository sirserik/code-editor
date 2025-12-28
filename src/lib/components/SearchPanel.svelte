<script lang="ts">
  import { projectRootStore, searchResultsStore } from "$lib/stores/files";
  import { searchInProject } from "$lib/utils/ipc";

  let query = $state("");
  let isSearching = $state(false);
  let includePattern = $state("");
  let excludePattern = $state("node_modules,dist,.git");
  let caseSensitive = $state(false);
  let useRegex = $state(false);

  let resultCount = $derived($searchResultsStore.results.length);
  let fileCount = $derived(new Set($searchResultsStore.results.map(r => r.path)).size);

  // Clear results when query is empty
  $effect(() => {
    if (!query.trim()) {
      searchResultsStore.clear();
    }
  });

  async function handleSearch() {
    if (!query.trim() || !$projectRootStore) return;

    isSearching = true;
    try {
      const results = await searchInProject($projectRootStore, query, {
        include: includePattern || undefined,
        exclude: excludePattern || undefined,
        caseSensitive,
        useRegex,
      });
      searchResultsStore.setResults(query, results);
    } catch (err) {
      console.error("Search failed:", err);
      searchResultsStore.clear();
    }
    isSearching = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      handleSearch();
    }
  }

  function showResults() {
    if (resultCount > 0) {
      searchResultsStore.setResults($searchResultsStore.query, $searchResultsStore.results);
    }
  }
</script>

<div class="search-panel">
  <div class="search-inputs">
    <div class="search-main">
      <input
        type="text"
        bind:value={query}
        placeholder="Search in files..."
        class="search-input"
        onkeydown={handleKeydown}
      />
      <button class="search-btn" onclick={handleSearch} disabled={isSearching}>
        {#if isSearching}
          <span class="spinner"></span>
        {:else}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        {/if}
      </button>
    </div>

    <details class="search-options">
      <summary>Options</summary>
      <div class="options-content">
        <label>
          <input type="text" bind:value={includePattern} placeholder="Include (e.g. *.ts,*.js)" />
        </label>
        <label>
          <input type="text" bind:value={excludePattern} placeholder="Exclude" />
        </label>
        <div class="checkboxes">
          <label>
            <input type="checkbox" bind:checked={caseSensitive} />
            Case sensitive
          </label>
          <label>
            <input type="checkbox" bind:checked={useRegex} />
            Regex
          </label>
        </div>
      </div>
    </details>
  </div>

  {#if resultCount > 0}
    <button class="results-summary" onclick={showResults}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <span class="count">{resultCount}</span>
      <span class="label">result{resultCount === 1 ? '' : 's'} in</span>
      <span class="count">{fileCount}</span>
      <span class="label">file{fileCount === 1 ? '' : 's'}</span>
      <svg class="arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </button>
  {:else if query && !isSearching}
    <div class="no-results">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        <line x1="8" y1="8" x2="14" y2="14"></line>
        <line x1="14" y1="8" x2="8" y2="14"></line>
      </svg>
      <span>No results</span>
    </div>
  {/if}
</div>

<style>
  .search-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .search-inputs {
    padding: 8px;
  }

  .search-main {
    display: flex;
    gap: 4px;
  }

  .search-input {
    flex: 1;
    font-size: 12px;
  }

  .search-btn {
    padding: 6px 10px;
    background: var(--accent);
    color: var(--bg-primary);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .search-btn:hover {
    background: var(--accent-hover);
  }

  .search-btn:disabled {
    opacity: 0.6;
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .search-options {
    margin-top: 8px;
    font-size: 11px;
    color: var(--text-muted);
  }

  .search-options summary {
    cursor: pointer;
    user-select: none;
  }

  .options-content {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .options-content input[type="text"] {
    width: 100%;
    font-size: 11px;
    padding: 4px 8px;
  }

  .checkboxes {
    display: flex;
    gap: 12px;
  }

  .checkboxes label {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
  }

  .results-summary {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 8px;
    padding: 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 12px;
    color: var(--text-secondary);
    transition: all 0.15s;
    cursor: pointer;
  }

  .results-summary:hover {
    background: var(--bg-hover);
    border-color: var(--accent);
  }

  .results-summary .count {
    font-weight: 600;
    color: var(--accent);
  }

  .results-summary .label {
    color: var(--text-muted);
  }

  .results-summary .arrow {
    margin-left: auto;
    color: var(--text-muted);
  }

  .no-results {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin: 8px;
    padding: 16px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
