import type { Extension } from "@codemirror/state";

// Lazy load language extensions to reduce initial bundle size
const languageLoaders: Record<string, () => Promise<Extension>> = {
  javascript: async () => {
    const { javascript } = await import("@codemirror/lang-javascript");
    return javascript();
  },
  typescript: async () => {
    const { javascript } = await import("@codemirror/lang-javascript");
    return javascript({ typescript: true });
  },
  jsx: async () => {
    const { javascript } = await import("@codemirror/lang-javascript");
    return javascript({ jsx: true });
  },
  tsx: async () => {
    const { javascript } = await import("@codemirror/lang-javascript");
    return javascript({ typescript: true, jsx: true });
  },
  python: async () => {
    const { python } = await import("@codemirror/lang-python");
    return python();
  },
  rust: async () => {
    const { rust } = await import("@codemirror/lang-rust");
    return rust();
  },
  html: async () => {
    const { html } = await import("@codemirror/lang-html");
    return html();
  },
  css: async () => {
    const { css } = await import("@codemirror/lang-css");
    return css();
  },
  scss: async () => {
    const { css } = await import("@codemirror/lang-css");
    return css();
  },
  less: async () => {
    const { css } = await import("@codemirror/lang-css");
    return css();
  },
  json: async () => {
    const { json } = await import("@codemirror/lang-json");
    return json();
  },
  markdown: async () => {
    const { markdown } = await import("@codemirror/lang-markdown");
    return markdown();
  },
  sql: async () => {
    const { sql } = await import("@codemirror/lang-sql");
    return sql();
  },
  php: async () => {
    const { php } = await import("@codemirror/lang-php");
    return php();
  },
  go: async () => {
    const { go } = await import("@codemirror/lang-go");
    return go();
  },
  java: async () => {
    const { java } = await import("@codemirror/lang-java");
    return java();
  },
  c: async () => {
    const { cpp } = await import("@codemirror/lang-cpp");
    return cpp();
  },
  cpp: async () => {
    const { cpp } = await import("@codemirror/lang-cpp");
    return cpp();
  },
};

// Cache loaded extensions
const loadedExtensions: Map<string, Extension> = new Map();

export async function getLanguageExtension(language: string): Promise<Extension> {
  // Return cached extension if available
  if (loadedExtensions.has(language)) {
    return loadedExtensions.get(language)!;
  }

  const loader = languageLoaders[language];
  if (!loader) {
    return [];
  }

  try {
    const ext = await loader();
    loadedExtensions.set(language, ext);
    return ext;
  } catch (err) {
    console.error(`Failed to load language: ${language}`, err);
    return [];
  }
}

// Synchronous version for initial setup (returns empty, then updates)
export function getLanguageExtensionSync(language: string): Extension {
  return loadedExtensions.get(language) || [];
}

export const supportedLanguages = [
  { id: "javascript", name: "JavaScript", extensions: [".js", ".mjs", ".cjs"] },
  { id: "typescript", name: "TypeScript", extensions: [".ts", ".mts", ".cts"] },
  { id: "jsx", name: "JSX", extensions: [".jsx"] },
  { id: "tsx", name: "TSX", extensions: [".tsx"] },
  { id: "python", name: "Python", extensions: [".py", ".pyw"] },
  { id: "rust", name: "Rust", extensions: [".rs"] },
  { id: "html", name: "HTML", extensions: [".html", ".htm"] },
  { id: "css", name: "CSS", extensions: [".css"] },
  { id: "json", name: "JSON", extensions: [".json"] },
  { id: "markdown", name: "Markdown", extensions: [".md", ".markdown"] },
  { id: "sql", name: "SQL", extensions: [".sql"] },
  { id: "php", name: "PHP", extensions: [".php", ".phtml"] },
  { id: "go", name: "Go", extensions: [".go"] },
  { id: "java", name: "Java", extensions: [".java"] },
  { id: "c", name: "C", extensions: [".c", ".h"] },
  { id: "cpp", name: "C++", extensions: [".cpp", ".hpp", ".cc", ".cxx"] },
];
