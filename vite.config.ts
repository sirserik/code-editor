import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "path";

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      $lib: path.resolve("./src/lib"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core CodeMirror - always needed
          "codemirror-core": [
            "@codemirror/state",
            "@codemirror/view",
            "@codemirror/commands",
            "@codemirror/language",
            "@codemirror/autocomplete",
            "@codemirror/search",
          ],
          // Languages - can be lazy loaded
          "codemirror-langs": [
            "@codemirror/lang-javascript",
            "@codemirror/lang-html",
            "@codemirror/lang-css",
            "@codemirror/lang-json",
            "@codemirror/lang-markdown",
            "@codemirror/lang-python",
            "@codemirror/lang-rust",
            "@codemirror/lang-go",
            "@codemirror/lang-php",
            "@codemirror/lang-sql",
            "@codemirror/lang-java",
            "@codemirror/lang-cpp",
          ],
          // Terminal
          "xterm": [
            "@xterm/xterm",
            "@xterm/addon-fit",
            "@xterm/addon-web-links",
          ],
          // Tauri API
          "tauri": [
            "@tauri-apps/api",
            "@tauri-apps/plugin-dialog",
            "@tauri-apps/plugin-shell",
          ],
        },
      },
    },
  },
});
