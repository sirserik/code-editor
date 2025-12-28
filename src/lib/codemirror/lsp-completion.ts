import { type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import { EditorView, keymap } from "@codemirror/view";
import { lspGetCompletions, lspOpenFile, lspUpdateFile, lspStart, emmetExpand, type CompletionResult as LspCompletion } from "../utils/ipc";

// Track which language servers are started
const startedServers = new Set<string>();
const openedFiles = new Set<string>();

// Languages that support LSP
const LSP_LANGUAGES = ["typescript", "javascript", "tsx", "jsx", "php"];

// Languages that support Emmet
const EMMET_LANGUAGES = ["html", "jsx", "tsx", "vue", "svelte", "css", "scss", "less"];

function mapCompletionKind(kind: string): string {
  const kindMap: Record<string, string> = {
    method: "method",
    function: "function",
    constructor: "function",
    field: "property",
    variable: "variable",
    class: "class",
    interface: "interface",
    module: "namespace",
    property: "property",
    unit: "constant",
    value: "constant",
    enum: "enum",
    keyword: "keyword",
    snippet: "snippet",
    text: "text",
    color: "constant",
    file: "text",
    reference: "text",
    folder: "text",
    enum_member: "enum",
    constant: "constant",
    struct: "class",
    event: "function",
    operator: "keyword",
    type_parameter: "type",
  };
  return kindMap[kind] || "text";
}

export async function ensureLspStarted(language: string, workspaceRoot: string): Promise<boolean> {
  if (!LSP_LANGUAGES.includes(language)) {
    return false;
  }

  const lspLanguage = getLspLanguage(language);
  if (startedServers.has(lspLanguage)) {
    return true;
  }

  try {
    await lspStart(lspLanguage, workspaceRoot);
    startedServers.add(lspLanguage);
    return true;
  } catch (e) {
    console.warn(`LSP server for ${lspLanguage} not available:`, e);
    return false;
  }
}

function getLspLanguage(language: string): string {
  // Map editor languages to LSP language IDs
  if (language === "tsx" || language === "jsx") {
    return "typescript";
  }
  return language;
}

export async function notifyFileOpen(language: string, path: string, content: string): Promise<void> {
  if (!LSP_LANGUAGES.includes(language)) return;

  const lspLanguage = getLspLanguage(language);
  if (!startedServers.has(lspLanguage)) return;

  const key = `${lspLanguage}:${path}`;
  if (!openedFiles.has(key)) {
    try {
      await lspOpenFile(lspLanguage, path, content);
      openedFiles.add(key);
    } catch (e) {
      console.warn("Failed to notify file open:", e);
    }
  }
}

export async function notifyFileChange(language: string, path: string, content: string): Promise<void> {
  if (!LSP_LANGUAGES.includes(language)) return;

  const lspLanguage = getLspLanguage(language);
  if (!startedServers.has(lspLanguage)) return;

  try {
    await lspUpdateFile(lspLanguage, path, content);
  } catch (e) {
    // Silently ignore update errors
  }
}

export function createLspCompletionSource(
  getFileInfo: () => { path: string; language: string; content: string }
) {
  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    const { path, language, content } = getFileInfo();

    // Get word before cursor for matching
    const word = context.matchBefore(/[\w$]+/);
    if (!word && !context.explicit) {
      return null;
    }

    const pos = context.pos;
    const line = context.state.doc.lineAt(pos);
    const lineNumber = line.number - 1; // LSP uses 0-based
    const column = pos - line.from;

    const results: Array<{
      label: string;
      type: string;
      detail?: string;
      apply?: string;
      boost?: number;
    }> = [];

    // Try LSP completions
    if (LSP_LANGUAGES.includes(language)) {
      const lspLanguage = getLspLanguage(language);
      if (startedServers.has(lspLanguage)) {
        try {
          const completions = await lspGetCompletions(lspLanguage, path, lineNumber, column);
          for (const item of completions) {
            results.push({
              label: item.label,
              type: mapCompletionKind(item.kind),
              detail: item.detail || undefined,
              apply: item.insert_text || item.label,
              boost: 1, // Prioritize LSP results
            });
          }
        } catch (e) {
          // LSP failed, continue with other completions
        }
      }
    }

    // Try Emmet expansion for HTML-like languages
    // Match Emmet patterns including those starting with . or #
    const emmetWord = context.matchBefore(/[a-zA-Z.#][a-zA-Z0-9.#>+*\[\]{}$@^()-]*/);
    if (EMMET_LANGUAGES.includes(language) && emmetWord) {
      const abbr = emmetWord.text;
      // Only try Emmet for patterns that look like abbreviations
      if (/^[a-zA-Z.#][a-zA-Z0-9.#>+*\[\]{}$@^()-]*$/.test(abbr) && abbr.length >= 2) {
        try {
          const expanded = await emmetExpand(abbr, language);
          if (expanded && expanded !== abbr && expanded.includes('<')) {
            results.push({
              label: `${abbr} → Emmet`,
              type: "snippet",
              detail: expanded.split('\n')[0].substring(0, 50),
              apply: expanded,
              boost: 10, // High priority for Emmet
            });
          }
        } catch (e) {
          // Emmet expansion failed
        }
      }
    }

    if (results.length === 0) {
      return null;
    }

    // Use the earliest position (emmet might match more)
    const from = Math.min(
      word?.from ?? pos,
      emmetWord?.from ?? pos
    );

    return {
      from,
      options: results,
      validFor: /^[\w.#>+*\[\]{}$@^()-]*$/,
    };
  };
}

// Debounced file update notifier
let updateTimeout: ReturnType<typeof setTimeout> | null = null;

export function debouncedNotifyFileChange(language: string, path: string, content: string): void {
  if (updateTimeout) {
    clearTimeout(updateTimeout);
  }
  updateTimeout = setTimeout(() => {
    notifyFileChange(language, path, content);
  }, 500);
}

// Emmet Tab expansion - synchronous check, async expand
export function createEmmetTabExpansion(language: string) {
  return keymap.of([{
    key: "Tab",
    run: (view) => {
      // Only for HTML-like languages
      if (!EMMET_LANGUAGES.includes(language)) {
        return false;
      }

      // Don't expand if there's a selection
      if (!view.state.selection.main.empty) {
        return false;
      }

      const pos = view.state.selection.main.head;
      const line = view.state.doc.lineAt(pos);
      const textBefore = line.text.slice(0, pos - line.from);

      // Match Emmet abbreviation at the end of the line
      const match = textBefore.match(/([a-zA-Z.#][a-zA-Z0-9.#>+*\[\]{}$@^()!-]*)$/);
      if (!match || match[1].length < 2) {
        return false;
      }

      const abbr = match[1];
      const from = pos - abbr.length;

      // Expand synchronously by blocking (not ideal but works for Tab)
      emmetExpand(abbr, language).then(expanded => {
        if (expanded && expanded !== abbr && expanded.includes('<')) {
          view.dispatch({
            changes: { from, to: pos, insert: expanded },
            selection: { anchor: from + expanded.length }
          });
        }
      }).catch(() => {});

      return true; // Consume Tab key
    }
  }]);
}
