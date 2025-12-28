import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

// Tokyo Night Storm colors
const tokyoNight = {
  bg: "#24283b",
  bgHighlight: "#292e42",
  bgDark: "#1f2335",
  fg: "#c0caf5",
  fgDark: "#a9b1d6",
  fgGutter: "#3b4261",
  comment: "#565f89",
  cyan: "#7dcfff",
  blue: "#7aa2f7",
  purple: "#bb9af7",
  magenta: "#ff007c",
  orange: "#ff9e64",
  yellow: "#e0af68",
  green: "#9ece6a",
  teal: "#73daca",
  red: "#f7768e",
  selection: "#33467c",
  cursor: "#c0caf5",
};

// Light theme - Tokyo Night Day
const tokyoDay = {
  bg: "#e1e2e7",
  bgHighlight: "#d5d6db",
  bgDark: "#e9e9ec",
  fg: "#3760bf",
  fgDark: "#6172b0",
  fgGutter: "#9699a3",
  comment: "#848cb5",
  cyan: "#007197",
  blue: "#2e7de9",
  purple: "#9854f1",
  magenta: "#d20065",
  orange: "#b15c00",
  yellow: "#8c6c3e",
  green: "#587539",
  teal: "#387068",
  red: "#f52a65",
  selection: "#b6bfe2",
  cursor: "#3760bf",
};

// Font settings for code
const fontTheme = EditorView.theme({
  "&": {
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Menlo', monospace",
    fontSize: "14px",
    fontFeatureSettings: '"liga" 1, "calt" 1',  // Enable ligatures
  },
  ".cm-content": {
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Menlo', monospace",
    lineHeight: "1.6",
    letterSpacing: "0.3px",
  },
  ".cm-gutters": {
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Menlo', monospace",
    fontSize: "13px",
  },
});

// Dark theme UI
const darkTheme = EditorView.theme(
  {
    "&": {
      color: tokyoNight.fg,
      backgroundColor: tokyoNight.bg,
    },
    ".cm-content": {
      caretColor: tokyoNight.cursor,
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: tokyoNight.cursor,
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      background: "#214283 !important",
    },
    ".cm-panels": {
      backgroundColor: tokyoNight.bgDark,
      color: tokyoNight.fg,
    },
    ".cm-panels.cm-panels-top": {
      borderBottom: `1px solid ${tokyoNight.bgHighlight}`,
    },
    ".cm-panels.cm-panels-bottom": {
      borderTop: `1px solid ${tokyoNight.bgHighlight}`,
    },
    ".cm-searchMatch": {
      backgroundColor: `${tokyoNight.yellow}40`,
      outline: `1px solid ${tokyoNight.yellow}`,
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: `${tokyoNight.green}40`,
    },
    ".cm-activeLine": {
      backgroundColor: tokyoNight.bgHighlight,
    },
    ".cm-selectionMatch": {
      backgroundColor: `${tokyoNight.blue}30`,
    },
    "&.cm-focused .cm-matchingBracket": {
      backgroundColor: `${tokyoNight.purple}40`,
      outline: `1px solid ${tokyoNight.purple}`,
    },
    "&.cm-focused .cm-nonmatchingBracket": {
      backgroundColor: `${tokyoNight.red}40`,
    },
    ".cm-gutters": {
      backgroundColor: tokyoNight.bgDark,
      color: tokyoNight.fgGutter,
      border: "none",
    },
    ".cm-activeLineGutter": {
      backgroundColor: tokyoNight.bgHighlight,
      color: tokyoNight.fgDark,
    },
    ".cm-foldPlaceholder": {
      backgroundColor: tokyoNight.bgHighlight,
      border: "none",
      color: tokyoNight.comment,
    },
    ".cm-tooltip": {
      border: `1px solid ${tokyoNight.bgHighlight}`,
      backgroundColor: tokyoNight.bgDark,
      borderRadius: "6px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    },
    ".cm-tooltip-autocomplete": {
      "& > ul > li[aria-selected]": {
        backgroundColor: tokyoNight.selection,
        color: tokyoNight.fg,
      },
    },
    ".cm-line": {
      padding: "0 4px",
    },
  },
  { dark: true }
);

// Light theme UI
const lightTheme = EditorView.theme(
  {
    "&": {
      color: tokyoDay.fg,
      backgroundColor: tokyoDay.bg,
    },
    ".cm-content": {
      caretColor: tokyoDay.cursor,
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: tokyoDay.cursor,
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      background: "#add6ff !important",
    },
    ".cm-panels": {
      backgroundColor: tokyoDay.bgDark,
      color: tokyoDay.fg,
    },
    ".cm-panels.cm-panels-top": {
      borderBottom: `1px solid ${tokyoDay.bgHighlight}`,
    },
    ".cm-panels.cm-panels-bottom": {
      borderTop: `1px solid ${tokyoDay.bgHighlight}`,
    },
    ".cm-searchMatch": {
      backgroundColor: `${tokyoDay.yellow}40`,
      outline: `1px solid ${tokyoDay.yellow}`,
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: `${tokyoDay.green}40`,
    },
    ".cm-activeLine": {
      backgroundColor: tokyoDay.bgHighlight,
    },
    ".cm-selectionMatch": {
      backgroundColor: `${tokyoDay.blue}30`,
    },
    "&.cm-focused .cm-matchingBracket": {
      backgroundColor: `${tokyoDay.purple}40`,
      outline: `1px solid ${tokyoDay.purple}`,
    },
    "&.cm-focused .cm-nonmatchingBracket": {
      backgroundColor: `${tokyoDay.red}40`,
    },
    ".cm-gutters": {
      backgroundColor: tokyoDay.bgDark,
      color: tokyoDay.fgGutter,
      border: "none",
    },
    ".cm-activeLineGutter": {
      backgroundColor: tokyoDay.bgHighlight,
      color: tokyoDay.fgDark,
    },
    ".cm-foldPlaceholder": {
      backgroundColor: tokyoDay.bgHighlight,
      border: "none",
      color: tokyoDay.comment,
    },
    ".cm-tooltip": {
      border: `1px solid ${tokyoDay.bgHighlight}`,
      backgroundColor: tokyoDay.bgDark,
      borderRadius: "6px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    },
    ".cm-tooltip-autocomplete": {
      "& > ul > li[aria-selected]": {
        backgroundColor: tokyoDay.selection,
        color: tokyoDay.fg,
      },
    },
    ".cm-line": {
      padding: "0 4px",
    },
  },
  { dark: false }
);

// Dark syntax highlighting - Tokyo Night
const darkHighlightStyle = HighlightStyle.define([
  // Keywords & Control flow
  { tag: t.keyword, color: tokyoNight.purple },
  { tag: t.controlKeyword, color: tokyoNight.magenta },
  { tag: t.operatorKeyword, color: tokyoNight.cyan },

  // Functions & Methods
  { tag: t.function(t.variableName), color: tokyoNight.blue },
  { tag: t.function(t.propertyName), color: tokyoNight.blue },
  { tag: t.labelName, color: tokyoNight.blue },

  // Variables & Properties
  { tag: t.variableName, color: tokyoNight.fg },
  { tag: t.propertyName, color: tokyoNight.teal },
  { tag: t.definition(t.variableName), color: tokyoNight.fg },
  { tag: t.definition(t.propertyName), color: tokyoNight.teal },

  // Types & Classes
  { tag: t.typeName, color: tokyoNight.cyan },
  { tag: t.className, color: tokyoNight.cyan },
  { tag: t.namespace, color: tokyoNight.cyan },
  { tag: t.macroName, color: tokyoNight.cyan },

  // Literals
  { tag: t.string, color: tokyoNight.green },
  { tag: t.special(t.string), color: tokyoNight.teal },
  { tag: t.number, color: tokyoNight.orange },
  { tag: t.bool, color: tokyoNight.orange },
  { tag: t.null, color: tokyoNight.orange },
  { tag: t.atom, color: tokyoNight.orange },

  // Operators & Punctuation
  { tag: t.operator, color: tokyoNight.cyan },
  { tag: t.separator, color: tokyoNight.fgDark },
  { tag: t.punctuation, color: tokyoNight.fgDark },
  { tag: t.bracket, color: tokyoNight.fgDark },
  { tag: t.angleBracket, color: tokyoNight.cyan },

  // Comments
  { tag: t.comment, color: tokyoNight.comment, fontStyle: "italic" },
  { tag: t.lineComment, color: tokyoNight.comment, fontStyle: "italic" },
  { tag: t.blockComment, color: tokyoNight.comment, fontStyle: "italic" },
  { tag: t.docComment, color: tokyoNight.comment, fontStyle: "italic" },

  // Special
  { tag: t.regexp, color: tokyoNight.red },
  { tag: t.escape, color: tokyoNight.magenta },
  { tag: t.url, color: tokyoNight.blue, textDecoration: "underline" },
  { tag: t.link, color: tokyoNight.blue, textDecoration: "underline" },

  // HTML/JSX
  { tag: t.tagName, color: tokyoNight.red },
  { tag: t.attributeName, color: tokyoNight.purple },
  { tag: t.attributeValue, color: tokyoNight.green },

  // Markdown
  { tag: t.heading, color: tokyoNight.blue, fontWeight: "bold" },
  { tag: t.heading1, color: tokyoNight.magenta, fontWeight: "bold" },
  { tag: t.heading2, color: tokyoNight.blue, fontWeight: "bold" },
  { tag: t.heading3, color: tokyoNight.cyan, fontWeight: "bold" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },

  // Annotations & Meta
  { tag: t.annotation, color: tokyoNight.yellow },
  { tag: t.modifier, color: tokyoNight.purple },
  { tag: t.meta, color: tokyoNight.comment },
  { tag: t.self, color: tokyoNight.red },

  // Errors
  { tag: t.invalid, color: tokyoNight.red, textDecoration: "wavy underline" },
]);

// Light syntax highlighting - Tokyo Night Day
const lightHighlightStyle = HighlightStyle.define([
  // Keywords & Control flow
  { tag: t.keyword, color: tokyoDay.purple },
  { tag: t.controlKeyword, color: tokyoDay.magenta },
  { tag: t.operatorKeyword, color: tokyoDay.cyan },

  // Functions & Methods
  { tag: t.function(t.variableName), color: tokyoDay.blue },
  { tag: t.function(t.propertyName), color: tokyoDay.blue },
  { tag: t.labelName, color: tokyoDay.blue },

  // Variables & Properties
  { tag: t.variableName, color: tokyoDay.fg },
  { tag: t.propertyName, color: tokyoDay.teal },
  { tag: t.definition(t.variableName), color: tokyoDay.fg },
  { tag: t.definition(t.propertyName), color: tokyoDay.teal },

  // Types & Classes
  { tag: t.typeName, color: tokyoDay.cyan },
  { tag: t.className, color: tokyoDay.cyan },
  { tag: t.namespace, color: tokyoDay.cyan },
  { tag: t.macroName, color: tokyoDay.cyan },

  // Literals
  { tag: t.string, color: tokyoDay.green },
  { tag: t.special(t.string), color: tokyoDay.teal },
  { tag: t.number, color: tokyoDay.orange },
  { tag: t.bool, color: tokyoDay.orange },
  { tag: t.null, color: tokyoDay.orange },
  { tag: t.atom, color: tokyoDay.orange },

  // Operators & Punctuation
  { tag: t.operator, color: tokyoDay.cyan },
  { tag: t.separator, color: tokyoDay.fgDark },
  { tag: t.punctuation, color: tokyoDay.fgDark },
  { tag: t.bracket, color: tokyoDay.fgDark },
  { tag: t.angleBracket, color: tokyoDay.cyan },

  // Comments
  { tag: t.comment, color: tokyoDay.comment, fontStyle: "italic" },
  { tag: t.lineComment, color: tokyoDay.comment, fontStyle: "italic" },
  { tag: t.blockComment, color: tokyoDay.comment, fontStyle: "italic" },
  { tag: t.docComment, color: tokyoDay.comment, fontStyle: "italic" },

  // Special
  { tag: t.regexp, color: tokyoDay.red },
  { tag: t.escape, color: tokyoDay.magenta },
  { tag: t.url, color: tokyoDay.blue, textDecoration: "underline" },
  { tag: t.link, color: tokyoDay.blue, textDecoration: "underline" },

  // HTML/JSX
  { tag: t.tagName, color: tokyoDay.red },
  { tag: t.attributeName, color: tokyoDay.purple },
  { tag: t.attributeValue, color: tokyoDay.green },

  // Markdown
  { tag: t.heading, color: tokyoDay.blue, fontWeight: "bold" },
  { tag: t.heading1, color: tokyoDay.magenta, fontWeight: "bold" },
  { tag: t.heading2, color: tokyoDay.blue, fontWeight: "bold" },
  { tag: t.heading3, color: tokyoDay.cyan, fontWeight: "bold" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },

  // Annotations & Meta
  { tag: t.annotation, color: tokyoDay.yellow },
  { tag: t.modifier, color: tokyoDay.purple },
  { tag: t.meta, color: tokyoDay.comment },
  { tag: t.self, color: tokyoDay.red },

  // Errors
  { tag: t.invalid, color: tokyoDay.red, textDecoration: "wavy underline" },
]);

export function getThemeExtension(theme: "dark" | "light"): Extension {
  if (theme === "light") {
    return [fontTheme, lightTheme, syntaxHighlighting(lightHighlightStyle)];
  }
  return [fontTheme, darkTheme, syntaxHighlighting(darkHighlightStyle)];
}
