<script lang="ts">
  import { projectRootStore, filesStore, activeFilePathStore, getLanguageFromPath } from "$lib/stores/files";
  import { writeFile } from "$lib/utils/ipc";
  import { fileTemplates, type FileTemplate } from "$lib/utils/templates";

  interface Props {
    onClose: () => void;
    currentPath?: string;
  }

  let { onClose, currentPath = "" }: Props = $props();

  let fileName = $state("untitled");
  let selectedTemplate = $state<FileTemplate>(fileTemplates[0]);
  let searchQuery = $state("");

  let filteredTemplates = $derived(
    fileTemplates.filter(t =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.extension.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  let fullFileName = $derived(fileName + selectedTemplate.extension);
  let fullPath = $derived(
    currentPath ? `${currentPath}/${fullFileName}` :
    $projectRootStore ? `${$projectRootStore}/${fullFileName}` : fullFileName
  );

  async function createFile() {
    if (!fileName.trim()) return;

    try {
      await writeFile(fullPath, selectedTemplate.template);

      filesStore.openFile({
        path: fullPath,
        name: fullFileName,
        content: selectedTemplate.template,
        language: getLanguageFromPath(fullPath),
        isDirty: false,
        cursorPosition: { line: 1, column: 1 }
      });

      activeFilePathStore.set(fullPath);
      onClose();
    } catch (err) {
      console.error("Failed to create file:", err);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      createFile();
    }
  }

  const darkTextColors = ["#f7df1e", "#cbcb41", "#ecd53f", "#ffb13b", "#dea584", "#a8b9cc"];
</script>

<div class="dialog-backdrop" onclick={(e) => e.target === e.currentTarget && onClose()} onkeydown={handleKeydown} role="dialog" tabindex="-1">
  <div class="dialog">
    <div class="dialog-header">
      <h2>New File</h2>
      <button class="close-btn" onclick={onClose}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <div class="dialog-content">
      <div class="file-name-section">
        <label for="filename">File Name</label>
        <div class="file-name-input">
          <input
            id="filename"
            type="text"
            bind:value={fileName}
            placeholder="untitled"
            autofocus
          />
          <span class="extension">{selectedTemplate.extension}</span>
        </div>
        <div class="file-path">{fullPath}</div>
      </div>

      <div class="templates-section">
        <label>Select Template</label>
        <input
          type="text"
          class="search-input"
          placeholder="Search templates..."
          bind:value={searchQuery}
        />

        <div class="templates-grid">
          {#each filteredTemplates as template}
            <button
              class="template-card"
              class:selected={selectedTemplate.id === template.id}
              onclick={() => selectedTemplate = template}
            >
              <div class="template-icon" style="background: {template.color}">
                <span style="color: {darkTextColors.includes(template.color) ? '#000' : '#fff'}">{template.icon}</span>
              </div>
              <div class="template-info">
                <span class="template-name">{template.name}</span>
                <span class="template-ext">{template.extension || 'no extension'}</span>
              </div>
            </button>
          {/each}
        </div>
      </div>

      {#if selectedTemplate.template}
        <div class="preview-section">
          <label>Preview</label>
          <pre class="code-preview">{selectedTemplate.template.slice(0, 300)}{selectedTemplate.template.length > 300 ? '...' : ''}</pre>
        </div>
      {/if}
    </div>

    <div class="dialog-footer">
      <button class="btn-secondary" onclick={onClose}>Cancel</button>
      <button class="btn-primary" onclick={createFile} disabled={!fileName.trim()}>
        Create File
      </button>
    </div>
  </div>
</div>

<style>
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
  }

  .dialog {
    background: var(--bg-primary);
    border-radius: 12px;
    width: 90%;
    max-width: 600px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
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
    transition: all 0.15s;
  }

  .close-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .dialog-content {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }

  .file-name-section {
    margin-bottom: 20px;
  }

  label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .file-name-input {
    display: flex;
    align-items: center;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }

  .file-name-input input {
    flex: 1;
    padding: 12px 14px;
    font-size: 15px;
    background: transparent;
    border: none;
  }

  .file-name-input input:focus {
    outline: none;
  }

  .extension {
    padding: 12px 14px;
    background: var(--bg-hover);
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: 14px;
  }

  .file-path {
    margin-top: 6px;
    font-size: 12px;
    color: var(--text-muted);
    font-family: var(--font-mono);
    word-break: break-all;
  }

  .templates-section {
    margin-bottom: 20px;
  }

  .search-input {
    width: 100%;
    padding: 10px 14px;
    font-size: 14px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-bottom: 12px;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .templates-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 10px;
    max-height: 200px;
    overflow-y: auto;
    padding: 4px;
  }

  .template-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: var(--bg-secondary);
    border: 2px solid transparent;
    border-radius: 8px;
    text-align: left;
    transition: all 0.15s;
  }

  .template-card:hover {
    background: var(--bg-hover);
  }

  .template-card.selected {
    border-color: var(--accent);
    background: var(--bg-hover);
  }

  .template-icon {
    width: 32px;
    height: 24px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .template-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .template-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .template-ext {
    font-size: 11px;
    color: var(--text-muted);
    font-family: var(--font-mono);
  }

  .preview-section {
    margin-bottom: 10px;
  }

  .code-preview {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px;
    font-size: 12px;
    font-family: var(--font-mono);
    color: var(--text-secondary);
    max-height: 120px;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
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
    transition: all 0.15s;
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
    transition: all 0.15s;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
