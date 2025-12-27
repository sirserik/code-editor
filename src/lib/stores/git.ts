import { writable } from "svelte/store";

export interface GitFileStatus {
  path: string;
  status: "modified" | "added" | "deleted" | "untracked" | "renamed";
  staged: boolean;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  files: GitFileStatus[];
}

function createGitStore() {
  const { subscribe, set, update } = writable<GitStatus | null>(null);

  return {
    subscribe,
    setStatus: (status: GitStatus) => set(status),
    clear: () => set(null),
    stageFile: (path: string) => {
      update((status) => {
        if (!status) return null;
        return {
          ...status,
          files: status.files.map((f) =>
            f.path === path ? { ...f, staged: true } : f
          ),
        };
      });
    },
    unstageFile: (path: string) => {
      update((status) => {
        if (!status) return null;
        return {
          ...status,
          files: status.files.map((f) =>
            f.path === path ? { ...f, staged: false } : f
          ),
        };
      });
    },
  };
}

export const gitStore = createGitStore();
