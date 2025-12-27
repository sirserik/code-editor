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

// Get language from file extension
export function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    rs: "rust",
    go: "go",
    html: "html",
    css: "css",
    scss: "css",
    json: "json",
    md: "markdown",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    yml: "yaml",
    yaml: "yaml",
    toml: "toml",
    xml: "xml",
    svg: "xml",
    php: "php",
    rb: "ruby",
    java: "java",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
  };
  return languageMap[ext] || "text";
}
