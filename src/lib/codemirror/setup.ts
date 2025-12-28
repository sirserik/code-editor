import { EditorState, type Extension, Compartment, EditorSelection } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab, copyLineDown, copyLineUp, moveLineDown, moveLineUp } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { foldGutter, indentOnInput, bracketMatching, foldKeymap, syntaxTree } from "@codemirror/language";
import { getLanguageExtension, getLanguageExtensionSync } from "./languages";
import { getThemeExtension } from "./themes";
import type { Settings } from "../stores/settings";

// Debounce utility
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return ((...args: any[]) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

// Custom command: Jump to matching bracket
function goToMatchingBracket(view: EditorView): boolean {
  const pos = view.state.selection.main.head;
  const tree = syntaxTree(view.state);
  const node = tree.resolveInner(pos, -1);

  // Check if we're at a bracket
  const brackets: Record<string, string> = {
    '(': ')', ')': '(',
    '[': ']', ']': '[',
    '{': '}', '}': '{'
  };

  const char = view.state.doc.sliceString(pos, pos + 1);
  const prevChar = view.state.doc.sliceString(pos - 1, pos);

  if (brackets[char] || brackets[prevChar]) {
    // Use CodeMirror's built-in bracket matching
    const match = view.state.doc.toString();
    const openBrackets = '([{';
    const closeBrackets = ')]}';

    const searchPos = brackets[char] ? pos : pos - 1;
    const searchChar = brackets[char] ? char : prevChar;
    const isOpen = openBrackets.includes(searchChar);
    const matchChar = brackets[searchChar];

    let depth = 0;
    if (isOpen) {
      for (let i = searchPos; i < match.length; i++) {
        if (match[i] === searchChar) depth++;
        if (match[i] === matchChar) depth--;
        if (depth === 0) {
          view.dispatch({
            selection: EditorSelection.cursor(i + 1),
            scrollIntoView: true
          });
          return true;
        }
      }
    } else {
      for (let i = searchPos; i >= 0; i--) {
        if (match[i] === searchChar) depth++;
        if (match[i] === matchChar) depth--;
        if (depth === 0) {
          view.dispatch({
            selection: EditorSelection.cursor(i),
            scrollIntoView: true
          });
          return true;
        }
      }
    }
  }
  return false;
}

// Compartments for dynamic updates
export const fontSizeCompartment = new Compartment();
export const languageCompartment = new Compartment();
export const themeCompartment = new Compartment();

// Selection theme - ensures visible selection like JetBrains IDEs
const selectionTheme = EditorView.theme({
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "#214283 !important",
  },
  "& .cm-selectionLayer .cm-selectionBackground": {
    backgroundColor: "#214283 !important",
  },
  "&.cm-focused .cm-selectionLayer .cm-selectionBackground": {
    backgroundColor: "#214283 !important",
  },
}, { dark: true });

const selectionThemeLight = EditorView.theme({
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "#add6ff !important",
  },
  "& .cm-selectionLayer .cm-selectionBackground": {
    backgroundColor: "#add6ff !important",
  },
  "&.cm-focused .cm-selectionLayer .cm-selectionBackground": {
    backgroundColor: "#add6ff !important",
  },
}, { dark: false });

export function createFontSizeExtension(fontSize: number, fontFamily: string) {
  return EditorView.theme({
    "&": {
      fontSize: `${fontSize}px !important`,
      fontFamily: fontFamily,
    },
    ".cm-content": {
      fontSize: `${fontSize}px !important`,
      fontFamily: fontFamily,
    },
    ".cm-gutters": {
      fontSize: `${fontSize}px !important`,
      fontFamily: fontFamily,
    },
    ".cm-line": {
      fontSize: `${fontSize}px !important`,
    },
  });
}

export interface EditorSetupOptions {
  language: string;
  settings: Settings;
  onChange?: (content: string) => void;
  onCursorChange?: (line: number, column: number) => void;
  onDirty?: () => void;  // Called immediately when content changes (for dirty flag)
  completionSource?: any;  // Custom completion source for LSP
  emmetExtension?: any;  // Emmet Tab expansion extension
}

export function createEditorState(
  content: string,
  options: EditorSetupOptions
): EditorState {
  // Create debounced handlers - sync content every 300ms, cursor every 100ms
  const debouncedOnChange = options.onChange
    ? debounce(options.onChange, 300)
    : () => {};
  const debouncedCursorChange = options.onCursorChange
    ? debounce(options.onCursorChange, 100)
    : () => {};

  const extensions: Extension[] = [
    // Basic setup
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    autocompletion({
      override: options.completionSource ? [options.completionSource] : undefined,
      activateOnTyping: true,
      maxRenderedOptions: 50,
    }),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),

    // Keymaps
    keymap.of([
      // PhpStorm-like keybindings
      { key: "Mod-d", run: copyLineDown },           // Duplicate line down
      { key: "Mod-Shift-d", run: copyLineUp },       // Duplicate line up
      { key: "Alt-ArrowUp", run: moveLineUp },       // Move line up
      { key: "Alt-ArrowDown", run: moveLineDown },   // Move line down
      { key: "Mod-Shift-m", run: goToMatchingBracket }, // Jump to matching bracket
      { key: "Ctrl-m", mac: "Ctrl-m", run: goToMatchingBracket }, // Alternative
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      indentWithTab,
    ]),

    // Language (sync version for initial load, can be updated async later)
    languageCompartment.of(getLanguageExtensionSync(options.language)),

    // Theme (in compartment for dynamic switching)
    themeCompartment.of([
      getThemeExtension(options.settings.theme),
      options.settings.theme === "dark" ? selectionTheme : selectionThemeLight,
    ]),

    // Tab size
    EditorState.tabSize.of(options.settings.tabSize),

    // Word wrap
    options.settings.wordWrap ? EditorView.lineWrapping : [],

    // Font settings (via compartment for dynamic updates)
    fontSizeCompartment.of(
      createFontSizeExtension(options.settings.fontSize, options.settings.fontFamily)
    ),

    // Change listener with debounced content sync
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        // Mark dirty immediately (cheap operation)
        options.onDirty?.();
        // Debounce actual content sync (expensive operation)
        if (options.onChange) {
          debouncedOnChange(update.state.doc.toString());
        }
      }
      // Debounce cursor position updates too
      if (update.selectionSet && options.onCursorChange) {
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        debouncedCursorChange(line.number, pos - line.from + 1);
      }
    }),

    // Emmet Tab expansion (if provided)
    ...(options.emmetExtension ? [options.emmetExtension] : []),
  ];

  return EditorState.create({
    doc: content,
    extensions,
  });
}

export function createEditorView(
  state: EditorState,
  parent: HTMLElement
): EditorView {
  return new EditorView({
    state,
    parent,
  });
}

// Load language extension asynchronously and apply to editor
export async function loadLanguageAsync(view: EditorView, language: string): Promise<void> {
  const ext = await getLanguageExtension(language);
  view.dispatch({
    effects: languageCompartment.reconfigure(ext),
  });
}

// Update theme dynamically
export function updateTheme(view: EditorView, theme: "dark" | "light"): void {
  view.dispatch({
    effects: themeCompartment.reconfigure([
      getThemeExtension(theme),
      theme === "dark" ? selectionTheme : selectionThemeLight,
    ]),
  });
}
