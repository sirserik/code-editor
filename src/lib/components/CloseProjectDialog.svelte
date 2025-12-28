<script lang="ts">
  import type { OpenFile } from "$lib/stores/files";

  interface Props {
    show: boolean;
    dirtyFiles: OpenFile[];
    onSaveAll: () => void;
    onDontSave: () => void;
    onCancel: () => void;
  }

  let { show, dirtyFiles, onSaveAll, onDontSave, onCancel }: Props = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (!show) return;

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      onSaveAll();
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  }

  function getFileName(path: string): string {
    return path.split("/").pop() || path;
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if show}
  <div class="dialog-backdrop" onclick={handleBackdropClick} role="presentation">
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div class="dialog-header">
        <h2 id="dialog-title">Unsaved Changes</h2>
      </div>

      <div class="dialog-content">
        <p>You have {dirtyFiles.length} unsaved file(s):</p>
        <ul class="file-list">
          {#each dirtyFiles.slice(0, 5) as file}
            <li>{getFileName(file.path)}</li>
          {/each}
          {#if dirtyFiles.length > 5}
            <li class="more">...and {dirtyFiles.length - 5} more</li>
          {/if}
        </ul>
        <p class="question">Do you want to save changes before closing?</p>
      </div>

      <div class="dialog-actions">
        <button class="btn btn-primary" onclick={onSaveAll}>
          Save All
        </button>
        <button class="btn btn-danger" onclick={onDontSave}>
          Don't Save
        </button>
        <button class="btn btn-secondary" onclick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    width: 400px;
    max-width: 90vw;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .dialog-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
  }

  .dialog-header h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .dialog-content {
    padding: 16px 20px;
  }

  .dialog-content p {
    margin: 0 0 12px;
    color: var(--text-secondary);
    font-size: 13px;
  }

  .file-list {
    margin: 0 0 12px;
    padding: 8px 12px;
    background: var(--bg-tertiary);
    border-radius: 4px;
    list-style: none;
    max-height: 120px;
    overflow-y: auto;
  }

  .file-list li {
    padding: 4px 0;
    color: var(--text-primary);
    font-size: 12px;
    font-family: var(--font-mono);
  }

  .file-list li.more {
    color: var(--text-muted);
    font-style: italic;
  }

  .question {
    font-weight: 500;
    color: var(--text-primary) !important;
  }

  .dialog-actions {
    display: flex;
    gap: 8px;
    padding: 12px 20px 16px;
    justify-content: flex-end;
  }

  .btn {
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-primary {
    background: var(--accent);
    color: white;
    border: none;
  }

  .btn-primary:hover {
    background: var(--accent-hover);
  }

  .btn-danger {
    background: var(--error);
    color: white;
    border: none;
  }

  .btn-danger:hover {
    opacity: 0.9;
  }

  .btn-secondary {
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid var(--border);
  }

  .btn-secondary:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
</style>
