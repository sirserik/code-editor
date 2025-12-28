interface KeybindingHandlers {
  onToggleTerminal: () => void;
  onToggleCommandPalette: () => void;
  onOpenFile?: () => void;
  onOpenFolder?: () => void;
  onCloseTab?: () => void;
  onCloseAllTabs?: () => void;
  onSaveFile?: () => void;
  onSaveAll?: () => void;
  onNewFile?: () => void;
  onCloseProject?: () => void;
  onToggleSidebar?: () => void;
  onFindInFiles?: () => void;
  onGoToLine?: () => void;
  onQuickOpen?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
}

export function setupKeybindings(handlers: KeybindingHandlers) {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modKey = isMac ? "metaKey" : "ctrlKey";

  function handleKeydown(e: KeyboardEvent) {
    const key = e.key.toLowerCase();

    // Cmd/Ctrl + ` - Toggle Terminal
    if (e[modKey] && e.key === "`") {
      e.preventDefault();
      handlers.onToggleTerminal();
      return;
    }

    // Cmd/Ctrl + Shift + P - Command Palette (all commands)
    if (e[modKey] && key === "p" && e.shiftKey) {
      e.preventDefault();
      handlers.onToggleCommandPalette();
      return;
    }

    // Cmd/Ctrl + P - Quick Open (file search)
    if (e[modKey] && key === "p" && !e.shiftKey) {
      e.preventDefault();
      handlers.onQuickOpen?.();
      return;
    }

    // Cmd/Ctrl + Shift + O - Open Folder
    if (e[modKey] && key === "o" && e.shiftKey) {
      e.preventDefault();
      handlers.onOpenFolder?.();
      return;
    }

    // Cmd/Ctrl + O - Open File
    if (e[modKey] && key === "o" && !e.shiftKey) {
      e.preventDefault();
      handlers.onOpenFile?.();
      return;
    }

    // Cmd/Ctrl + W - Close Tab
    if (e[modKey] && key === "w" && !e.shiftKey) {
      e.preventDefault();
      e.stopImmediatePropagation();
      handlers.onCloseTab?.();
      return;
    }

    // Cmd/Ctrl + Shift + W - Close All Tabs / Close Project
    if (e[modKey] && key === "w" && e.shiftKey) {
      e.preventDefault();
      handlers.onCloseProject?.();
      return;
    }

    // Cmd/Ctrl + S - Save (handled in Editor component)
    // But we can add Shift+S for Save All
    if (e[modKey] && key === "s" && e.shiftKey) {
      e.preventDefault();
      handlers.onSaveAll?.();
      return;
    }

    // Cmd/Ctrl + N - New File
    if (e[modKey] && key === "n" && !e.shiftKey) {
      e.preventDefault();
      handlers.onNewFile?.();
      return;
    }

    // Cmd/Ctrl + B - Toggle Sidebar
    if (e[modKey] && key === "b") {
      e.preventDefault();
      handlers.onToggleSidebar?.();
      return;
    }

    // Cmd/Ctrl + Shift + F - Find in Files
    if (e[modKey] && key === "f" && e.shiftKey) {
      e.preventDefault();
      handlers.onFindInFiles?.();
      return;
    }

    // Cmd/Ctrl + G - Go to Line
    if (e[modKey] && key === "g" && !e.shiftKey) {
      e.preventDefault();
      handlers.onGoToLine?.();
      return;
    }

    // Cmd/Ctrl + = or + - Zoom In
    if (e[modKey] && (key === "=" || key === "+")) {
      e.preventDefault();
      handlers.onZoomIn?.();
      return;
    }

    // Cmd/Ctrl + - - Zoom Out
    if (e[modKey] && key === "-") {
      e.preventDefault();
      handlers.onZoomOut?.();
      return;
    }

    // Cmd/Ctrl + 0 - Reset Zoom
    if (e[modKey] && key === "0") {
      e.preventDefault();
      handlers.onResetZoom?.();
      return;
    }
  }

  document.addEventListener("keydown", handleKeydown);

  return () => {
    document.removeEventListener("keydown", handleKeydown);
  };
}

export const defaultKeybindings = [
  { key: "Mod-s", action: "save", description: "Save file" },
  { key: "Mod-Shift-s", action: "saveAll", description: "Save all files" },
  { key: "Mod-o", action: "open", description: "Open file" },
  { key: "Mod-Shift-o", action: "openFolder", description: "Open folder" },
  { key: "Mod-p", action: "quickOpen", description: "Quick open file" },
  { key: "Mod-Shift-p", action: "commandPalette", description: "Command palette" },
  { key: "Mod-n", action: "newFile", description: "New file" },
  { key: "Mod-w", action: "closeTab", description: "Close tab" },
  { key: "Mod-Shift-w", action: "closeProject", description: "Close project" },
  { key: "Mod-`", action: "toggleTerminal", description: "Toggle terminal" },
  { key: "Mod-b", action: "toggleSidebar", description: "Toggle sidebar" },
  { key: "Mod-f", action: "find", description: "Find in file" },
  { key: "Mod-Shift-f", action: "findInFiles", description: "Find in project" },
  { key: "Mod-g", action: "goToLine", description: "Go to line" },
  { key: "Mod-Shift-t", action: "reopenTab", description: "Reopen closed tab" },
  { key: "Mod-,", action: "settings", description: "Open settings" },
];
