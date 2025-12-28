<script lang="ts">
  interface Props {
    currentPath: string;
    onClose: () => void;
    onCreate: (name: string) => void;
  }

  let { currentPath, onClose, onCreate }: Props = $props();

  let folderName = $state("");
  let inputElement: HTMLInputElement;

  function handleSubmit() {
    if (folderName.trim()) {
      onCreate(folderName.trim());
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  $effect(() => {
    inputElement?.focus();
  });
</script>

<div class="dialog-backdrop" onclick={(e) => e.target === e.currentTarget && onClose()} onkeydown={handleKeydown} role="dialog" tabindex="-1">
  <div class="dialog">
    <div class="dialog-header">
      <h2>New Folder</h2>
      <button class="close-btn" onclick={onClose}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <div class="dialog-content">
      <label for="foldername">Folder Name</label>
      <input
        id="foldername"
        type="text"
        bind:this={inputElement}
        bind:value={folderName}
        placeholder="new-folder"
      />
      <div class="folder-path">{currentPath}/{folderName || "new-folder"}</div>
    </div>

    <div class="dialog-footer">
      <button class="btn-secondary" onclick={onClose}>Cancel</button>
      <button class="btn-primary" onclick={handleSubmit} disabled={!folderName.trim()}>
        Create Folder
      </button>
    </div>
  </div>
</div>

<style>
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background: var(--bg-primary);
    border-radius: 12px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    border: 1px solid var(--border);
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
  }

  .dialog-header h2 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .close-btn {
    padding: 6px;
    border-radius: 6px;
    color: var(--text-muted);
  }

  .close-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .dialog-content {
    padding: 20px;
  }

  label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  input {
    width: 100%;
    padding: 12px 14px;
    font-size: 15px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-primary);
  }

  input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .folder-path {
    margin-top: 8px;
    font-size: 12px;
    color: var(--text-muted);
    font-family: var(--font-mono);
    word-break: break-all;
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 20px;
    border-top: 1px solid var(--border);
  }

  .btn-secondary {
    padding: 10px 20px;
    font-size: 14px;
    border-radius: 8px;
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border);
  }

  .btn-secondary:hover {
    background: var(--bg-hover);
  }

  .btn-primary {
    padding: 10px 20px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 8px;
    background: var(--accent);
    color: var(--bg-primary);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
