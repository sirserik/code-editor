interface KeybindingHandlers {
  onToggleTerminal: () => void;
  onToggleCommandPalette: () => void;
}

export function setupKeybindings(handlers: KeybindingHandlers) {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modKey = isMac ? "metaKey" : "ctrlKey";

  function handleKeydown(e: KeyboardEvent) {
    // Cmd/Ctrl + ` - Toggle Terminal
    if (e[modKey] && e.key === "`") {
      e.preventDefault();
      handlers.onToggleTerminal();
      return;
    }

    // Cmd/Ctrl + P - Command Palette
    if (e[modKey] && e.key === "p" && !e.shiftKey) {
      e.preventDefault();
      handlers.onToggleCommandPalette();
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
  { key: "Mod-o", action: "open", description: "Open file" },
  { key: "Mod-Shift-o", action: "openFolder", description: "Open folder" },
  { key: "Mod-p", action: "commandPalette", description: "Command palette" },
  { key: "Mod-Shift-p", action: "commands", description: "Show all commands" },
  { key: "Mod-`", action: "toggleTerminal", description: "Toggle terminal" },
  { key: "Mod-b", action: "toggleSidebar", description: "Toggle sidebar" },
  { key: "Mod-f", action: "find", description: "Find in file" },
  { key: "Mod-Shift-f", action: "findInFiles", description: "Find in files" },
  { key: "Mod-g", action: "goToLine", description: "Go to line" },
  { key: "Mod-w", action: "closeTab", description: "Close tab" },
  { key: "Mod-Shift-t", action: "reopenTab", description: "Reopen closed tab" },
  { key: "Mod-,", action: "settings", description: "Open settings" },
];
