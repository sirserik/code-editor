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

export async function gitInit(repoPath: string): Promise<void> {
  return invoke("git_init", { repoPath });
}

export async function gitDiscard(
  repoPath: string,
  filePath: string
): Promise<void> {
  return invoke("git_discard", { repoPath, filePath });
}

export async function gitStageAll(repoPath: string): Promise<void> {
  return invoke("git_stage_all", { repoPath });
}

export async function gitUnstageAll(repoPath: string): Promise<void> {
  return invoke("git_unstage_all", { repoPath });
}

export async function gitIsRepo(path: string): Promise<boolean> {
  return invoke<boolean>("git_is_repo", { path });
}

export async function gitInvalidateCache(repoPath: string): Promise<void> {
  return invoke("git_invalidate_cache", { repoPath });
}

export async function getGitStatusFresh(repoPath: string): Promise<GitStatus> {
  return invoke<GitStatus>("git_status_fresh", { repoPath });
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

export async function lspStopLanguage(language: string): Promise<void> {
  return invoke("lsp_stop_language", { language });
}

export async function lspRestart(language: string): Promise<void> {
  return invoke("lsp_restart", { language });
}

export interface LspServerStatus {
  language: string;
  status: string;
  uptime_secs: number;
  requests_served: number;
}

export async function lspStatus(): Promise<LspServerStatus[]> {
  return invoke<LspServerStatus[]>("lsp_status");
}

export async function lspCleanupIdle(): Promise<number> {
  return invoke<number>("lsp_cleanup_idle");
}

export async function lspWarmup(workspaceRoot: string, languages: string[]): Promise<string[]> {
  return invoke<string[]>("lsp_warmup", { workspaceRoot, languages });
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

// Optimized fuzzy search for QuickOpen
export interface FuzzySearchResult {
  path: string;
  filename: string;
  score: number;
  matched_indices: number[];
}

export async function fuzzySearchFiles(
  rootPath: string,
  query: string,
  limit?: number
): Promise<FuzzySearchResult[]> {
  return invoke<FuzzySearchResult[]>("fuzzy_search_files", {
    rootPath,
    query,
    limit: limit || 50,
  });
}

// Optimized flat file tree
export interface FlatFileEntry {
  path: string;
  name: string;
  is_dir: boolean;
  depth: number;
  is_expanded: boolean;
  has_children: boolean;
}

export async function getFileTreeFlat(
  rootPath: string,
  expandedPaths: string[]
): Promise<FlatFileEntry[]> {
  return invoke<FlatFileEntry[]>("get_file_tree_flat", {
    rootPath,
    expandedPaths,
  });
}

// Optimized grouped search results
export interface MatchPosition {
  start: number;
  end: number;
}

export interface SearchMatchResult {
  line: number;
  content: string;
  matches: MatchPosition[];
}

export interface GroupedSearchResult {
  path: string;
  matches: SearchMatchResult[];
}

export async function searchInProjectGrouped(
  rootPath: string,
  query: string,
  caseSensitive: boolean = false
): Promise<GroupedSearchResult[]> {
  return invoke<GroupedSearchResult[]>("search_in_project_grouped", {
    rootPath,
    query,
    caseSensitive,
  });
}

// Find matches in content for editor highlighting
export interface TextMatch {
  start: number;
  end: number;
  line: number;
  column: number;
}

export async function findMatchesInContent(
  content: string,
  query: string,
  caseSensitive: boolean = false
): Promise<TextMatch[]> {
  return invoke<TextMatch[]>("find_matches_in_content", {
    content,
    query,
    caseSensitive,
  });
}

// Get all files (for fuzzy search fallback)
export async function getAllFiles(rootPath: string): Promise<string[]> {
  return invoke<string[]>("get_all_files", { rootPath });
}

// Large file handling
export interface FileInfo {
  path: string;
  size: number;
  is_binary: boolean;
  line_count: number | null;
}

export interface FileChunk {
  content: string;
  start_line: number;
  end_line: number;
  total_lines: number;
  has_more: boolean;
}

export interface SmartFileContent {
  content: string;
  is_partial: boolean;
  total_size: number;
  total_lines: number;
  loaded_lines: number;
}

export async function getFileInfo(path: string): Promise<FileInfo> {
  return invoke<FileInfo>("get_file_info", { path });
}

export async function readFileChunk(
  path: string,
  startLine: number,
  lineCount: number
): Promise<FileChunk> {
  return invoke<FileChunk>("read_file_chunk", { path, startLine, lineCount });
}

export async function readFileBytes(
  path: string,
  offset: number,
  length: number
): Promise<string> {
  return invoke<string>("read_file_bytes", { path, offset, length });
}

export async function readFileSmart(path: string): Promise<SmartFileContent> {
  return invoke<SmartFileContent>("read_file_smart", { path });
}

// Streaming search types
export interface StreamSearchResult {
  path: string;
  filename: string;
  directory: string;
  matches: Array<{
    line: number;
    content: string;
    matchStart: number;
    matchEnd: number;
  }>;
}

export interface SearchProgress {
  files_searched: number;
  matches_found: number;
  current_file: string;
}

export interface SearchComplete {
  total_files: number;
  total_matches: number;
  cancelled: boolean;
}

// Start streaming search - returns search ID
export async function searchStreamingStart(
  rootPath: string,
  query: string,
  caseSensitive: boolean = false
): Promise<number> {
  return invoke<number>("search_streaming_start", {
    rootPath,
    query,
    caseSensitive,
  });
}

// Cancel streaming search
export async function searchStreamingCancel(searchId: number): Promise<void> {
  return invoke("search_streaming_cancel", { searchId });
}

// ============================================
// FIND AND REPLACE
// ============================================

export interface ReplaceMatch {
  line: number;
  column: number;
  length: number;
  text: string;
  line_content: string;
}

export interface FindResult {
  matches: ReplaceMatch[];
  total_count: number;
}

export interface ReplaceResult {
  replaced_count: number;
  new_content: string;
}

export async function findInContent(
  content: string,
  query: string,
  caseSensitive: boolean = false,
  useRegex: boolean = false,
  wholeWord: boolean = false
): Promise<FindResult> {
  return invoke<FindResult>("find_in_content", {
    content,
    query,
    caseSensitive,
    useRegex,
    wholeWord,
  });
}

export async function replaceInContent(
  content: string,
  query: string,
  replacement: string,
  caseSensitive: boolean = false,
  useRegex: boolean = false,
  wholeWord: boolean = false
): Promise<ReplaceResult> {
  return invoke<ReplaceResult>("replace_in_content", {
    content,
    query,
    replacement,
    caseSensitive,
    useRegex,
    wholeWord,
  });
}

export async function replaceSingle(
  content: string,
  line: number,
  column: number,
  length: number,
  replacement: string
): Promise<string> {
  return invoke<string>("replace_single", {
    content,
    line,
    column,
    length,
    replacement,
  });
}

// ============================================
// LSP: GO TO DEFINITION, HOVER, FORMAT
// ============================================

export interface LocationResult {
  path: string;
  line: number;
  column: number;
  end_line: number;
  end_column: number;
}

export interface HoverResult {
  contents: string;
  range: RangeResult | null;
}

export interface RangeResult {
  start_line: number;
  start_column: number;
  end_line: number;
  end_column: number;
}

export async function lspGoToDefinition(
  language: string,
  path: string,
  line: number,
  column: number
): Promise<LocationResult | null> {
  return invoke<LocationResult | null>("lsp_go_to_definition", {
    language,
    path,
    line,
    column,
  });
}

export async function lspHover(
  language: string,
  path: string,
  line: number,
  column: number
): Promise<HoverResult | null> {
  return invoke<HoverResult | null>("lsp_hover", {
    language,
    path,
    line,
    column,
  });
}

export async function lspFormatDocument(
  language: string,
  path: string,
  tabSize: number = 2,
  insertSpaces: boolean = true
): Promise<TextEdit[]> {
  return invoke<TextEdit[]>("lsp_format_document", {
    language,
    path,
    tabSize,
    insertSpaces,
  });
}
