<script lang="ts">
  import Toolbar from "$lib/components/Toolbar.svelte";
  import Sidebar from "$lib/components/Sidebar.svelte";
  import Tabs from "$lib/components/Tabs.svelte";
  import Editor from "$lib/components/Editor.svelte";
  import StatusBar from "$lib/components/StatusBar.svelte";
  import CloseProjectDialog from "$lib/components/CloseProjectDialog.svelte";

  // Lazy loaded components (heavy/rarely used)
  const Terminal = () => import("$lib/components/Terminal.svelte");
  const CommandPalette = () => import("$lib/components/CommandPalette.svelte");
  const QuickOpen = () => import("$lib/components/QuickOpen.svelte");
  const GoToLine = () => import("$lib/components/GoToLine.svelte");
  const GlobalSearch = () => import("$lib/components/GlobalSearch.svelte");
  const NewFileDialog = () => import("$lib/components/NewFileDialog.svelte");
  import { filesStore, activeFileStore, activeFilePathStore, fileTreeStore, projectRootStore, getLanguageFromPath } from "$lib/stores/files";
  import { settingsStore } from "$lib/stores/settings";
  import { setupKeybindings } from "$lib/utils/keybindings";
  import { openFileDialog, openFolderDialog, readFile, listDirectory, writeFile, confirmDialog, createFile, messageDialog, lspWarmup, lspCleanupIdle } from "$lib/utils/ipc";
  import { onMount, onDestroy } from "svelte";

  let showTerminal = $state(false);
  let showCommandPalette = $state(false);
  let showQuickOpen = $state(false);
  let showGoToLine = $state(false);
  let showGlobalSearch = $state(false);
  let showNewFileDialog = $state(false);
  let showCloseProjectDialog = $state(false);
  let sidebarWidth = $state(250);
  let showSidebar = $state(true);

  async function handleOpenFile() {
    try {
      const path = await openFileDialog();
      if (path) {
        const content = await readFile(path);
        const name = path.split("/").pop() || path;
        filesStore.openFile({
          path,
          name,
          content,
          language: getLanguageFromPath(path),
          isDirty: false,
          cursorPosition: { line: 1, column: 1 },
        });
        activeFilePathStore.set(path);
      }
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  }

  async function handleOpenFolder() {
    try {
      const folder = await openFolderDialog();
      if (folder) {
        projectRootStore.set(folder);
        const tree = await listDirectory(folder);
        fileTreeStore.setTree(tree);

        // Warm up LSP servers for common languages in the project
        warmupLspServers(folder);
      }
    } catch (err) {
      console.error("Failed to open folder:", err);
    }
  }

  // LSP warmup for common project languages
  async function warmupLspServers(workspaceRoot: string) {
    // Detect common languages in the project and warm up their LSP servers
    const commonLanguages = ['typescript', 'javascript', 'rust', 'python', 'go'];
    try {
      const started = await lspWarmup(workspaceRoot, commonLanguages);
      if (started.length > 0) {
        console.log('LSP servers warmed up:', started);
      }
    } catch (err) {
      // Silently fail - LSP is optional
      console.debug('LSP warmup skipped:', err);
    }
  }

  // Periodic cleanup of idle LSP servers
  let lspCleanupInterval: ReturnType<typeof setInterval> | null = null;

  function handleCloseTab() {
    const activePath = $activeFilePathStore;
    if (!activePath) return;

    const file = $filesStore.find(f => f.path === activePath);
    if (file?.isDirty) {
      handleCloseWithConfirm(activePath);
    } else {
      filesStore.closeFile(activePath);
      // Switch to another tab if available
      const remaining = $filesStore.filter(f => f.path !== activePath);
      if (remaining.length > 0) {
        activeFilePathStore.set(remaining[remaining.length - 1].path);
      } else {
        activeFilePathStore.set(null);
      }
    }
  }

  async function handleCloseWithConfirm(path: string) {
    const file = $filesStore.find(f => f.path === path);
    if (!file) return;

    const shouldSave = await confirmDialog(
      "Unsaved Changes",
      `Do you want to save changes to "${file.name}"?`
    );

    if (shouldSave) {
      await writeFile(file.path, file.content);
      filesStore.markSaved(file.path);
    }

    filesStore.closeFile(path);
    const remaining = $filesStore.filter(f => f.path !== path);
    if (remaining.length > 0) {
      activeFilePathStore.set(remaining[remaining.length - 1].path);
    } else {
      activeFilePathStore.set(null);
    }
  }

  function handleCloseProject() {
    const dirtyFiles = $filesStore.filter(f => f.isDirty);

    if (dirtyFiles.length > 0) {
      showCloseProjectDialog = true;
    } else {
      doCloseProject();
    }
  }

  function doCloseProject() {
    filesStore.closeAll();
    fileTreeStore.setTree([]);
    projectRootStore.set(null);
    activeFilePathStore.set(null);
    showCloseProjectDialog = false;
  }

  async function handleCloseProjectSaveAll() {
    await handleSaveAll();
    doCloseProject();
  }

  function handleCloseProjectDontSave() {
    doCloseProject();
  }

  async function handleSaveAll() {
    const dirtyFiles = $filesStore.filter(f => f.isDirty);
    for (const file of dirtyFiles) {
      try {
        await writeFile(file.path, file.content);
        filesStore.markSaved(file.path);
      } catch (err) {
        console.error(`Failed to save ${file.name}:`, err);
      }
    }
  }

  function handleNewFile() {
    showNewFileDialog = true;
  }

  async function refreshFileTree() {
    const root = $projectRootStore;
    if (root) {
      const tree = await listDirectory(root);
      fileTreeStore.setTree(tree);
    }
  }

  function handleFindInFiles() {
    showGlobalSearch = true;
  }

  async function handleSave() {
    const file = $activeFileStore;
    if (!file) return;

    try {
      await writeFile(file.path, file.content);
      filesStore.markSaved(file.path);
    } catch (err) {
      console.error("Failed to save:", err);
      messageDialog("Error", "Failed to save: " + err, "error");
    }
  }

  function handleGoToLine(line: number) {
    // This would need to communicate with the Editor component
    // For now, we'll just close the dialog
    showGoToLine = false;
  }

  onMount(() => {
    setupKeybindings({
      onToggleTerminal: () => {
        showTerminal = !showTerminal;
      },
      onToggleCommandPalette: () => {
        showCommandPalette = !showCommandPalette;
      },
      onOpenFile: handleOpenFile,
      onOpenFolder: handleOpenFolder,
      onCloseTab: handleCloseTab,
      onCloseProject: handleCloseProject,
      onSaveAll: handleSaveAll,
      onNewFile: handleNewFile,
      onToggleSidebar: () => {
        showSidebar = !showSidebar;
      },
      onFindInFiles: handleFindInFiles,
      onGoToLine: () => {
        if ($activeFileStore) {
          showGoToLine = true;
        }
      },
      onQuickOpen: () => {
        showQuickOpen = !showQuickOpen;
      },
      onZoomIn: () => settingsStore.zoomIn(),
      onZoomOut: () => settingsStore.zoomOut(),
      onResetZoom: () => settingsStore.resetZoom(),
    });

    // Apply theme
    document.documentElement.dataset.theme = $settingsStore.theme;

    // Periodic cleanup of idle LSP servers (every 5 minutes)
    lspCleanupInterval = setInterval(async () => {
      try {
        const cleaned = await lspCleanupIdle();
        if (cleaned > 0) {
          console.log(`Cleaned up ${cleaned} idle LSP server(s)`);
        }
      } catch {
        // Silently ignore cleanup errors
      }
    }, 5 * 60 * 1000);
  });

  onDestroy(() => {
    if (lspCleanupInterval) {
      clearInterval(lspCleanupInterval);
    }
  });

  $effect(() => {
    document.documentElement.dataset.theme = $settingsStore.theme;
  });
</script>

<div class="app">
  <Toolbar
    onNewFile={handleNewFile}
    onOpenFile={handleOpenFile}
    onOpenFolder={handleOpenFolder}
    onSave={handleSave}
    onSaveAll={handleSaveAll}
    onCloseFile={handleCloseTab}
    onCloseProject={handleCloseProject}
    onToggleSidebar={() => showSidebar = !showSidebar}
    onToggleTerminal={() => showTerminal = !showTerminal}
    onGlobalSearch={handleFindInFiles}
    onQuickOpen={() => showQuickOpen = true}
    onCommandPalette={() => showCommandPalette = true}
    onGoToLine={() => { if ($activeFileStore) showGoToLine = true; }}
    {showSidebar}
    {showTerminal}
  />

  <div class="main-container">
    {#if showSidebar}
      <Sidebar bind:width={sidebarWidth} />
    {/if}

    <div class="editor-area">
      <Tabs />

      <div class="editor-container">
        {#if showGlobalSearch}
          {#await GlobalSearch() then module}
            <module.default onClose={() => showGlobalSearch = false} />
          {/await}
        {:else if $activeFileStore}
          {#key $activeFileStore.path}
            <Editor file={$activeFileStore} />
          {/key}
        {:else}
          <div class="welcome">
            <div class="welcome-content">
              <h1>Code Editor</h1>
              <p>Open a file or folder to start editing</p>
              <div class="shortcuts">
                <div class="shortcut">
                  <kbd>⌘</kbd><kbd>O</kbd>
                  <span>Open File</span>
                </div>
                <div class="shortcut">
                  <kbd>⌘</kbd><kbd>⇧</kbd><kbd>O</kbd>
                  <span>Open Folder</span>
                </div>
                <div class="shortcut">
                  <kbd>⌘</kbd><kbd>P</kbd>
                  <span>Quick Open</span>
                </div>
                <div class="shortcut">
                  <kbd>⌘</kbd><kbd>⇧</kbd><kbd>P</kbd>
                  <span>Command Palette</span>
                </div>
                <div class="shortcut">
                  <kbd>⌘</kbd><kbd>N</kbd>
                  <span>New File</span>
                </div>
                <div class="shortcut">
                  <kbd>⌘</kbd><kbd>B</kbd>
                  <span>Toggle Sidebar</span>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>

      {#if showTerminal}
        {#await Terminal() then module}
          <module.default onClose={() => (showTerminal = false)} />
        {/await}
      {/if}
    </div>
  </div>

  <StatusBar
    {showTerminal}
    {showSidebar}
    onToggleTerminal={() => (showTerminal = !showTerminal)}
    onToggleSidebar={() => (showSidebar = !showSidebar)}
  />

  {#if showCommandPalette}
    {#await CommandPalette() then module}
      <module.default onClose={() => (showCommandPalette = false)} />
    {/await}
  {/if}

  {#if showQuickOpen}
    {#await QuickOpen() then module}
      <module.default onClose={() => (showQuickOpen = false)} />
    {/await}
  {/if}

  {#if showGoToLine}
    {#await GoToLine() then module}
      <module.default onClose={() => (showGoToLine = false)} onGoTo={handleGoToLine} />
    {/await}
  {/if}

  {#if showNewFileDialog}
    {#await NewFileDialog() then module}
      <module.default onClose={() => { showNewFileDialog = false; refreshFileTree(); }} />
    {/await}
  {/if}

  <CloseProjectDialog
    show={showCloseProjectDialog}
    dirtyFiles={$filesStore.filter(f => f.isDirty)}
    onSaveAll={handleCloseProjectSaveAll}
    onDontSave={handleCloseProjectDontSave}
    onCancel={() => { showCloseProjectDialog = false; }}
  />
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    overflow: hidden;
  }

  .main-container {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .editor-area {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }

  .editor-container {
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  .welcome {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    background: var(--bg-primary);
  }

  .welcome-content {
    text-align: center;
    color: var(--text-muted);
  }

  .welcome-content h1 {
    font-size: 2rem;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--text-secondary);
  }

  .welcome-content p {
    margin-bottom: 32px;
  }

  .shortcuts {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
  }

  .shortcut {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .shortcut kbd {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    min-width: 24px;
    text-align: center;
  }

  .shortcut span {
    color: var(--text-secondary);
    margin-left: 8px;
  }
</style>
