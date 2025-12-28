import type { Extension } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { sql } from "@codemirror/lang-sql";
import { php } from "@codemirror/lang-php";
import { go } from "@codemirror/lang-go";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";

export function getLanguageExtension(language: string): Extension {
  console.log("Getting language extension for:", language);
  switch (language) {
    case "javascript":
      console.log("Using JavaScript");
      return javascript();
    case "typescript":
      console.log("Using TypeScript");
      return javascript({ typescript: true });
    case "jsx":
      return javascript({ jsx: true });
    case "tsx":
      console.log("Using TSX");
      return javascript({ typescript: true, jsx: true });
    case "python":
      console.log("Using Python");
      return python();
    case "rust":
      console.log("Using Rust");
      return rust();
    case "html":
      console.log("Using HTML");
      return html();
    case "css":
    case "scss":
    case "less":
      console.log("Using CSS");
      return css();
    case "json":
      console.log("Using JSON");
      return json();
    case "markdown":
      return markdown();
    case "sql":
      return sql();
    case "php":
      console.log("Using PHP");
      return php();
    case "go":
      console.log("Using Go");
      return go();
    case "java":
      console.log("Using Java");
      return java();
    case "c":
    case "cpp":
      console.log("Using C/C++");
      return cpp();
    default:
      console.log("No language extension for:", language);
      return [];
  }
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
