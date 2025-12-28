import { writable, derived } from "svelte/store";

export interface FileEntry {
  path: string;
  name: string;
  isDirectory: boolean;
  children?: FileEntry[];
  isExpanded?: boolean;
}

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  language: string;
  isDirty: boolean;
  cursorPosition: { line: number; column: number };
}

// Store for open files
function createFilesStore() {
  const { subscribe, set, update } = writable<OpenFile[]>([]);

  return {
    subscribe,
    openFile: (file: OpenFile) => {
      update((files) => {
        const existing = files.find((f) => f.path === file.path);
        if (existing) {
          return files;
        }
        return [...files, file];
      });
    },
    closeFile: (path: string) => {
      update((files) => files.filter((f) => f.path !== path));
    },
    updateContent: (path: string, content: string) => {
      update((files) =>
        files.map((f) =>
          f.path === path ? { ...f, content, isDirty: true } : f
        )
      );
    },
    markDirty: (path: string) => {
      update((files) =>
        files.map((f) =>
          f.path === path && !f.isDirty ? { ...f, isDirty: true } : f
        )
      );
    },
    markSaved: (path: string) => {
      update((files) =>
        files.map((f) => (f.path === path ? { ...f, isDirty: false } : f))
      );
    },
    updateCursor: (path: string, line: number, column: number) => {
      update((files) =>
        files.map((f) =>
          f.path === path ? { ...f, cursorPosition: { line, column } } : f
        )
      );
    },
    closeAll: () => set([]),
  };
}

export const filesStore = createFilesStore();

// Active file path
export const activeFilePathStore = writable<string | null>(null);

// Derived store for active file
export const activeFileStore = derived(
  [filesStore, activeFilePathStore],
  ([$files, $activePath]) => {
    if (!$activePath) return null;
    return $files.find((f) => f.path === $activePath) || null;
  }
);

// File tree store
function createFileTreeStore() {
  const { subscribe, set, update } = writable<FileEntry[]>([]);

  return {
    subscribe,
    setTree: (tree: FileEntry[]) => set(tree),
    toggleExpand: (path: string) => {
      update((tree) => toggleExpandRecursive(tree, path));
    },
  };
}

function toggleExpandRecursive(tree: FileEntry[], path: string): FileEntry[] {
  return tree.map((entry) => {
    if (entry.path === path) {
      return { ...entry, isExpanded: !entry.isExpanded };
    }
    if (entry.children) {
      return {
        ...entry,
        children: toggleExpandRecursive(entry.children, path),
      };
    }
    return entry;
  });
}

export const fileTreeStore = createFileTreeStore();

// Current project root
export const projectRootStore = writable<string | null>(null);

// Search results store
export interface SearchMatch {
  path: string;
  line: number;
  content: string;
}

export interface SearchResultsState {
  query: string;
  results: SearchMatch[];
  isVisible: boolean;
}

function createSearchResultsStore() {
  const { subscribe, set, update } = writable<SearchResultsState>({
    query: "",
    results: [],
    isVisible: false,
  });

  return {
    subscribe,
    setResults: (query: string, results: SearchMatch[]) => {
      set({ query, results, isVisible: true });
    },
    hide: () => {
      update((state) => ({ ...state, isVisible: false }));
    },
    clear: () => {
      set({ query: "", results: [], isVisible: false });
    },
  };
}

export const searchResultsStore = createSearchResultsStore();

// Search highlight store - for highlighting matches in editor
export const searchHighlightStore = writable<string>("");

// Get language from file extension
export function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  const languageMap: Record<string, string> = {
    js: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    jsx: "jsx",
    ts: "typescript",
    mts: "typescript",
    cts: "typescript",
    tsx: "tsx",
    py: "python",
    rs: "rust",
    go: "go",
    html: "html",
    htm: "html",
    css: "css",
    scss: "css",
    less: "css",
    json: "json",
    md: "markdown",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    yml: "yaml",
    yaml: "yaml",
    env: "shell",
    dockerfile: "shell",
    toml: "toml",
    xml: "html",
    svg: "html",
    svelte: "html",
    vue: "html",
    php: "php",
    phtml: "php",
    rb: "ruby",
    java: "java",
    c: "c",
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    h: "c",
    hpp: "cpp",
    hxx: "cpp",
  };
  return languageMap[ext] || "text";
}
