<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Terminal } from "@xterm/xterm";
  import { FitAddon } from "@xterm/addon-fit";
  import { WebLinksAddon } from "@xterm/addon-web-links";
  import "@xterm/xterm/css/xterm.css";

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  let terminalContainer: HTMLDivElement;
  let terminal: Terminal;
  let fitAddon: FitAddon;
  let height = $state(200);
  let isResizing = $state(false);

  onMount(() => {
    terminal = new Terminal({
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 13,
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

    fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());

    terminal.open(terminalContainer);
    fitAddon.fit();

    // Demo: Welcome message
    terminal.writeln("Welcome to Code Editor Terminal");
    terminal.writeln("--------------------------------");
    terminal.write("$ ");

    // Handle input (demo - in real app, connect to PTY via Tauri)
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

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(terminalContainer);

    return () => {
      resizeObserver.disconnect();
    };
  });

  onDestroy(() => {
    terminal?.dispose();
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
      fitAddon?.fit();
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
    <span class="title">Terminal</span>
    <div class="actions">
      <button class="icon-btn" onclick={onClose} title="Close Terminal">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  </div>

  <div class="terminal-container" bind:this={terminalContainer}></div>
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
    transition: background 0.15s;
  }

  .resize-handle:hover,
  .resize-handle.active {
    background: var(--accent);
  }

  .terminal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
  }

  .title {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
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
    padding: 8px;
    overflow: hidden;
  }

  .terminal-container :global(.xterm) {
    height: 100%;
  }
</style>
