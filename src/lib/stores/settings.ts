import { writable } from "svelte/store";

export interface Settings {
  theme: "dark" | "light";
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  insertSpaces: boolean;
  wordWrap: boolean;
  lineNumbers: boolean;
  minimap: boolean;
  autoSave: boolean;
  autoSaveDelay: number;
}

const defaultSettings: Settings = {
  theme: "dark",
  fontSize: 14,
  fontFamily: "'JetBrains Mono', monospace",
  tabSize: 2,
  insertSpaces: true,
  wordWrap: false,
  lineNumbers: true,
  minimap: true,
  autoSave: false,
  autoSaveDelay: 1000,
};

function createSettingsStore() {
  // Load from localStorage if available
  let initial = defaultSettings;
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem("code-editor-settings");
    if (stored) {
      try {
        initial = { ...defaultSettings, ...JSON.parse(stored) };
      } catch {
        // ignore
      }
    }
  }

  const { subscribe, set, update } = writable<Settings>(initial);

  return {
    subscribe,
    update: (partial: Partial<Settings>) => {
      update((s) => {
        const newSettings = { ...s, ...partial };
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(
            "code-editor-settings",
            JSON.stringify(newSettings)
          );
        }
        return newSettings;
      });
    },
    reset: () => {
      set(defaultSettings);
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("code-editor-settings");
      }
    },
  };
}

export const settingsStore = createSettingsStore();
