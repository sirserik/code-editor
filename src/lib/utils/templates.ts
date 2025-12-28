export interface FileTemplate {
  id: string;
  name: string;
  extension: string;
  icon: string;
  color: string;
  template: string;
}

export const fileTemplates: FileTemplate[] = [
  {
    id: "empty",
    name: "Empty File",
    extension: "",
    icon: "FILE",
    color: "#90a4ae",
    template: ""
  },
  {
    id: "js",
    name: "JavaScript",
    extension: ".js",
    icon: "JS",
    color: "#f7df1e",
    template: `// JavaScript file

export function main() {
  console.log('Hello, World!');
}

main();
`
  },
  {
    id: "ts",
    name: "TypeScript",
    extension: ".ts",
    icon: "TS",
    color: "#3178c6",
    template: `// TypeScript file

interface Config {
  name: string;
  version: string;
}

export function main(): void {
  console.log('Hello, TypeScript!');
}

main();
`
  },
  {
    id: "jsx",
    name: "React Component",
    extension: ".jsx",
    icon: "JSX",
    color: "#61dafb",
    template: `import React from 'react';

export default function Component() {
  return (
    <div className="component">
      <h1>Hello, React!</h1>
    </div>
  );
}
`
  },
  {
    id: "tsx",
    name: "React TypeScript",
    extension: ".tsx",
    icon: "TSX",
    color: "#3178c6",
    template: `import React from 'react';

interface Props {
  title?: string;
}

export default function Component({ title = 'Hello' }: Props) {
  return (
    <div className="component">
      <h1>{title}</h1>
    </div>
  );
}
`
  },
  {
    id: "vue",
    name: "Vue Component",
    extension: ".vue",
    icon: "Vue",
    color: "#42b883",
    template: `<` + `template>
  <div class="component">
    <h1>{{ title }}</h1>
  </div>
</` + `template>

<` + `script setup lang="ts">
import { ref } from 'vue';

const title = ref('Hello, Vue!');
</` + `script>

<` + `style scoped>
.component {
  padding: 1rem;
}
</` + `style>
`
  },
  {
    id: "svelte",
    name: "Svelte Component",
    extension: ".svelte",
    icon: "Svelte",
    color: "#ff3e00",
    template: `<` + `script lang="ts">
  let count = $state(0);

  function increment() {
    count++;
  }
</` + `script>

<div class="component">
  <h1>Count: {count}</h1>
  <button onclick={increment}>Increment</button>
</div>

<` + `style>
  .component {
    padding: 1rem;
  }
</` + `style>
`
  },
  {
    id: "php",
    name: "PHP Class",
    extension: ".php",
    icon: "php",
    color: "#777bb4",
    template: `<?php

namespace App;

class ClassName
{
    private string $property;

    public function __construct(string $property = '')
    {
        $this->property = $property;
    }

    public function getProperty(): string
    {
        return $this->property;
    }
}
`
  },
  {
    id: "php-controller",
    name: "Laravel Controller",
    extension: ".php",
    icon: "php",
    color: "#ff2d20",
    template: `<?php

namespace App\\Http\\Controllers;

use Illuminate\\Http\\Request;
use Illuminate\\Http\\JsonResponse;

class Controller extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'message' => 'Success',
            'data' => []
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        return response()->json([
            'message' => 'Created',
            'data' => $validated
        ], 201);
    }
}
`
  },
  {
    id: "py",
    name: "Python Class",
    extension: ".py",
    icon: "PY",
    color: "#3776ab",
    template: `#!/usr/bin/env python3
"""Module docstring."""

class ClassName:
    """Class docstring."""

    def __init__(self, name: str = ""):
        self.name = name

    def greet(self) -> str:
        return f"Hello, {self.name}!"


if __name__ == "__main__":
    obj = ClassName("World")
    print(obj.greet())
`
  },
  {
    id: "html",
    name: "HTML Page",
    extension: ".html",
    icon: "HTML",
    color: "#e44d26",
    template: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <` + `style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; }
  </` + `style>
</head>
<body>
  <main>
    <h1>Hello, World!</h1>
  </main>
</body>
</html>
`
  },
  {
    id: "css",
    name: "CSS Stylesheet",
    extension: ".css",
    icon: "CSS",
    color: "#264de4",
    template: `/* Stylesheet */

:root {
  --primary: #3b82f6;
  --secondary: #64748b;
  --background: #ffffff;
  --text: #1e293b;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: var(--background);
  color: var(--text);
}
`
  },
  {
    id: "json",
    name: "JSON",
    extension: ".json",
    icon: "JSON",
    color: "#cbcb41",
    template: `{
  "name": "",
  "version": "1.0.0",
  "description": ""
}
`
  },
  {
    id: "md",
    name: "Markdown",
    extension: ".md",
    icon: "MD",
    color: "#42a5f5",
    template: `# Title

## Description

Write your content here.

## Features

- Feature 1
- Feature 2
- Feature 3

## Usage

\`\`\`bash
npm install
npm run dev
\`\`\`
`
  },
  {
    id: "rust",
    name: "Rust",
    extension: ".rs",
    icon: "RS",
    color: "#dea584",
    template: `// Rust file

fn main() {
    println!("Hello, Rust!");
}

struct Example {
    name: String,
    value: i32,
}

impl Example {
    fn new(name: &str, value: i32) -> Self {
        Self {
            name: name.to_string(),
            value,
        }
    }
}
`
  },
  {
    id: "go",
    name: "Go",
    extension: ".go",
    icon: "GO",
    color: "#00add8",
    template: `package main

import "fmt"

func main() {
    fmt.Println("Hello, Go!")
}

type Example struct {
    Name  string
    Value int
}

func NewExample(name string, value int) *Example {
    return &Example{
        Name:  name,
        Value: value,
    }
}
`
  }
];
