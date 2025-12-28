import { EditorState, type Extension, Compartment } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { foldGutter, indentOnInput, bracketMatching, foldKeymap } from "@codemirror/language";
import { getLanguageExtension } from "./languages";
import { getThemeExtension } from "./themes";
import type { Settings } from "../stores/settings";

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
