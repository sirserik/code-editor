<script lang="ts">
  import { gitStore } from "$lib/stores/git";
  import { projectRootStore } from "$lib/stores/files";
  import { getGitStatus, gitStage, gitUnstage, gitCommit } from "$lib/utils/ipc";
  import { onMount } from "svelte";

  let commitMessage = $state("");
  let isLoading = $state(false);

  onMount(() => {
    loadGitStatus();
  });

  async function loadGitStatus() {
    if (!$projectRootStore) return;
    isLoading = true;
    try {
      const status = await getGitStatus($projectRootStore);
      gitStore.setStatus(status);
    } catch (err) {
      console.error("Failed to get git status:", err);
    } finally {
      isLoading = false;
    }
  }

  async function handleStage(path: string) {
    if (!$projectRootStore) return;
    try {
      await gitStage($projectRootStore, path);
      gitStore.stageFile(path);
    } catch (err) {
      console.error("Failed to stage file:", err);
    }
  }

  async function handleUnstage(path: string) {
    if (!$projectRootStore) return;
    try {
      await gitUnstage($projectRootStore, path);
      gitStore.unstageFile(path);
    } catch (err) {
      console.error("Failed to unstage file:", err);
    }
  }

  async function handleCommit() {
    if (!$projectRootStore || !commitMessage.trim()) return;
    try {
      await gitCommit($projectRootStore, commitMessage);
      commitMessage = "";
      await loadGitStatus();
    } catch (err) {
      console.error("Failed to commit:", err);
    }
  }

  function getStatusIcon(status: string): string {
    switch (status) {
      case "modified":
        return "M";
      case "added":
        return "A";
      case "deleted":
        return "D";
      case "untracked":
        return "U";
      case "renamed":
        return "R";
      default:
        return "?";
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case "modified":
        return "var(--warning)";
      case "added":
        return "var(--success)";
      case "deleted":
        return "var(--error)";
      case "untracked":
        return "var(--text-muted)";
      default:
        return "var(--text-secondary)";
    }
  }

  let stagedFiles = $derived($gitStore?.files.filter((f) => f.staged) || []);
  let unstagedFiles = $derived($gitStore?.files.filter((f) => !f.staged) || []);
</script>

<div class="git-panel">
  {#if !$projectRootStore}
    <div class="empty-state">
      <p>No folder opened</p>
    </div>
  {:else if isLoading}
    <div class="loading">Loading...</div>
  {:else if !$gitStore}
    <div class="empty-state">
      <p>Not a git repository</p>
    </div>
  {:else}
    <div class="commit-section">
      <textarea
        bind:value={commitMessage}
        placeholder="Commit message..."
        class="commit-input"
        rows="3"
      ></textarea>
      <button
        class="commit-btn"
        disabled={!commitMessage.trim() || stagedFiles.length === 0}
        onclick={handleCommit}
      >
        Commit ({stagedFiles.length})
      </button>
    </div>

    {#if stagedFiles.length > 0}
      <div class="section">
        <div class="section-header">
          <span>Staged Changes</span>
          <span class="badge">{stagedFiles.length}</span>
        </div>
        <div class="file-list">
          {#each stagedFiles as file}
            <div class="file-item">
              <span
                class="status-badge"
                style="color: {getStatusColor(file.status)}"
              >
                {getStatusIcon(file.status)}
              </span>
              <span class="file-name truncate">{file.path}</span>
              <button
                class="action-btn"
                onclick={() => handleUnstage(file.path)}
                title="Unstage"
              >
                −
              </button>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if unstagedFiles.length > 0}
      <div class="section">
        <div class="section-header">
          <span>Changes</span>
          <span class="badge">{unstagedFiles.length}</span>
        </div>
        <div class="file-list">
          {#each unstagedFiles as file}
            <div class="file-item">
              <span
                class="status-badge"
                style="color: {getStatusColor(file.status)}"
              >
                {getStatusIcon(file.status)}
              </span>
              <span class="file-name truncate">{file.path}</span>
              <button
                class="action-btn"
                onclick={() => handleStage(file.path)}
                title="Stage"
              >
                +
              </button>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if stagedFiles.length === 0 && unstagedFiles.length === 0}
      <div class="empty-state">
        <p>No changes</p>
      </div>
    {/if}
  {/if}
</div>

<style>
  .git-panel {
    flex: 1;
    overflow: auto;
    padding: 8px;
  }

  .empty-state,
  .loading {
    padding: 16px;
    text-align: center;
    color: var(--text-muted);
  }

  .commit-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }

  .commit-input {
    resize: none;
    font-size: 12px;
  }

  .commit-btn {
    background: var(--accent);
    color: var(--bg-primary);
    padding: 8px 12px;
    border-radius: 4px;
    font-weight: 500;
    transition: opacity 0.15s;
  }

  .commit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .commit-btn:not(:disabled):hover {
    background: var(--accent-hover);
  }

  .section {
    margin-bottom: 16px;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
  }

  .badge {
    font-size: 10px;
    padding: 1px 6px;
    background: var(--bg-hover);
    border-radius: 10px;
  }

  .file-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
  }

  .file-item:hover {
    background: var(--bg-hover);
  }

  .status-badge {
    font-weight: 600;
    width: 14px;
    text-align: center;
  }

  .file-name {
    flex: 1;
    min-width: 0;
    color: var(--text-secondary);
  }

  .action-btn {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-muted);
    opacity: 0;
    transition: all 0.1s;
  }

  .file-item:hover .action-btn {
    opacity: 1;
  }

  .action-btn:hover {
    background: var(--bg-active);
    color: var(--text-primary);
  }
</style>
