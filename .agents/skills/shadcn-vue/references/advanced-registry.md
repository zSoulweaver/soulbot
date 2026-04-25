---
name: advanced-registry
description: Building and distributing custom component registries with the shadcn-vue registry system.
---

# Custom Component Registry

The shadcn-vue registry system allows you to distribute your own components using the same CLI and schema.

## Setup

### 1. Create registry.json

```json
{
  "$schema": "https://shadcn-vue.com/schema/registry.json",
  "name": "acme",
  "homepage": "https://acme.com",
  "items": []
}
```

### 2. Create a component

Place components in a `registry/[STYLE]/[NAME]/` directory:

```
registry/
└── new-york/
    └── HelloWorld/
        └── HelloWorld.vue
```

```vue
<!-- registry/new-york/HelloWorld/HelloWorld.vue -->
<script setup lang="ts">
import { Button } from "@/components/ui/button"
</script>

<template>
  <Button>Hello World</Button>
</template>
```

### 3. Add to registry.json

```json
{
  "items": [
    {
      "name": "hello-world",
      "type": "registry:block",
      "title": "Hello World",
      "description": "A simple hello world component.",
      "files": [
        {
          "path": "registry/new-york/HelloWorld/HelloWorld.vue",
          "type": "registry:component"
        }
      ]
    }
  ]
}
```

### 4. Build

```bash
npx shadcn-vue@latest build
```

Outputs JSON files to `public/r/` (customizable with `--output`).

### 5. Serve & Install

```bash
# Users install via URL
npx shadcn-vue@latest add https://acme.com/r/hello-world.json
```

## Registry Item Properties

| Property | Required | Description |
|----------|----------|-------------|
| `name` | Yes | Unique identifier (kebab-case) |
| `type` | Yes | `registry:block`, `registry:component`, etc. |
| `title` | Yes | Human-readable name |
| `description` | Yes | Brief description |
| `files` | Yes | Array of file definitions |
| `dependencies` | No | NPM packages (e.g., `["zod", "sonner"]`) |
| `registryDependencies` | No | Other registry items (e.g., `["input", "button"]`) |

## File Types

- `registry:component` - Vue component files
- `registry:block` - Full-page or section blocks
- `registry:lib` - Utility/library files
- `registry:hook` - Composables

## Guidelines

- Use `@/registry` import paths in component code
- List all registry dependencies in `registryDependencies`
- List all npm dependencies in `dependencies` (use `name@version` for specific versions)
- Organize files within registry items using `components/`, `hooks/`, `lib/` directories
- Ensure registry directory is in `tailwind.config.ts` content paths

## Authentication

Add auth by using a `token` query parameter:

```
https://acme.com/r/hello-world.json?token=[SECURE_TOKEN]
```

The CLI handles 401 responses and prompts the user.

<!--
Source references:
- https://www.shadcn-vue.com/docs/registry/getting-started
- https://www.shadcn-vue.com/docs/registry/registry-json
- https://www.shadcn-vue.com/docs/registry/registry-item-json
-->
