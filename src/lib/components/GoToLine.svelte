<script lang="ts">
  import { onMount } from "svelte";

  interface Props {
    onClose: () => void;
    onGoTo: (line: number) => void;
  }

  let { onClose, onGoTo }: Props = $props();

  let lineNumber = $state("");
  let inputEl: HTMLInputElement;

  function handleSubmit() {
    const line = parseInt(lineNumber, 10);
    if (!isNaN(line) && line > 0) {
      onGoTo(line);
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter") {
      handleSubmit();
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  onMount(() => {
    inputEl?.focus();
  });
</script>

<div class="goto-backdrop" onclick={handleBackdropClick} role="dialog" aria-modal="true">
  <div class="goto-dialog">
    <div class="goto-input">
      <span class="label">Go to line:</span>
      <input
        type="number"
        bind:value={lineNumber}
        bind:this={inputEl}
        onkeydown={handleKeydown}
        placeholder="Enter line number"
        min="1"
      />
    </div>
    <div class="goto-actions">
      <button class="btn-secondary" onclick={onClose}>Cancel</button>
      <button class="btn-primary" onclick={handleSubmit}>Go</button>
    </div>
  </div>
</div>

<style>
  .goto-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    padding-top: 20vh;
    z-index: 1000;
  }

  .goto-dialog {
    width: 300px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    padding: 16px;
    height: fit-content;
  }

  .goto-input {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }

  .label {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .goto-input input {
    font-size: 16px;
    padding: 8px 12px;
  }

  .goto-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .btn-primary, .btn-secondary {
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
  }

  .btn-primary {
    background: var(--accent);
    color: var(--bg-primary);
  }

  .btn-primary:hover {
    background: var(--accent-hover);
  }

  .btn-secondary {
    background: var(--bg-hover);
    color: var(--text-secondary);
  }

  .btn-secondary:hover {
    background: var(--bg-active);
  }
</style>
