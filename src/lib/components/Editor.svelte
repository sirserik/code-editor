<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { EditorView, Decoration, type DecorationSet, hoverTooltip, type Tooltip } from "@codemirror/view";
  import { StateField, StateEffect } from "@codemirror/state";
  import { createEditorState, fontSizeCompartment, createFontSizeExtension, loadLanguageAsync, updateTheme } from "$lib/codemirror/setup";
  import { settingsStore } from "$lib/stores/settings";
  import { filesStore, searchHighlightStore, projectRootStore, activeFilePathStore, getLanguageFromPath } from "$lib/stores/files";
  import type { OpenFile } from "$lib/stores/files";
  import { writeFile, messageDialog, readFileChunk, readFile, readFileSmart, lspGoToDefinition, lspHover, lspFormatDocument } from "$lib/utils/ipc";
  import { ensureLspStarted, notifyFileOpen, debouncedNotifyFileChange, createLspCompletionSource, createEmmetTabExpansion, createLspHoverExtension } from "$lib/codemirror/lsp-completion";
  import FindReplace from "./FindReplace.svelte";

  interface Props {
    file: OpenFile;
  }

  let { file }: Props = $props();

  let editorContainer: HTMLDivElement;
  let view: EditorView | null = null;
  let showFindReplace = $state(false);

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

  // Create Emmet Tab expansion extension
  const emmetExtension = createEmmetTabExpansion(file.language);

  // Create LSP Hover extension
  const hoverExtension = createLspHoverExtension(() => ({
    path: file.path,
    language: file.language,
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

  function scrollToPosition(lineNumber: number, column: number) {
    if (!view) return;

    const line = view.state.doc.line(Math.min(lineNumber + 1, view.state.doc.lines));
    const pos = line.from + column;

    view.dispatch({
      selection: { anchor: pos },
      scrollIntoView: true,
      effects: EditorView.scrollIntoView(pos, { y: "center" }),
    });

    view.focus();
  }

  // Go to Definition
  async function goToDefinition() {
    if (!view) return;

    const pos = view.state.selection.main.head;
    const line = view.state.doc.lineAt(pos);
    const lineNumber = line.number - 1; // 0-indexed for LSP
    const column = pos - line.from;

    try {
      const result = await lspGoToDefinition(file.language, file.path, lineNumber, column);
      if (result) {
        if (result.path === file.path) {
          // Same file - just scroll
          scrollToPosition(result.line, result.column);
        } else {
          // Different file - open it
          const content = await readFileSmart(result.path);
          const name = result.path.split("/").pop() || result.path;
          filesStore.openFile({
            path: result.path,
            name,
            content: content.content,
            language: getLanguageFromPath(result.path),
            isDirty: false,
            cursorPosition: { line: result.line + 1, column: result.column + 1 },
            isPartial: content.is_partial,
            totalLines: content.total_lines,
            loadedLines: content.loaded_lines,
            totalSize: content.total_size,
          });
          activeFilePathStore.set(result.path);
        }
      }
    } catch (err) {
      console.debug("Go to definition failed:", err);
    }
  }

  // Format Document
  async function formatDocument() {
    if (!view) return;

    try {
      const edits = await lspFormatDocument(
        file.language,
        file.path,
        $settingsStore.tabSize || 2,
        $settingsStore.insertSpaces !== false
      );

      if (edits.length > 0) {
        // Apply edits in reverse order to preserve positions
        const sortedEdits = [...edits].sort((a, b) => {
          if (a.start_line !== b.start_line) return b.start_line - a.start_line;
          return b.start_col - a.start_col;
        });

        for (const edit of sortedEdits) {
          const startLine = view.state.doc.line(edit.start_line + 1);
          const endLine = view.state.doc.line(edit.end_line + 1);
          const from = startLine.from + edit.start_col;
          const to = endLine.from + edit.end_col;

          view.dispatch({
            changes: { from, to, insert: edit.new_text },
          });
        }

        filesStore.markDirty(file.path);
      }
    } catch (err) {
      console.debug("Format failed:", err);
    }
  }

  // Handle content change from Find & Replace
  function handleContentChange(newContent: string) {
    if (!view) return;

    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: newContent,
      },
    });

    filesStore.updateContent(file.path, newContent);
    filesStore.markDirty(file.path);
  }

  // Navigate to match from Find & Replace
  function handleNavigateToMatch(line: number, column: number) {
    scrollToPosition(line, column);
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
      emmetExtension: emmetExtension,
      hoverExtension: hoverExtension,
    });

    // Add highlight field extension
    const stateWithHighlight = state.update({
      effects: StateEffect.appendConfig.of([highlightField]),
    }).state;

    view = new EditorView({
      state: stateWithHighlight,
      parent: editorContainer,
    });

    // Load language extension asynchronously (for lazy loading)
    loadLanguageAsync(view, file.language);

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

    // Add keyboard shortcuts
    const handleKeydown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Save (Cmd+S)
      if (modKey && e.key === "s") {
        e.preventDefault();
        handleSave();
      }

      // Find (Cmd+F)
      if (modKey && e.key === "f" && !e.shiftKey) {
        e.preventDefault();
        showFindReplace = true;
      }

      // Go to Definition (F12)
      if (e.key === "F12") {
        e.preventDefault();
        goToDefinition();
      }

      // Format Document (Alt+Shift+F)
      if (e.altKey && e.shiftKey && e.key === "f") {
        e.preventDefault();
        formatDocument();
      }

      // Clear highlights and close Find on Escape
      if (e.key === "Escape") {
        if (showFindReplace) {
          showFindReplace = false;
        } else if (view) {
          searchHighlightStore.set("");
          view.dispatch({
            effects: setSearchHighlight.of(""),
          });
        }
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

  // React to theme changes (skip initial mount to avoid flash)
  let initialTheme = $settingsStore.theme;
  let lastTheme = initialTheme;

  $effect(() => {
    const theme = $settingsStore.theme;
    if (view && theme !== lastTheme) {
      updateTheme(view, theme);
      lastTheme = theme;
    }
  });

  // Large file handling
  let isLoadingMore = $state(false);

  async function loadMoreContent() {
    if (!file.isPartial || isLoadingMore) return;

    isLoadingMore = true;
    try {
      const startLine = (file.loadedLines || 0) + 1;
      const chunk = await readFileChunk(file.path, startLine, 1000);

      if (view && chunk.content) {
        // Append content to editor
        const currentContent = view.state.doc.toString();
        view.dispatch({
          changes: {
            from: currentContent.length,
            insert: "\n" + chunk.content,
          },
        });
        filesStore.appendContent(file.path, chunk.content, chunk.end_line);
      }
    } catch (err) {
      console.error("Failed to load more content:", err);
    }
    isLoadingMore = false;
  }

  async function loadEntireFile() {
    if (!file.isPartial || isLoadingMore) return;

    isLoadingMore = true;
    try {
      const content = await readFile(file.path);
      if (view) {
        view.dispatch({
          changes: {
            from: 0,
            to: view.state.doc.length,
            insert: content,
          },
        });
        filesStore.appendContent(file.path, "", file.totalLines || 0);
        filesStore.markFullyLoaded(file.path);
      }
    } catch (err) {
      console.error("Failed to load entire file:", err);
    }
    isLoadingMore = false;
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }
</script>

<div class="editor-container">
  {#if showFindReplace}
    <FindReplace
      content={view?.state.doc.toString() || file.content}
      onContentChange={handleContentChange}
      onNavigateToMatch={handleNavigateToMatch}
      onClose={() => showFindReplace = false}
    />
  {/if}

  <div class="editor-wrapper" bind:this={editorContainer}></div>

  {#if file.isPartial}
    <div class="large-file-banner">
      <span class="warning-icon">⚠️</span>
      <span class="message">
        Large file ({formatSize(file.totalSize || 0)}) - showing {file.loadedLines?.toLocaleString()} of {file.totalLines?.toLocaleString()} lines
      </span>
      <button class="load-btn" onclick={loadMoreContent} disabled={isLoadingMore}>
        {#if isLoadingMore}
          Loading...
        {:else}
          Load 1000 more
        {/if}
      </button>
      <button class="load-btn load-all" onclick={loadEntireFile} disabled={isLoadingMore}>
        Load entire file
      </button>
    </div>
  {/if}
</div>

<style>
  .editor-container {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .editor-wrapper {
    flex: 1;
    width: 100%;
    overflow: hidden;
    background: var(--bg-primary);
  }

  .editor-wrapper :global(.cm-editor) {
    height: 100%;
  }

  .editor-wrapper :global(.cm-scroller) {
    overflow: auto;
  }

  .large-file-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: #1f2937;
    font-size: 13px;
    font-weight: 500;
  }

  .warning-icon {
    font-size: 16px;
  }

  .message {
    flex: 1;
  }

  .load-btn {
    padding: 6px 14px;
    background: rgba(0, 0, 0, 0.2);
    color: white;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    transition: background 0.15s;
  }

  .load-btn:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.3);
  }

  .load-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .load-btn.load-all {
    background: rgba(0, 0, 0, 0.4);
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
