import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";

// Custom light theme based on Catppuccin Latte
const lightTheme = EditorView.theme(
  {
    "&": {
      color: "#4c4f69",
      backgroundColor: "#eff1f5",
    },
    ".cm-content": {
      caretColor: "#1e66f5",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#1e66f5",
    },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "#ccd0da",
      },
    ".cm-panels": {
      backgroundColor: "#e6e9ef",
      color: "#4c4f69",
    },
    ".cm-panels.cm-panels-top": {
      borderBottom: "1px solid #ccd0da",
    },
    ".cm-panels.cm-panels-bottom": {
      borderTop: "1px solid #ccd0da",
    },
    ".cm-searchMatch": {
      backgroundColor: "#f9e2af",
      outline: "1px solid #df8e1d",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "#a6e3a1",
    },
    ".cm-activeLine": {
      backgroundColor: "#e6e9ef50",
    },
    ".cm-selectionMatch": {
      backgroundColor: "#ccd0da",
    },
    "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
      backgroundColor: "#ccd0da",
    },
    ".cm-gutters": {
      backgroundColor: "#e6e9ef",
      color: "#9ca0b0",
      border: "none",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#dce0e8",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "transparent",
      border: "none",
      color: "#9ca0b0",
    },
    ".cm-tooltip": {
      border: "1px solid #ccd0da",
      backgroundColor: "#eff1f5",
    },
    ".cm-tooltip .cm-tooltip-arrow:before": {
      borderTopColor: "transparent",
      borderBottomColor: "transparent",
    },
    ".cm-tooltip .cm-tooltip-arrow:after": {
      borderTopColor: "#eff1f5",
      borderBottomColor: "#eff1f5",
    },
    ".cm-tooltip-autocomplete": {
      "& > ul > li[aria-selected]": {
        backgroundColor: "#ccd0da",
        color: "#4c4f69",
      },
    },
  },
  { dark: false }
);

// Custom dark theme based on Catppuccin Mocha
const darkTheme = EditorView.theme(
  {
    "&": {
      color: "#cdd6f4",
      backgroundColor: "#1e1e2e",
    },
    ".cm-content": {
      caretColor: "#89b4fa",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#89b4fa",
    },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "#45475a",
      },
    ".cm-panels": {
      backgroundColor: "#181825",
      color: "#cdd6f4",
    },
    ".cm-panels.cm-panels-top": {
      borderBottom: "1px solid #313244",
    },
    ".cm-panels.cm-panels-bottom": {
      borderTop: "1px solid #313244",
    },
    ".cm-searchMatch": {
      backgroundColor: "#f9e2af40",
      outline: "1px solid #f9e2af",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "#a6e3a140",
    },
    ".cm-activeLine": {
      backgroundColor: "#313244",
    },
    ".cm-selectionMatch": {
      backgroundColor: "#45475a",
    },
    "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
      backgroundColor: "#45475a",
    },
    ".cm-gutters": {
      backgroundColor: "#181825",
      color: "#6c7086",
      border: "none",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#313244",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "transparent",
      border: "none",
      color: "#6c7086",
    },
    ".cm-tooltip": {
      border: "1px solid #313244",
      backgroundColor: "#1e1e2e",
    },
    ".cm-tooltip .cm-tooltip-arrow:before": {
      borderTopColor: "transparent",
      borderBottomColor: "transparent",
    },
    ".cm-tooltip .cm-tooltip-arrow:after": {
      borderTopColor: "#1e1e2e",
      borderBottomColor: "#1e1e2e",
    },
    ".cm-tooltip-autocomplete": {
      "& > ul > li[aria-selected]": {
        backgroundColor: "#45475a",
        color: "#cdd6f4",
      },
    },
  },
  { dark: true }
);

export function getThemeExtension(theme: "dark" | "light"): Extension {
  if (theme === "light") {
    return lightTheme;
  }
  return [oneDark, darkTheme];
}
