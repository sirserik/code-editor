import { invoke } from "@tauri-apps/api/core";
import type { FileEntry } from "../stores/files";
import type { GitStatus } from "../stores/git";

// File operations
export async function readFile(path: string): Promise<string> {
  return invoke<string>("read_file", { path });
}

export async function writeFile(path: string, content: string): Promise<void> {
  return invoke("write_file", { path, content });
}

export async function listDirectory(path: string): Promise<FileEntry[]> {
  return invoke<FileEntry[]>("list_directory", { path });
}

export async function createFile(path: string): Promise<void> {
  return invoke("create_file", { path });
}

export async function createDirectory(path: string): Promise<void> {
  return invoke("create_directory", { path });
}

export async function deleteFile(path: string): Promise<void> {
  return invoke("delete_file", { path });
}

export async function renameFile(
  oldPath: string,
  newPath: string
): Promise<void> {
  return invoke("rename_file", { oldPath, newPath });
}

// Git operations
export async function getGitStatus(repoPath: string): Promise<GitStatus> {
  return invoke<GitStatus>("git_status", { repoPath });
}

export async function getGitDiff(
  repoPath: string,
  filePath: string
): Promise<string> {
  return invoke<string>("git_diff", { repoPath, filePath });
}

export async function gitStage(
  repoPath: string,
  filePath: string
): Promise<void> {
  return invoke("git_stage", { repoPath, filePath });
}

export async function gitUnstage(
  repoPath: string,
  filePath: string
): Promise<void> {
  return invoke("git_unstage", { repoPath, filePath });
}

export async function gitCommit(
  repoPath: string,
  message: string
): Promise<void> {
  return invoke("git_commit", { repoPath, message });
}

// Terminal operations
export async function spawnTerminal(): Promise<string> {
  return invoke<string>("spawn_terminal");
}

export async function writeToTerminal(
  id: string,
  data: string
): Promise<void> {
  return invoke("write_to_terminal", { id, data });
}

export async function resizeTerminal(
  id: string,
  cols: number,
  rows: number
): Promise<void> {
  return invoke("resize_terminal", { id, cols, rows });
}

export async function killTerminal(id: string): Promise<void> {
  return invoke("kill_terminal", { id });
}

// Dialog operations
export async function openFileDialog(): Promise<string | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const result = await open({
    multiple: false,
    directory: false,
  });
  return result as string | null;
}

export async function openFolderDialog(): Promise<string | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const result = await open({
    multiple: false,
    directory: true,
  });
  return result as string | null;
}

export async function saveFileDialog(
  defaultPath?: string
): Promise<string | null> {
  const { save } = await import("@tauri-apps/plugin-dialog");
  return save({
    defaultPath,
  });
}
