<script lang="ts">
  import { gitStore } from "$lib/stores/git";
  import { projectRootStore } from "$lib/stores/files";
  import {
    getGitStatus,
    gitStage,
    gitUnstage,
    gitCommit,
    gitInit,
    gitDiscard,
    gitStageAll,
    gitUnstageAll,
    confirmDialog,
    getGitDiff
  } from "$lib/utils/ipc";
  import { onMount } from "svelte";

  let commitMessage = $state("");
  let isLoading = $state(false);
  let isNotRepo = $state(false);
  let showDiff = $state<string | null>(null);
  let diffContent = $state("");
  let error = $state<string | null>(null);

  onMount(() => {
    loadGitStatus();
  });

  async function loadGitStatus() {
    if (!$projectRootStore) return;
    isLoading = true;
    error = null;
    try {
      const status = await getGitStatus($projectRootStore);
      gitStore.setStatus(status);
      isNotRepo = false;
    } catch (err: any) {
      if (err.toString().includes("Failed to open repository")) {
        isNotRepo = true;
        gitStore.clear();
      } else {
        error = err.toString();
      }
    } finally {
      isLoading = false;
    }
  }

  async function handleInitRepo() {
    if (!$projectRootStore) return;
    try {
      await gitInit($projectRootStore);
      await loadGitStatus();
    } catch (err: any) {
      error = err.toString();
    }
  }

  async function handleStage(path: string) {
    if (!$projectRootStore) return;
    try {
      await gitStage($projectRootStore, path);
      gitStore.stageFile(path);
    } catch (err: any) {
      error = `Failed to stage: ${err}`;
    }
  }

  async function handleUnstage(path: string) {
    if (!$projectRootStore) return;
    try {
      await gitUnstage($projectRootStore, path);
      gitStore.unstageFile(path);
    } catch (err: any) {
      error = `Failed to unstage: ${err}`;
    }
  }

  async function handleStageAll() {
    if (!$projectRootStore) return;
    try {
      await gitStageAll($projectRootStore);
      await loadGitStatus();
    } catch (err: any) {
      error = `Failed to stage all: ${err}`;
    }
  }

  async function handleUnstageAll() {
    if (!$projectRootStore) return;
    try {
      await gitUnstageAll($projectRootStore);
      await loadGitStatus();
    } catch (err: any) {
      error = `Failed to unstage all: ${err}`;
    }
  }

  async function handleDiscard(path: string) {
    if (!$projectRootStore) return;
    const confirmed = await confirmDialog(
      "Discard Changes",
      `Are you sure you want to discard all changes to "${path}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await gitDiscard($projectRootStore, path);
      await loadGitStatus();
    } catch (err: any) {
      error = `Failed to discard: ${err}`;
    }
  }

  async function handleCommit() {
    if (!$projectRootStore || !commitMessage.trim()) return;
    try {
      await gitCommit($projectRootStore, commitMessage);
      commitMessage = "";
      await loadGitStatus();
    } catch (err: any) {
      error = `Failed to commit: ${err}`;
    }
  }

  async function handleShowDiff(path: string) {
    if (!$projectRootStore) return;
    if (showDiff === path) {
      showDiff = null;
      return;
    }
    try {
      diffContent = await getGitDiff($projectRootStore, path);
      showDiff = path;
    } catch (err: any) {
      error = `Failed to get diff: ${err}`;
    }
  }

  function getStatusInfo(status: string): { icon: string; color: string; label: string; description: string } {
    switch (status) {
      case "modified":
        return {
          icon: "M",
          color: "var(--warning)",
          label: "Modified",
          description: "File has been changed since last commit"
        };
      case "added":
        return {
          icon: "A",
          color: "var(--success)",
          label: "Added",
          description: "New file ready to be committed"
        };
      case "deleted":
        return {
          icon: "D",
          color: "var(--error)",
          label: "Deleted",
          description: "File will be removed in next commit"
        };
      case "untracked":
        return {
          icon: "?",
          color: "var(--text-muted)",
          label: "Untracked",
          description: "New file not yet tracked by Git"
        };
      case "renamed":
        return {
          icon: "R",
          color: "var(--accent)",
          label: "Renamed",
          description: "File has been renamed"
        };
      default:
        return {
          icon: "?",
          color: "var(--text-secondary)",
          label: "Unknown",
          description: "Unknown status"
        };
    }
  }

  let stagedFiles = $derived($gitStore?.files.filter((f) => f.staged) || []);
  let unstagedFiles = $derived($gitStore?.files.filter((f) => !f.staged) || []);
</script>

<div class="git-panel">
  <!-- Header with refresh -->
  <div class="panel-header">
    <span class="panel-title">Source Control</span>
    <button class="icon-btn" onclick={loadGitStatus} title="Refresh">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 2v6h-6M3 22v-6h6M21 12A9 9 0 0 0 6 5.3L3 8M3 12a9 9 0 0 0 15 6.7l3-2.7"/>
      </svg>
    </button>
  </div>

  {#if error}
    <div class="error-banner">
      <span>{error}</span>
      <button onclick={() => error = null}>Dismiss</button>
    </div>
  {/if}

  {#if !$projectRootStore}
    <div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
      </svg>
      <p class="empty-title">No Folder Open</p>
      <p class="empty-description">Open a folder to use Git features</p>
    </div>
  {:else if isLoading}
    <div class="loading">
      <div class="spinner"></div>
      <span>Loading...</span>
    </div>
  {:else if isNotRepo}
    <div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 16v-4M12 8h.01"/>
      </svg>
      <p class="empty-title">Not a Git Repository</p>
      <p class="empty-description">This folder is not tracked by Git yet</p>
      <button class="primary-btn" onclick={handleInitRepo}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        Initialize Repository
      </button>
      <p class="help-text">
        This will create a new Git repository to track your code changes
      </p>
    </div>
  {:else}
    <!-- Branch info -->
    {#if $gitStore}
      <div class="branch-info">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="6" y1="3" x2="6" y2="15"/>
          <circle cx="18" cy="6" r="3"/>
          <circle cx="6" cy="18" r="3"/>
          <path d="M18 9a9 9 0 0 1-9 9"/>
        </svg>
        <span class="branch-name">{$gitStore.branch}</span>
      </div>
    {/if}

    <!-- Commit section -->
    <div class="commit-section">
      <textarea
        bind:value={commitMessage}
        placeholder="Describe your changes... (e.g., 'Add login feature')"
        class="commit-input"
        rows="3"
      ></textarea>
      <button
        class="commit-btn"
        disabled={!commitMessage.trim() || stagedFiles.length === 0}
        onclick={handleCommit}
        title={stagedFiles.length === 0 ? "Stage some files first" : "Commit staged changes"}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Commit {stagedFiles.length > 0 ? `(${stagedFiles.length} files)` : ""}
      </button>
      {#if stagedFiles.length === 0 && unstagedFiles.length > 0}
        <p class="commit-hint">
          Stage files below to include them in the commit
        </p>
      {/if}
    </div>

    <!-- Staged changes -->
    {#if stagedFiles.length > 0}
      <div class="section">
        <div class="section-header">
          <div class="section-title">
            <span class="section-icon staged">✓</span>
            <span>Staged Changes</span>
            <span class="badge">{stagedFiles.length}</span>
          </div>
          <button class="text-btn" onclick={handleUnstageAll} title="Unstage all files">
            Unstage All
          </button>
        </div>
        <p class="section-help">These files will be included in your next commit</p>
        <div class="file-list">
          {#each stagedFiles as file}
            {@const info = getStatusInfo(file.status)}
            <div class="file-item">
              <span class="status-badge" style="color: {info.color}" title={info.description}>
                {info.icon}
              </span>
              <span class="file-name truncate" title={file.path}>{file.path}</span>
              <div class="file-actions">
                <button
                  class="action-btn"
                  onclick={() => handleUnstage(file.path)}
                  title="Unstage - Remove from commit"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Unstaged changes -->
    {#if unstagedFiles.length > 0}
      <div class="section">
        <div class="section-header">
          <div class="section-title">
            <span class="section-icon changes">●</span>
            <span>Changes</span>
            <span class="badge">{unstagedFiles.length}</span>
          </div>
          <button class="text-btn" onclick={handleStageAll} title="Stage all files">
            Stage All
          </button>
        </div>
        <p class="section-help">Modified files that haven't been staged yet</p>
        <div class="file-list">
          {#each unstagedFiles as file}
            {@const info = getStatusInfo(file.status)}
            <div class="file-item-wrapper">
              <div class="file-item" onclick={() => handleShowDiff(file.path)}>
                <span class="status-badge" style="color: {info.color}" title={info.description}>
                  {info.icon}
                </span>
                <span class="file-name truncate" title={file.path}>{file.path}</span>
                <span class="status-label" style="color: {info.color}">{info.label}</span>
                <div class="file-actions">
                  <button
                    class="action-btn stage"
                    onclick={(e) => { e.stopPropagation(); handleStage(file.path); }}
                    title="Stage - Include in next commit"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>
                  <button
                    class="action-btn discard"
                    onclick={(e) => { e.stopPropagation(); handleDiscard(file.path); }}
                    title="Discard - Undo all changes"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
              {#if showDiff === file.path}
                <div class="diff-preview">
                  <pre>{diffContent || "No changes to display"}</pre>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- No changes -->
    {#if stagedFiles.length === 0 && unstagedFiles.length === 0}
      <div class="empty-state small">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <p class="empty-title">All Clean!</p>
        <p class="empty-description">No uncommitted changes</p>
      </div>
    {/if}
  {/if}
</div>

<style>
  .git-panel {
    flex: 1;
    overflow: auto;
    display: flex;
    flex-direction: column;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    background: var(--bg-secondary);
    z-index: 1;
  }

  .panel-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-muted);
    letter-spacing: 0.5px;
  }

  .icon-btn {
    padding: 4px;
    border-radius: 4px;
    color: var(--text-muted);
  }

  .icon-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .error-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--error);
    color: white;
    font-size: 12px;
  }

  .error-banner button {
    color: white;
    text-decoration: underline;
    font-size: 11px;
  }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 16px;
    text-align: center;
    gap: 8px;
  }

  .empty-state.small {
    padding: 24px 16px;
  }

  .empty-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 8px 0 0 0;
  }

  .empty-description {
    font-size: 12px;
    color: var(--text-muted);
    margin: 0;
  }

  .help-text {
    font-size: 11px;
    color: var(--text-muted);
    margin: 8px 0 0 0;
    max-width: 200px;
    line-height: 1.4;
  }

  .primary-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
    padding: 10px 16px;
    background: var(--accent);
    color: var(--bg-primary);
    border-radius: 6px;
    font-weight: 500;
    font-size: 13px;
  }

  .primary-btn:hover {
    background: var(--accent-hover);
  }

  .loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: var(--text-muted);
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .branch-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border);
    color: var(--text-secondary);
  }

  .branch-name {
    font-size: 13px;
    font-weight: 500;
  }

  .commit-section {
    padding: 12px;
    border-bottom: 1px solid var(--border);
  }

  .commit-input {
    width: 100%;
    resize: none;
    font-size: 12px;
    margin-bottom: 8px;
  }

  .commit-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: var(--accent);
    color: var(--bg-primary);
    padding: 10px 12px;
    border-radius: 6px;
    font-weight: 500;
    font-size: 13px;
  }

  .commit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .commit-btn:not(:disabled):hover {
    background: var(--accent-hover);
  }

  .commit-hint {
    font-size: 11px;
    color: var(--text-muted);
    text-align: center;
    margin: 8px 0 0 0;
  }

  .section {
    padding: 12px;
    border-bottom: 1px solid var(--border);
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .section-icon {
    font-size: 10px;
  }

  .section-icon.staged {
    color: var(--success);
  }

  .section-icon.changes {
    color: var(--warning);
  }

  .section-help {
    font-size: 11px;
    color: var(--text-muted);
    margin: 0 0 8px 0;
  }

  .text-btn {
    font-size: 11px;
    color: var(--accent);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .text-btn:hover {
    background: var(--bg-hover);
  }

  .badge {
    font-size: 10px;
    padding: 1px 6px;
    background: var(--bg-hover);
    border-radius: 10px;
    color: var(--text-muted);
  }

  .file-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .file-item-wrapper {
    display: flex;
    flex-direction: column;
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
  }

  .file-item:hover {
    background: var(--bg-hover);
  }

  .status-badge {
    font-weight: 700;
    width: 14px;
    text-align: center;
    font-size: 11px;
  }

  .file-name {
    flex: 1;
    min-width: 0;
    color: var(--text-secondary);
  }

  .status-label {
    font-size: 10px;
    padding: 2px 6px;
    background: var(--bg-secondary);
    border-radius: 4px;
  }

  .file-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
  }

  .file-item:hover .file-actions {
    opacity: 1;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    color: var(--text-muted);
  }

  .action-btn:hover {
    background: var(--bg-active);
  }

  .action-btn.stage:hover {
    color: var(--success);
  }

  .action-btn.discard:hover {
    color: var(--error);
  }

  .diff-preview {
    margin: 4px 0 8px 22px;
    padding: 8px;
    background: var(--bg-tertiary);
    border-radius: 4px;
    border: 1px solid var(--border);
    max-height: 200px;
    overflow: auto;
  }

  .diff-preview pre {
    font-family: var(--font-mono);
    font-size: 11px;
    line-height: 1.4;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
  }
</style>
