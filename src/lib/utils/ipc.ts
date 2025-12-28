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

// Confirmation dialogs
export async function confirmDialog(
  title: string,
  message: string
): Promise<boolean> {
  const { confirm } = await import("@tauri-apps/plugin-dialog");
  return confirm(message, { title, kind: "warning" });
}

export async function askDialog(
  title: string,
  message: string
): Promise<boolean | null> {
  const { ask } = await import("@tauri-apps/plugin-dialog");
  return ask(message, { title, kind: "warning" });
}

export async function messageDialog(
  title: string,
  message: string,
  kind: "info" | "warning" | "error" = "info"
): Promise<void> {
  const { message: showMessage } = await import("@tauri-apps/plugin-dialog");
  await showMessage(message, { title, kind });
}

// Search in project
export interface SearchResult {
  path: string;
  line: number;
  content: string;
  match: string;
}

export interface SearchOptions {
  include?: string;
  exclude?: string;
  caseSensitive?: boolean;
  useRegex?: boolean;
}

export async function searchInProject(
  rootPath: string,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  return invoke<SearchResult[]>("search_in_project", {
    rootPath,
    query,
    include: options.include || null,
    exclude: options.exclude || "node_modules,dist,.git,target",
    caseSensitive: options.caseSensitive || false,
    useRegex: options.useRegex || false,
  });
}

// Check if file exists
export async function fileExists(path: string): Promise<boolean> {
  return invoke<boolean>("file_exists", { path });
}

// LSP operations
export interface CompletionResult {
  label: string;
  kind: string;
  detail: string | null;
  insert_text: string | null;
  additional_text_edits: TextEdit[] | null;
}

export interface TextEdit {
  start_line: number;
  start_col: number;
  end_line: number;
  end_col: number;
  new_text: string;
}

export async function lspStart(language: string, workspaceRoot: string): Promise<void> {
  return invoke("lsp_start", { language, workspaceRoot });
}

export async function lspStop(): Promise<void> {
  return invoke("lsp_stop");
}

export async function lspOpenFile(language: string, path: string, content: string): Promise<void> {
  return invoke("lsp_open_file", { language, path, content });
}

export async function lspUpdateFile(language: string, path: string, content: string): Promise<void> {
  return invoke("lsp_update_file", { language, path, content });
}

export async function lspGetCompletions(
  language: string,
  path: string,
  line: number,
  column: number
): Promise<CompletionResult[]> {
  return invoke<CompletionResult[]>("lsp_get_completions", { language, path, line, column });
}

// Emmet expansion
export async function emmetExpand(abbreviation: string, language: string): Promise<string> {
  return invoke<string>("emmet_expand", { abbreviation, language });
}
