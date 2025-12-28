<script lang="ts">
  import { filesStore, activeFilePathStore } from "$lib/stores/files";
  import FileIcon from "./FileIcon.svelte";

  let tabsContainer: HTMLDivElement;
  let showLeftArrow = $state(false);
  let showRightArrow = $state(false);


  function handleTabClick(path: string) {
    activeFilePathStore.set(path);
  }

  function handleCloseTab(e: MouseEvent, path: string) {
    e.stopPropagation();
    filesStore.closeFile(path);
    if ($activeFilePathStore === path) {
      const remaining = $filesStore.filter((f) => f.path !== path);
      activeFilePathStore.set(remaining.length > 0 ? remaining[0].path : null);
    }
  }

  function updateArrows() {
    if (!tabsContainer) return;
    showLeftArrow = tabsContainer.scrollLeft > 0;
    showRightArrow = tabsContainer.scrollLeft < tabsContainer.scrollWidth - tabsContainer.clientWidth - 1;
  }

  function scrollLeft() {
    if (tabsContainer) {
      tabsContainer.scrollLeft -= 200;
      updateArrows();
    }
  }

  function scrollRight() {
    if (tabsContainer) {
      tabsContainer.scrollLeft += 200;
      updateArrows();
    }
  }

  function handleWheel(e: WheelEvent) {
    if (tabsContainer) {
      e.preventDefault();
      // Use deltaX for horizontal scroll, fallback to deltaY * 3 for vertical wheel
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY * 3;
      tabsContainer.scrollLeft += delta;
      updateArrows();
    }
  }

  $effect(() => {
    // Update arrows when files change
    $filesStore;
    setTimeout(updateArrows, 50);
  });
</script>

<div class="tabs-bar">
  {#if showLeftArrow}
    <button class="scroll-btn left" onclick={scrollLeft} title="Scroll left">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    </button>
  {/if}

  <div
    class="tabs-scroll"
    bind:this={tabsContainer}
    onscroll={updateArrows}
    onwheel={handleWheel}
    role="tablist"
  >
    {#each $filesStore as file (file.path)}
      <div
        class="tab"
        class:active={$activeFilePathStore === file.path}
        class:dirty={file.isDirty}
        onclick={() => handleTabClick(file.path)}
        onkeydown={(e) => e.key === 'Enter' && handleTabClick(file.path)}
        role="tab"
        tabindex="0"
        aria-selected={$activeFilePathStore === file.path}
        title={file.path}
      >
        <span class="icon">
          <FileIcon name={file.name} isFolder={false} size={16} />
        </span>
        <span class="tab-text">{file.name}</span>
        {#if file.isDirty}
          <span class="dirty-indicator">●</span>
        {:else}
          <button
            class="close-btn"
            onclick={(e) => handleCloseTab(e, file.path)}
            title="Close"
            aria-label="Close tab"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        {/if}
        {#if file.isDirty}
          <button
            class="close-btn dirty-close"
            onclick={(e) => handleCloseTab(e, file.path)}
            title="Close (unsaved)"
            aria-label="Close tab"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        {/if}
      </div>
    {/each}
  </div>

  {#if showRightArrow}
    <button class="scroll-btn right" onclick={scrollRight} title="Scroll right">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </button>
  {/if}

  {#if $filesStore.length > 0}
    <button class="tabs-menu-btn" title="Show all tabs">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>
  {/if}
</div>

<style>
  .tabs-bar {
    display: flex;
    align-items: center;
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border);
    height: var(--tab-height, 36px);
    max-height: var(--tab-height, 36px);
    overflow: hidden;
    position: relative;
  }

  .tabs-scroll {
    display: flex;
    overflow-x: auto;
    flex: 1;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .tabs-scroll::-webkit-scrollbar {
    display: none;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 8px 0 10px;
    height: 100%;
    background: transparent;
    border-right: 1px solid var(--border);
    color: var(--text-muted);
    white-space: nowrap;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.1s;
  }

  .tab:hover {
    background: var(--bg-hover);
    color: var(--text-secondary);
  }

  .tab.active {
    background: var(--bg-primary);
    color: var(--text-primary);
    border-bottom: 2px solid var(--accent);
    margin-bottom: -1px;
  }

  .tab.dirty .tab-text {
    font-style: italic;
  }

  .icon {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .tab-text {
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
  }

  .dirty-indicator {
    color: var(--warning, #f59e0b);
    font-size: 8px;
    margin-left: -2px;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3px;
    border-radius: 4px;
    opacity: 0;
    transition: all 0.1s;
    color: var(--text-muted);
    background: transparent;
    border: none;
    cursor: pointer;
  }

  .tab:hover .close-btn {
    opacity: 1;
  }

  .tab.dirty .dirty-indicator {
    display: block;
  }

  .tab.dirty .close-btn.dirty-close {
    display: none;
  }

  .tab.dirty:hover .dirty-indicator {
    display: none;
  }

  .tab.dirty:hover .close-btn.dirty-close {
    display: flex;
    opacity: 1;
  }

  .close-btn:hover {
    background: var(--bg-active);
    color: var(--text-primary);
  }

  .scroll-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 100%;
    background: var(--bg-tertiary);
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.1s;
  }

  .scroll-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .scroll-btn.left {
    border-right: 1px solid var(--border);
  }

  .scroll-btn.right {
    border-left: 1px solid var(--border);
  }

  .tabs-menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 100%;
    background: var(--bg-tertiary);
    border: none;
    border-left: 1px solid var(--border);
    color: var(--text-muted);
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.1s;
  }

  .tabs-menu-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
</style>
