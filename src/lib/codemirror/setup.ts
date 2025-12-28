import { EditorState, type Extension, Compartment, EditorSelection } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab, copyLineDown, copyLineUp, moveLineDown, moveLineUp } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { foldGutter, indentOnInput, bracketMatching, foldKeymap, syntaxTree } from "@codemirror/language";
import { getLanguageExtension } from "./languages";
import { getThemeExtension } from "./themes";
import type { Settings } from "../stores/settings";

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

// Compartment for dynamic font size updates
export const fontSizeCompartment = new Compartment();

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
}

export function createEditorState(
  content: string,
  options: EditorSetupOptions
): EditorState {
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
    autocompletion(),
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

    // Language
    getLanguageExtension(options.language),

    // Theme
    getThemeExtension(options.settings.theme),

    // Tab size
    EditorState.tabSize.of(options.settings.tabSize),

    // Word wrap
    options.settings.wordWrap ? EditorView.lineWrapping : [],

    // Font settings (via compartment for dynamic updates)
    fontSizeCompartment.of(
      createFontSizeExtension(options.settings.fontSize, options.settings.fontFamily)
    ),

    // Change listener
    EditorView.updateListener.of((update) => {
      if (update.docChanged && options.onChange) {
        options.onChange(update.state.doc.toString());
      }
      if (update.selectionSet && options.onCursorChange) {
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        options.onCursorChange(line.number, pos - line.from + 1);
      }
    }),
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
