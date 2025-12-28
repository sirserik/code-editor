<script lang="ts">
  import { onMount } from "svelte";

  interface MenuItem {
    label: string;
    icon?: string;
    action: () => void;
    separator?: boolean;
    disabled?: boolean;
  }

  interface Props {
    x: number;
    y: number;
    items: MenuItem[];
    onClose: () => void;
  }

  let { x, y, items, onClose }: Props = $props();
  let menuEl: HTMLDivElement;

  function handleClick(item: MenuItem) {
    if (!item.disabled) {
      item.action();
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    }
  }

  onMount(() => {
    // Adjust position if menu would go off screen
    const rect = menuEl.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menuEl.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menuEl.style.top = `${y - rect.height}px`;
    }

    // Focus menu for keyboard navigation
    menuEl.focus();

    // Close on outside click
    function handleOutsideClick(e: MouseEvent) {
      if (!menuEl.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleKeydown);

    return () => {
      document.removeEventListener("click", handleOutsideClick);
      document.removeEventListener("keydown", handleKeydown);
    };
  });
</script>

<div
  class="context-menu"
  style="left: {x}px; top: {y}px"
  bind:this={menuEl}
  role="menu"
  tabindex="-1"
>
  {#each items as item}
    {#if item.separator}
      <div class="separator"></div>
    {:else}
      <button
        class="menu-item"
        class:disabled={item.disabled}
        onclick={() => handleClick(item)}
        role="menuitem"
        disabled={item.disabled}
      >
        {#if item.icon}
          <span class="icon">{item.icon}</span>
        {/if}
        <span class="label">{item.label}</span>
      </button>
    {/if}
  {/each}
</div>

<style>
  .context-menu {
    position: fixed;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    padding: 4px 0;
    min-width: 160px;
    z-index: 1000;
    outline: none;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 12px;
    text-align: left;
    font-size: 13px;
    color: var(--text-primary);
    transition: background 0.1s;
  }

  .menu-item:hover:not(.disabled) {
    background: var(--bg-hover);
  }

  .menu-item.disabled {
    color: var(--text-muted);
    cursor: not-allowed;
  }

  .icon {
    width: 16px;
    text-align: center;
  }

  .separator {
    height: 1px;
    background: var(--border);
    margin: 4px 0;
  }
</style>
