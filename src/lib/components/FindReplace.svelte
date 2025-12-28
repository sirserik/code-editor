<script lang="ts">
  import { findInContent, replaceInContent, replaceSingle, type ReplaceMatch } from "$lib/utils/ipc";

  interface Props {
    content: string;
    onContentChange: (content: string) => void;
    onNavigateToMatch: (line: number, column: number) => void;
    onClose: () => void;
  }

  let { content, onContentChange, onNavigateToMatch, onClose }: Props = $props();

  let query = $state("");
  let replacement = $state("");
  let caseSensitive = $state(false);
  let useRegex = $state(false);
  let wholeWord = $state(false);
  let showReplace = $state(false);

  let matches = $state<ReplaceMatch[]>([]);
  let currentMatchIndex = $state(-1);
  let isSearching = $state(false);

  let searchInput: HTMLInputElement;

  $effect(() => {
    // Focus search input on mount
    searchInput?.focus();
  });

  async function doSearch() {
    if (!query) {
      matches = [];
      currentMatchIndex = -1;
      return;
    }

    isSearching = true;
    try {
      const result = await findInContent(content, query, caseSensitive, useRegex, wholeWord);
      matches = result.matches;
      currentMatchIndex = matches.length > 0 ? 0 : -1;

      if (currentMatchIndex >= 0) {
        navigateToCurrentMatch();
      }
    } catch (err) {
      console.error("Search failed:", err);
      matches = [];
    }
    isSearching = false;
  }

  function navigateToCurrentMatch() {
    if (currentMatchIndex >= 0 && currentMatchIndex < matches.length) {
      const match = matches[currentMatchIndex];
      onNavigateToMatch(match.line, match.column);
    }
  }

  function nextMatch() {
    if (matches.length === 0) return;
    currentMatchIndex = (currentMatchIndex + 1) % matches.length;
    navigateToCurrentMatch();
  }

  function prevMatch() {
    if (matches.length === 0) return;
    currentMatchIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
    navigateToCurrentMatch();
  }

  async function replaceOne() {
    if (currentMatchIndex < 0 || !matches[currentMatchIndex]) return;

    const match = matches[currentMatchIndex];
    try {
      const newContent = await replaceSingle(content, match.line, match.column, match.length, replacement);
      onContentChange(newContent);
      // Re-search after replace
      setTimeout(doSearch, 50);
    } catch (err) {
      console.error("Replace failed:", err);
    }
  }

  async function replaceAll() {
    if (!query) return;

    try {
      const result = await replaceInContent(content, query, replacement, caseSensitive, useRegex, wholeWord);
      if (result.replaced_count > 0) {
        onContentChange(result.new_content);
        matches = [];
        currentMatchIndex = -1;
      }
    } catch (err) {
      console.error("Replace all failed:", err);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter") {
      if (e.shiftKey) {
        prevMatch();
      } else {
        nextMatch();
      }
    } else if (e.key === "F3") {
      e.preventDefault();
      if (e.shiftKey) {
        prevMatch();
      } else {
        nextMatch();
      }
    }
  }

  // Debounced search
  let searchTimeout: ReturnType<typeof setTimeout>;
  function handleQueryChange() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(doSearch, 150);
  }
</script>

<div class="find-replace" onkeydown={handleKeydown}>
  <div class="search-row">
    <div class="input-wrapper">
      <input
        bind:this={searchInput}
        type="text"
        bind:value={query}
        oninput={handleQueryChange}
        placeholder="Find"
        class="search-input"
      />
      {#if matches.length > 0}
        <span class="match-count">
          {currentMatchIndex + 1} / {matches.length}
        </span>
      {:else if query && !isSearching}
        <span class="match-count no-results">No results</span>
      {/if}
    </div>

    <div class="options">
      <button
        class="option-btn"
        class:active={caseSensitive}
        onclick={() => { caseSensitive = !caseSensitive; doSearch(); }}
        title="Match Case (Alt+C)"
      >
        Aa
      </button>
      <button
        class="option-btn"
        class:active={wholeWord}
        onclick={() => { wholeWord = !wholeWord; doSearch(); }}
        title="Match Whole Word (Alt+W)"
      >
        <span class="icon-word">ab</span>
      </button>
      <button
        class="option-btn"
        class:active={useRegex}
        onclick={() => { useRegex = !useRegex; doSearch(); }}
        title="Use Regular Expression (Alt+R)"
      >
        .*
      </button>
    </div>

    <div class="nav-buttons">
      <button class="nav-btn" onclick={prevMatch} disabled={matches.length === 0} title="Previous Match (Shift+Enter)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </button>
      <button class="nav-btn" onclick={nextMatch} disabled={matches.length === 0} title="Next Match (Enter)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    </div>

    <button
      class="toggle-replace"
      class:active={showReplace}
      onclick={() => showReplace = !showReplace}
      title="Toggle Replace"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 3v18M7 7l-4 4 4 4M3 11h10"></path>
      </svg>
    </button>

    <button class="close-btn" onclick={onClose} title="Close (Escape)">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </div>

  {#if showReplace}
    <div class="replace-row">
      <div class="input-wrapper">
        <input
          type="text"
          bind:value={replacement}
          placeholder="Replace"
          class="search-input"
        />
      </div>

      <div class="replace-buttons">
        <button
          class="replace-btn"
          onclick={replaceOne}
          disabled={currentMatchIndex < 0}
          title="Replace (Cmd+Shift+1)"
        >
          Replace
        </button>
        <button
          class="replace-btn"
          onclick={replaceAll}
          disabled={matches.length === 0}
          title="Replace All (Cmd+Shift+Enter)"
        >
          Replace All
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .find-replace {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 12px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
    font-size: 13px;
  }

  .search-row, .replace-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .input-wrapper {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-input {
    width: 100%;
    padding: 6px 10px;
    padding-right: 70px;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 13px;
    font-family: inherit;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .match-count {
    position: absolute;
    right: 10px;
    font-size: 11px;
    color: var(--text-muted);
    pointer-events: none;
  }

  .match-count.no-results {
    color: var(--error);
  }

  .options {
    display: flex;
    gap: 2px;
  }

  .option-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border-radius: 4px;
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 600;
    transition: all 0.15s;
  }

  .option-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .option-btn.active {
    background: var(--accent);
    color: white;
  }

  .icon-word {
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .nav-buttons {
    display: flex;
    gap: 2px;
  }

  .nav-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border-radius: 4px;
    color: var(--text-secondary);
    transition: all 0.15s;
  }

  .nav-btn:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .nav-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .toggle-replace, .close-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border-radius: 4px;
    color: var(--text-secondary);
    transition: all 0.15s;
  }

  .toggle-replace:hover, .close-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .toggle-replace.active {
    color: var(--accent);
  }

  .replace-buttons {
    display: flex;
    gap: 6px;
  }

  .replace-btn {
    padding: 6px 12px;
    background: var(--bg-hover);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 12px;
    transition: all 0.15s;
  }

  .replace-btn:hover:not(:disabled) {
    background: var(--accent);
    color: white;
  }

  .replace-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
