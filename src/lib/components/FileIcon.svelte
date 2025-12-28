<script lang="ts">
  import { settingsStore } from "$lib/stores/settings";

  interface Props {
    name: string;
    isDirectory?: boolean;
    isExpanded?: boolean;
    size?: number;
  }

  let { name, isDirectory = false, isExpanded = false, size = 18 }: Props = $props();

  let isDarkTheme = $derived($settingsStore.theme === "dark");

  function getFolderColor(folderName: string): { main: string; dark: string } {
    const colors: Record<string, { main: string; dark: string }> = {
      // Source folders - blue
      src: { main: "#4a90d9", dark: "#3b73ae" },
      lib: { main: "#4a90d9", dark: "#3b73ae" },
      app: { main: "#4a90d9", dark: "#3b73ae" },
      core: { main: "#4a90d9", dark: "#3b73ae" },

      // Components/Views - purple
      components: { main: "#9c6ade", dark: "#7b53b2" },
      pages: { main: "#9c6ade", dark: "#7b53b2" },
      views: { main: "#9c6ade", dark: "#7b53b2" },
      layouts: { main: "#9c6ade", dark: "#7b53b2" },
      View: { main: "#9c6ade", dark: "#7b53b2" },

      // Helpers/Utils - orange
      hooks: { main: "#e8a54b", dark: "#c4893e" },
      utils: { main: "#e8a54b", dark: "#c4893e" },
      helpers: { main: "#e8a54b", dark: "#c4893e" },
      Helpers: { main: "#e8a54b", dark: "#c4893e" },

      // API/Services - green
      api: { main: "#5cae5c", dark: "#4a8c4a" },
      services: { main: "#5cae5c", dark: "#4a8c4a" },
      Services: { main: "#5cae5c", dark: "#4a8c4a" },
      controllers: { main: "#5cae5c", dark: "#4a8c4a" },
      Controllers: { main: "#5cae5c", dark: "#4a8c4a" },
      Http: { main: "#5cae5c", dark: "#4a8c4a" },
      Console: { main: "#5cae5c", dark: "#4a8c4a" },
      Providers: { main: "#5cae5c", dark: "#4a8c4a" },

      // Models/Database - brown/amber
      models: { main: "#c49a6c", dark: "#a37f58" },
      Models: { main: "#c49a6c", dark: "#a37f58" },
      database: { main: "#c49a6c", dark: "#a37f58" },
      migrations: { main: "#c49a6c", dark: "#a37f58" },

      // Types - cyan
      types: { main: "#4eb8c4", dark: "#3e949d" },
      interfaces: { main: "#4eb8c4", dark: "#3e949d" },
      Traits: { main: "#4eb8c4", dark: "#3e949d" },

      // Styles - pink
      styles: { main: "#d36086", dark: "#a94d6b" },
      css: { main: "#d36086", dark: "#a94d6b" },
      scss: { main: "#d36086", dark: "#a94d6b" },

      // Assets/Resources - teal
      assets: { main: "#6aa3a3", dark: "#558282" },
      images: { main: "#6aa3a3", dark: "#558282" },
      resources: { main: "#6aa3a3", dark: "#558282" },

      // Public/Static - teal lighter
      public: { main: "#5a9e9e", dark: "#487e7e" },
      static: { main: "#5a9e9e", dark: "#487e7e" },

      // Config - gray blue
      config: { main: "#7b8c9d", dark: "#626f7d" },
      bootstrap: { main: "#7b8c9d", dark: "#626f7d" },

      // Tests - red
      test: { main: "#d95c5c", dark: "#ae4a4a" },
      tests: { main: "#d95c5c", dark: "#ae4a4a" },
      __tests__: { main: "#d95c5c", dark: "#ae4a4a" },

      // Dependencies - green (special)
      node_modules: { main: "#7cb342", dark: "#639035" },
      vendor: { main: "#7cb342", dark: "#639035" },

      // Build output - brown
      dist: { main: "#9e7a54", dark: "#7e6243" },
      build: { main: "#9e7a54", dark: "#7e6243" },

      // Docs - blue light
      docs: { main: "#5ba3d9", dark: "#4982ae" },

      // Docker - blue
      docker: { main: "#4a90d9", dark: "#3b73ae" },

      // Scripts - amber
      scripts: { main: "#e8a54b", dark: "#c4893e" },

      // Routes - green
      routes: { main: "#5cae5c", dark: "#4a8c4a" },

      // Store - purple
      store: { main: "#9575cd", dark: "#775eb0" },
      stores: { main: "#9575cd", dark: "#775eb0" },
      storage: { main: "#7b8c9d", dark: "#626f7d" },

      // Lang - cyan
      lang: { main: "#4eb8c4", dark: "#3e949d" },

      // JS folder - yellow
      js: { main: "#e8c54b", dark: "#c4a73e" },

      // Hidden/special
      ".claude": { main: "#7b8c9d", dark: "#626f7d" },
      ".git": { main: "#f05032", dark: "#c03e28" },
    };

    const lowerName = folderName.toLowerCase();
    return colors[folderName] || colors[lowerName] || { main: "#8c9bab", dark: "#707c8a" };
  }

  type IconType = "js" | "ts" | "jsx" | "tsx" | "html" | "css" | "scss" | "json" | "md" | "py" | "rust" | "go" | "php" | "vue" | "svelte" | "java" | "ruby" | "swift" | "kotlin" | "c" | "cpp" | "csharp" | "shell" | "sql" | "docker" | "git" | "env" | "yaml" | "xml" | "image" | "svg" | "lock" | "npm" | "config" | "file";

  function getFileType(fileName: string): { type: IconType; color: string } {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const lowerName = fileName.toLowerCase();

    // Special files
    if (lowerName === "package.json" || lowerName === "package-lock.json") return { type: "npm", color: "#cb3837" };
    if (lowerName === "tsconfig.json") return { type: "ts", color: "#3178c6" };
    if (lowerName === "jsconfig.json") return { type: "js", color: "#f7df1e" };
    if (lowerName.startsWith(".git")) return { type: "git", color: "#f05032" };
    if (lowerName === "dockerfile" || lowerName.startsWith("docker-compose")) return { type: "docker", color: "#2496ed" };
    if (lowerName.startsWith(".env")) return { type: "env", color: "#ecd53f" };
    if (lowerName === "cargo.toml" || lowerName === "cargo.lock") return { type: "rust", color: "#dea584" };
    if (lowerName === "go.mod" || lowerName === "go.sum") return { type: "go", color: "#00add8" };
    if (lowerName === "gemfile" || lowerName === "gemfile.lock") return { type: "ruby", color: "#cc342d" };
    if (lowerName === "composer.json" || lowerName === "composer.lock") return { type: "php", color: "#777bb4" };
    if (lowerName.includes("vite.config") || lowerName.includes("webpack.config") || lowerName.includes("rollup.config")) return { type: "config", color: "#ffb74d" };
    if (lowerName.includes("eslint") || lowerName.includes("prettier")) return { type: "config", color: "#4b32c3" };
    if (lowerName.endsWith(".lock")) return { type: "lock", color: "#6d8086" };
    if (lowerName === "readme.md") return { type: "md", color: "#42a5f5" };

    // By extension
    const extMap: Record<string, { type: IconType; color: string }> = {
      js: { type: "js", color: "#f7df1e" },
      mjs: { type: "js", color: "#f7df1e" },
      cjs: { type: "js", color: "#f7df1e" },
      jsx: { type: "jsx", color: "#61dafb" },
      ts: { type: "ts", color: "#3178c6" },
      mts: { type: "ts", color: "#3178c6" },
      tsx: { type: "tsx", color: "#3178c6" },
      html: { type: "html", color: "#e44d26" },
      htm: { type: "html", color: "#e44d26" },
      css: { type: "css", color: "#1572b6" },
      scss: { type: "scss", color: "#cc6699" },
      sass: { type: "scss", color: "#cc6699" },
      less: { type: "css", color: "#1d365d" },
      json: { type: "json", color: "#cbcb41" },
      yaml: { type: "yaml", color: "#cb171e" },
      yml: { type: "yaml", color: "#cb171e" },
      toml: { type: "config", color: "#9c4121" },
      xml: { type: "xml", color: "#e37933" },
      md: { type: "md", color: "#42a5f5" },
      mdx: { type: "md", color: "#42a5f5" },
      py: { type: "py", color: "#3776ab" },
      pyw: { type: "py", color: "#3776ab" },
      rs: { type: "rust", color: "#dea584" },
      go: { type: "go", color: "#00add8" },
      php: { type: "php", color: "#777bb4" },
      rb: { type: "ruby", color: "#cc342d" },
      java: { type: "java", color: "#e76f00" },
      kt: { type: "kotlin", color: "#7f52ff" },
      swift: { type: "swift", color: "#f05138" },
      c: { type: "c", color: "#a8b9cc" },
      h: { type: "c", color: "#a8b9cc" },
      cpp: { type: "cpp", color: "#00599c" },
      cc: { type: "cpp", color: "#00599c" },
      hpp: { type: "cpp", color: "#00599c" },
      cs: { type: "csharp", color: "#512bd4" },
      sh: { type: "shell", color: "#4eaa25" },
      bash: { type: "shell", color: "#4eaa25" },
      zsh: { type: "shell", color: "#4eaa25" },
      sql: { type: "sql", color: "#336791" },
      vue: { type: "vue", color: "#42b883" },
      svelte: { type: "svelte", color: "#ff3e00" },
      svg: { type: "svg", color: "#ffb13b" },
      png: { type: "image", color: "#a77b44" },
      jpg: { type: "image", color: "#a77b44" },
      jpeg: { type: "image", color: "#a77b44" },
      gif: { type: "image", color: "#a77b44" },
      webp: { type: "image", color: "#a77b44" },
      ico: { type: "image", color: "#a77b44" },
    };

    return extMap[ext] || { type: "file", color: "#90a4ae" };
  }

  let folderColors = $derived(getFolderColor(name));
  let fileInfo = $derived(getFileType(name));
</script>

<span class="icon-wrapper" class:light={!isDarkTheme}>
{#if isDirectory}
  <!-- Folder icon - very distinct open/closed styles -->
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="folder-grad-{name}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color={folderColors.main}/>
        <stop offset="100%" stop-color={folderColors.dark}/>
      </linearGradient>
    </defs>
    {#if isExpanded}
      <!-- OPEN folder - completely different shape -->
      <!-- Folder back/tab -->
      <path d="M2 6a2 2 0 012-2h4l2 2h10a2 2 0 012 2v2H2V6z" fill={folderColors.dark}/>
      <!-- Open front - angled/3D perspective -->
      <path d="M1 10l2-1h18l2 1-3 10H4L1 10z" fill="url(#folder-grad-{name})"/>
      <!-- Bright edge highlight -->
      <path d="M3 9h18" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/>
      <!-- Papers inside -->
      <rect x="6" y="5" width="8" height="1" rx="0.5" fill="rgba(255,255,255,0.5)"/>
      <rect x="7" y="6.5" width="6" height="1" rx="0.5" fill="rgba(255,255,255,0.3)"/>
    {:else}
      <!-- CLOSED folder - flat rectangle -->
      <path d="M3 6a2 2 0 012-2h4l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" fill="url(#folder-grad-{name})"/>
      <!-- Tab at top -->
      <path d="M3 6a2 2 0 012-2h4l2 2H3z" fill={folderColors.main} opacity="0.5"/>
    {/if}
  </svg>
{:else}
  <!-- File icons - PhpStorm style badges -->
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {#if fileInfo.type === "js"}
      <!-- JavaScript -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#f7df1e"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="700" fill="#000">JS</text>
    {:else if fileInfo.type === "ts"}
      <!-- TypeScript -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#3178c6"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="700" fill="#fff">TS</text>
    {:else if fileInfo.type === "jsx" || fileInfo.type === "tsx"}
      <!-- React -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill={fileInfo.type === "tsx" ? "#3178c6" : "#61dafb"}/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="7" font-weight="700" fill={fileInfo.type === "tsx" ? "#fff" : "#000"}>{fileInfo.type === "tsx" ? "TSX" : "JSX"}</text>
    {:else if fileInfo.type === "html"}
      <!-- HTML -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#e44d26"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="7" font-weight="700" fill="#fff">HTML</text>
    {:else if fileInfo.type === "css"}
      <!-- CSS -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#264de4"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="700" fill="#fff">CSS</text>
    {:else if fileInfo.type === "scss"}
      <!-- Sass/SCSS -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#cc6699"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="7" font-weight="700" fill="#fff">SCSS</text>
    {:else if fileInfo.type === "json"}
      <!-- JSON -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#cbcb41"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="7" font-weight="700" fill="#000">JSON</text>
    {:else if fileInfo.type === "md"}
      <!-- Markdown -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#42a5f5"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="700" fill="#fff">MD</text>
    {:else if fileInfo.type === "py"}
      <!-- Python -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#3776ab"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="700" fill="#ffd43b">PY</text>
    {:else if fileInfo.type === "rust"}
      <!-- Rust -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#dea584"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="700" fill="#000">RS</text>
    {:else if fileInfo.type === "go"}
      <!-- Go -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#00add8"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="700" fill="#fff">GO</text>
    {:else if fileInfo.type === "php"}
      <!-- PHP -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#777bb4"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="700" fill="#fff">php</text>
    {:else if fileInfo.type === "vue"}
      <!-- Vue -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#42b883"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="700" fill="#fff">Vue</text>
    {:else if fileInfo.type === "svelte"}
      <!-- Svelte -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#ff3e00"/>
      <text x="12" y="14" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="6" font-weight="700" fill="#fff">Svelte</text>
    {:else if fileInfo.type === "java"}
      <!-- Java -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#e76f00"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="7" font-weight="700" fill="#fff">Java</text>
    {:else if fileInfo.type === "ruby"}
      <!-- Ruby -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#cc342d"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="700" fill="#fff">RB</text>
    {:else if fileInfo.type === "swift"}
      <!-- Swift -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#f05138"/>
      <text x="12" y="14" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="6" font-weight="700" fill="#fff">Swift</text>
    {:else if fileInfo.type === "kotlin"}
      <!-- Kotlin -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#7f52ff"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="700" fill="#fff">KT</text>
    {:else if fileInfo.type === "c"}
      <!-- C -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#a8b9cc"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="700" fill="#000">C</text>
    {:else if fileInfo.type === "cpp"}
      <!-- C++ -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#00599c"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="700" fill="#fff">C++</text>
    {:else if fileInfo.type === "csharp"}
      <!-- C# -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#512bd4"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="700" fill="#fff">C#</text>
    {:else if fileInfo.type === "shell"}
      <!-- Shell/Bash -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#4eaa25"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="700" fill="#fff">SH</text>
    {:else if fileInfo.type === "sql"}
      <!-- SQL -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#336791"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="700" fill="#fff">SQL</text>
    {:else if fileInfo.type === "docker"}
      <!-- Docker -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#2496ed"/>
      <text x="12" y="14" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="5" font-weight="700" fill="#fff">Docker</text>
    {:else if fileInfo.type === "git"}
      <!-- Git -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#f05032"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="700" fill="#fff">GIT</text>
    {:else if fileInfo.type === "env"}
      <!-- Environment -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#ecd53f"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="700" fill="#000">ENV</text>
    {:else if fileInfo.type === "yaml"}
      <!-- YAML -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#cb171e"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="7" font-weight="700" fill="#fff">YML</text>
    {:else if fileInfo.type === "xml"}
      <!-- XML -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#e37933"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="700" fill="#fff">XML</text>
    {:else if fileInfo.type === "image"}
      <!-- Image -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#26a69a"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="700" fill="#fff">IMG</text>
    {:else if fileInfo.type === "svg"}
      <!-- SVG -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#ffb13b"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="700" fill="#000">SVG</text>
    {:else if fileInfo.type === "lock"}
      <!-- Lock file -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#6d8086"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="7" font-weight="700" fill="#fff">LOCK</text>
    {:else if fileInfo.type === "npm"}
      <!-- NPM -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#cb3837"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="700" fill="#fff">npm</text>
    {:else if fileInfo.type === "config"}
      <!-- Config -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#78909c"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="7" font-weight="700" fill="#fff">CFG</text>
    {:else}
      <!-- Default file -->
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#90a4ae"/>
      <text x="12" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="700" fill="#fff">FILE</text>
    {/if}
  </svg>
{/if}
</span>

<style>
  .icon-wrapper {
    display: inline-flex;
    flex-shrink: 0;
  }

  .icon-wrapper.light {
    filter: saturate(1.5) brightness(0.75) contrast(1.1);
  }

  svg {
    flex-shrink: 0;
    display: inline-block;
    vertical-align: middle;
  }
</style>
