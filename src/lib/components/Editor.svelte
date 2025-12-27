<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { EditorView } from "@codemirror/view";
  import { createEditorState } from "$lib/codemirror/setup";
  import { settingsStore } from "$lib/stores/settings";
  import { filesStore } from "$lib/stores/files";
  import type { OpenFile } from "$lib/stores/files";
  import { writeFile } from "$lib/utils/ipc";

  interface Props {
    file: OpenFile;
  }

  let { file }: Props = $props();

  let editorContainer: HTMLDivElement;
  let view: EditorView | null = null;

  function handleChange(content: string) {
    filesStore.updateContent(file.path, content);
  }

  function handleCursorChange(line: number, column: number) {
    filesStore.updateCursor(file.path, line, column);
  }

  async function handleSave() {
    try {
      await writeFile(file.path, file.content);
      filesStore.markSaved(file.path);
    } catch (err) {
      console.error("Failed to save file:", err);
    }
  }

  onMount(() => {
    const state = createEditorState(file.content, {
      language: file.language,
      settings: $settingsStore,
      onChange: handleChange,
      onCursorChange: handleCursorChange,
    });

    view = new EditorView({
      state,
      parent: editorContainer,
    });

    // Add save keybinding
    const handleKeydown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      if (modKey && e.key === "s") {
        e.preventDefault();
        handleSave();
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
</style>
