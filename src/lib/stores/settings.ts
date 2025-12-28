import { writable, get } from "svelte/store";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export interface Settings {
  theme: "dark" | "light";
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  minimap: boolean;
}

const defaultSettings: Settings = {
  theme: "dark",
  fontSize: 14,
  fontFamily: "JetBrains Mono, monospace",
  tabSize: 2,
  wordWrap: false,
  lineNumbers: true,
  minimap: true,
};

function createSettingsStore() {
  const { subscribe, set, update } = writable<Settings>(defaultSettings);
  let initialized = false;

  // Initialize from Rust backend
  async function init() {
    if (initialized) return;
    try {
      const rustSettings = await invoke<Settings>("get_settings");
      set(rustSettings);
      initialized = true;
    } catch (e) {
      console.error("Failed to load settings from backend:", e);
    }
  }

  // Listen for settings changes from Rust
  listen<Settings>("settings-changed", (event) => {
    set(event.payload);
  });

  // Initialize on creation
  init();

  return {
    subscribe,
    init,
    update: async (partial: Partial<Settings>) => {
      const current = get({ subscribe });
      const newSettings = { ...current, ...partial };
      try {
        const result = await invoke<Settings>("set_settings", { newSettings });
        set(result);
      } catch (e) {
        console.error("Failed to update settings:", e);
        // Optimistic update fallback
        update((s) => ({ ...s, ...partial }));
      }
    },
    zoomIn: async () => {
      try {
        const result = await invoke<Settings>("zoom_in");
        set(result);
      } catch (e) {
        console.error("Failed to zoom in:", e);
        update((s) => ({ ...s, fontSize: Math.min(s.fontSize + 2, 72) }));
      }
    },
    zoomOut: async () => {
      try {
        const result = await invoke<Settings>("zoom_out");
        set(result);
      } catch (e) {
        console.error("Failed to zoom out:", e);
        // Fallback
        update((s) => ({ ...s, fontSize: Math.max(s.fontSize - 2, 8) }));
      }
    },
    resetZoom: async () => {
      try {
        const result = await invoke<Settings>("reset_zoom");
        set(result);
      } catch (e) {
        console.error("Failed to reset zoom:", e);
        // Fallback
        update((s) => ({ ...s, fontSize: 14 }));
      }
    },
    setTheme: async (theme: "dark" | "light") => {
      try {
        const result = await invoke<Settings>("set_theme", { theme });
        set(result);
      } catch (e) {
        console.error("Failed to set theme:", e);
        update((s) => ({ ...s, theme }));
      }
    },
    reset: () => {
      set(defaultSettings);
    },
  };
}

export const settingsStore = createSettingsStore();
