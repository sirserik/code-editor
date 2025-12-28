<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { EditorView, Decoration, type DecorationSet } from "@codemirror/view";
  import { StateField, StateEffect } from "@codemirror/state";
  import { createEditorState, fontSizeCompartment, createFontSizeExtension } from "$lib/codemirror/setup";
  import { settingsStore } from "$lib/stores/settings";
  import { filesStore, searchHighlightStore, projectRootStore } from "$lib/stores/files";
  import type { OpenFile } from "$lib/stores/files";
  import { writeFile, messageDialog } from "$lib/utils/ipc";
  import { ensureLspStarted, notifyFileOpen, debouncedNotifyFileChange, createLspCompletionSource } from "$lib/codemirror/lsp-completion";

  interface Props {
    file: OpenFile;
  }

  let { file }: Props = $props();

  let editorContainer: HTMLDivElement;
  let view: EditorView | null = null;

  // Effect to set search highlights
  const setSearchHighlight = StateEffect.define<string>();

  // State field to track highlights
  const highlightField = StateField.define<DecorationSet>({
    create() {
      return Decoration.none;
    },
    update(highlights, tr) {
      for (const effect of tr.effects) {
        if (effect.is(setSearchHighlight)) {
          const query = effect.value;
          if (!query) {
            return Decoration.none;
          }

          const decorations: any[] = [];
          const doc = tr.state.doc;
          const lowerQuery = query.toLowerCase();

          for (let i = 1; i <= doc.lines; i++) {
            const line = doc.line(i);
            const lineText = line.text.toLowerCase();
            let pos = 0;

            while ((pos = lineText.indexOf(lowerQuery, pos)) !== -1) {
              decorations.push(
                Decoration.mark({
                  class: "cm-search-highlight"
                }).range(line.from + pos, line.from + pos + query.length)
              );
              pos += query.length;
            }
          }

          return Decoration.set(decorations, true);
        }
      }
      return highlights.map(tr.changes);
    },
    provide: (f) => EditorView.decorations.from(f),
  });

  function handleChange(content: string) {
    filesStore.updateContent(file.path, content);
  }

  function handleCursorChange(line: number, column: number) {
    filesStore.updateCursor(file.path, line, column);
  }

  function handleDirty() {
    filesStore.markDirty(file.path);
    // Notify LSP about file change
    debouncedNotifyFileChange(file.language, file.path, view?.state.doc.toString() || file.content);
  }

  // Create LSP completion source
  const lspCompletionSource = createLspCompletionSource(() => ({
    path: file.path,
    language: file.language,
    content: view?.state.doc.toString() || file.content,
  }));

  async function handleSave() {
    try {
      const contentToSave = view?.state.doc.toString() || file.content;
      await writeFile(file.path, contentToSave);
      filesStore.markSaved(file.path);
      if (editorContainer) {
        editorContainer.style.outline = "2px solid var(--success)";
        setTimeout(() => {
          editorContainer.style.outline = "none";
        }, 300);
      }
    } catch (err) {
      console.error("Failed to save file:", err);
      messageDialog("Error", "Failed to save: " + err, "error");
    }
  }

  function scrollToLine(lineNumber: number) {
    if (!view) return;

    const line = view.state.doc.line(Math.min(lineNumber, view.state.doc.lines));
    const pos = line.from;

    view.dispatch({
      selection: { anchor: pos },
      scrollIntoView: true,
      effects: EditorView.scrollIntoView(pos, { y: "center" }),
    });
  }

  onMount(async () => {
    // Start LSP server if available
    const workspaceRoot = $projectRootStore;
    if (workspaceRoot) {
      await ensureLspStarted(file.language, workspaceRoot);
      await notifyFileOpen(file.language, file.path, file.content);
    }

    const state = createEditorState(file.content, {
      language: file.language,
      settings: $settingsStore,
      onChange: handleChange,
      onCursorChange: handleCursorChange,
      onDirty: handleDirty,
      completionSource: lspCompletionSource,
    });

    // Add highlight field extension
    const stateWithHighlight = state.update({
      effects: StateEffect.appendConfig.of([highlightField]),
    }).state;

    view = new EditorView({
      state: stateWithHighlight,
      parent: editorContainer,
    });

    // Apply search highlight if there's one
    const currentHighlight = $searchHighlightStore;
    if (currentHighlight) {
      view.dispatch({
        effects: setSearchHighlight.of(currentHighlight),
      });
    }

    // Scroll to cursor position
    if (file.cursorPosition.line > 1) {
      setTimeout(() => scrollToLine(file.cursorPosition.line), 50);
    }

    // Add save keybinding
    const handleKeydown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      if (modKey && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      // Clear highlights on Escape
      if (e.key === "Escape" && view) {
        searchHighlightStore.set("");
        view.dispatch({
          effects: setSearchHighlight.of(""),
        });
      }
    };

    editorContainer.addEventListener("keydown", handleKeydown);

    return () => {
      editorContainer.removeEventListener("keydown", handleKeydown);
    };
  });

  onDestroy(() => {
    view?.destroy();
  });

  // Update editor when file changes
  $effect(() => {
    if (view && file) {
      const currentContent = view.state.doc.toString();
      if (currentContent !== file.content && !file.isDirty) {
        view.dispatch({
          changes: {
            from: 0,
            to: currentContent.length,
            insert: file.content,
          },
        });
      }
    }
  });

  // React to search highlight changes
  $effect(() => {
    const highlight = $searchHighlightStore;
    if (view) {
      view.dispatch({
        effects: setSearchHighlight.of(highlight),
      });
    }
  });

  // React to font size changes (zoom)
  $effect(() => {
    const fontSize = $settingsStore.fontSize;
    const fontFamily = $settingsStore.fontFamily;
    if (view) {
      view.dispatch({
        effects: fontSizeCompartment.reconfigure(
          createFontSizeExtension(fontSize, fontFamily)
        ),
      });
    }
  });
</script>

<div class="editor-wrapper" bind:this={editorContainer}></div>

<style>
  .editor-wrapper {
    height: 100%;
    width: 100%;
    overflow: hidden;
  }

  .editor-wrapper :global(.cm-editor) {
    height: 100%;
  }

  .editor-wrapper :global(.cm-scroller) {
    overflow: auto;
  }

  /* Dark theme search highlight */
  :global([data-theme="dark"]) .editor-wrapper :global(.cm-search-highlight) {
    background-color: rgba(187, 154, 247, 0.4) !important;
    border-radius: 2px;
    padding: 1px 0;
    box-shadow: 0 0 0 1px rgba(187, 154, 247, 0.6);
  }

  /* Light theme search highlight */
  :global([data-theme="light"]) .editor-wrapper :global(.cm-search-highlight) {
    background-color: rgba(152, 84, 241, 0.3) !important;
    border-radius: 2px;
    padding: 1px 0;
    box-shadow: 0 0 0 1px rgba(152, 84, 241, 0.5);
  }
</style>
