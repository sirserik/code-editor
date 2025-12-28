<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Terminal } from "@xterm/xterm";
  import { FitAddon } from "@xterm/addon-fit";
  import { WebLinksAddon } from "@xterm/addon-web-links";
  import { invoke } from "@tauri-apps/api/core";
  import { listen, type UnlistenFn } from "@tauri-apps/api/event";
  import { projectRootStore } from "$lib/stores/files";
  import "@xterm/xterm/css/xterm.css";

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  interface TerminalTab {
    id: number;
    name: string;
    terminal: Terminal;
    fitAddon: FitAddon;
    ptyId: number | null;
    unlistenOutput: UnlistenFn | null;
    unlistenClose: UnlistenFn | null;
    container: HTMLDivElement | null;
  }

  let terminalContainer: HTMLDivElement;
  let tabs = $state<TerminalTab[]>([]);
  let activeTabId = $state<number>(0);
  let nextTabId = 0;
  let height = $state(200);
  let isResizing = $state(false);

  function createTerminalInstance(): Terminal {
    return new Terminal({
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 13,
      cursorBlink: true,
      theme: {
        background: "#11111b",
        foreground: "#cdd6f4",
        cursor: "#89b4fa",
        cursorAccent: "#11111b",
        selectionBackground: "#45475a",
        black: "#45475a",
        red: "#f38ba8",
        green: "#a6e3a1",
        yellow: "#f9e2af",
        blue: "#89b4fa",
        magenta: "#cba6f7",
        cyan: "#94e2d5",
        white: "#bac2de",
        brightBlack: "#585b70",
        brightRed: "#f38ba8",
        brightGreen: "#a6e3a1",
        brightYellow: "#f9e2af",
        brightBlue: "#89b4fa",
        brightMagenta: "#cba6f7",
        brightCyan: "#94e2d5",
        brightWhite: "#a6adc8",
      },
    });
  }

  async function spawnPty(tab: TerminalTab) {
    try {
      const workingDir = $projectRootStore;
      const result = await invoke<{ id: number }>("terminal_spawn", {
        workingDir: workingDir || undefined,
      });
      tab.ptyId = result.id;

      // Listen for output
      tab.unlistenOutput = await listen<string>(`terminal-${tab.ptyId}-output`, (event) => {
        tab.terminal.write(event.payload);
      });

      // Listen for close
      tab.unlistenClose = await listen(`terminal-${tab.ptyId}-close`, () => {
        tab.terminal.writeln("\r\n[Process exited]");
        tab.ptyId = null;
      });
    } catch (err) {
      console.error("Failed to spawn terminal:", err);
      tab.terminal.writeln(`\r\nError: Failed to spawn terminal: ${err}`);
      setupDemoMode(tab.terminal);
    }
  }

  function setupDemoMode(terminal: Terminal) {
    terminal.writeln("Terminal (Demo Mode)");
    terminal.writeln("--------------------");
    terminal.write("$ ");

    let currentLine = "";
    terminal.onKey(({ key, domEvent }) => {
      const ev = domEvent;
      const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

      if (ev.key === "Enter") {
        terminal.writeln("");
        if (currentLine.trim()) {
          terminal.writeln(`Command: ${currentLine}`);
        }
        currentLine = "";
        terminal.write("$ ");
      } else if (ev.key === "Backspace") {
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          terminal.write("\b \b");
        }
      } else if (printable) {
        currentLine += key;
        terminal.write(key);
      }
    });
  }

  async function addNewTab() {
    const id = nextTabId++;
    const terminal = createTerminalInstance();
    const fitAddon = new FitAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());

    const tab: TerminalTab = {
      id,
      name: `Terminal ${tabs.length + 1}`,
      terminal,
      fitAddon,
      ptyId: null,
      unlistenOutput: null,
      unlistenClose: null,
      container: null,
    };

    tabs = [...tabs, tab];
    activeTabId = id;

    // Wait for DOM update, then open terminal
    await new Promise(resolve => setTimeout(resolve, 0));

    const container = document.getElementById(`terminal-content-${id}`);
    if (container) {
      tab.container = container as HTMLDivElement;
      terminal.open(container);
      fitAddon.fit();

      // Handle keyboard input - send to PTY
      terminal.onData(async (data) => {
        if (tab.ptyId !== null) {
          try {
            await invoke("terminal_write", { id: tab.ptyId, data });
          } catch (err) {
            console.error("Failed to write to terminal:", err);
          }
        }
      });

      await spawnPty(tab);
    }
  }

  async function closeTab(tabId: number) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Cleanup
    tab.unlistenOutput?.();
    tab.unlistenClose?.();

    if (tab.ptyId !== null) {
      try {
        await invoke("terminal_kill", { id: tab.ptyId });
      } catch (err) {
        console.error("Failed to kill terminal:", err);
      }
    }

    tab.terminal.dispose();

    // Remove tab
    const newTabs = tabs.filter(t => t.id !== tabId);
    tabs = newTabs;

    // Switch to another tab or close panel
    if (newTabs.length === 0) {
      onClose();
    } else if (activeTabId === tabId) {
      activeTabId = newTabs[newTabs.length - 1].id;
    }
  }

  function switchTab(tabId: number) {
    activeTabId = tabId;
    // Refit terminal after switch
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setTimeout(() => {
        tab.fitAddon.fit();
        tab.terminal.focus();
      }, 0);
    }
  }

  onMount(async () => {
    // Create first tab
    await addNewTab();

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (activeTab) {
        activeTab.fitAddon.fit();
        if (activeTab.ptyId !== null) {
          invoke("terminal_resize", {
            id: activeTab.ptyId,
            cols: activeTab.terminal.cols,
            rows: activeTab.terminal.rows,
          }).catch(console.error);
        }
      }
    });
    resizeObserver.observe(terminalContainer);

    return () => {
      resizeObserver.disconnect();
    };
  });

  onDestroy(async () => {
    // Cleanup all tabs
    for (const tab of tabs) {
      tab.unlistenOutput?.();
      tab.unlistenClose?.();

      if (tab.ptyId !== null) {
        try {
          await invoke("terminal_kill", { id: tab.ptyId });
        } catch (err) {
          console.error("Failed to kill terminal:", err);
        }
      }

      tab.terminal.dispose();
    }
  });

  function startResize(e: MouseEvent) {
    isResizing = true;
    const startY = e.clientY;
    const startHeight = height;

    function onMouseMove(e: MouseEvent) {
      const delta = startY - e.clientY;
      height = Math.max(100, Math.min(500, startHeight + delta));
    }

    function onMouseUp() {
      isResizing = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      const activeTab = tabs.find(t => t.id === activeTabId);
      activeTab?.fitAddon.fit();
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }
</script>

<div class="terminal-panel" style="height: {height}px">
  <div
    class="resize-handle"
    class:active={isResizing}
    onmousedown={startResize}
  ></div>

  <div class="terminal-header">
    <div class="tabs-container">
      {#each tabs as tab (tab.id)}
        <div
          class="tab"
          class:active={tab.id === activeTabId}
          onclick={() => switchTab(tab.id)}
          onkeydown={(e) => e.key === 'Enter' && switchTab(tab.id)}
          role="tab"
          tabindex="0"
        >
          <span class="tab-name">{tab.name}</span>
          <button
            class="tab-close"
            onclick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
            title="Close"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      {/each}
      <button class="add-tab" onclick={addNewTab} title="New Terminal">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>
    <div class="actions">
      <button class="icon-btn" onclick={onClose} title="Close Panel">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  </div>

  <div class="terminal-container" bind:this={terminalContainer}>
    {#each tabs as tab (tab.id)}
      <div
        id="terminal-content-{tab.id}"
        class="terminal-content"
        class:active={tab.id === activeTabId}
      ></div>
    {/each}
  </div>
</div>

<style>
  .terminal-panel {
    display: flex;
    flex-direction: column;
    background: var(--bg-tertiary);
    border-top: 1px solid var(--border);
    position: relative;
  }

  .resize-handle {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    cursor: ns-resize;
    background: transparent;
  }

  .resize-handle:hover,
  .resize-handle.active {
    background: var(--accent);
  }

  .terminal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px 0 0;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
    min-height: 32px;
  }

  .tabs-container {
    display: flex;
    align-items: center;
    gap: 0;
    overflow-x: auto;
    flex: 1;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    font-size: 12px;
    color: var(--text-muted);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    white-space: nowrap;
  }

  .tab:hover {
    color: var(--text-secondary);
    background: var(--bg-hover);
  }

  .tab.active {
    color: var(--text-primary);
    border-bottom-color: var(--accent);
    background: var(--bg-tertiary);
  }

  .tab-name {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tab-close {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    border-radius: 3px;
    color: var(--text-muted);
    opacity: 0.6;
  }

  .tab-close:hover {
    opacity: 1;
    background: var(--bg-active);
    color: var(--error);
  }

  .add-tab {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px 8px;
    color: var(--text-muted);
    border-radius: 4px;
  }

  .add-tab:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
  }

  .actions {
    display: flex;
    gap: 4px;
  }

  .icon-btn {
    padding: 4px;
    border-radius: 4px;
    color: var(--text-muted);
  }

  .icon-btn:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
  }

  .terminal-container {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .terminal-content {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 8px;
    display: none;
  }

  .terminal-content.active {
    display: block;
  }

  .terminal-content :global(.xterm) {
    height: 100%;
  }
</style>
