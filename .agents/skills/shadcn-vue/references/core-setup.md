---
name: core-setup
description: Project setup, CLI commands, and components.json configuration for shadcn-vue.
---

# Project Setup & CLI

shadcn-vue is a code distribution system for Vue components built on Reka UI and Tailwind CSS. Components are copied into your project (not installed as dependencies) giving you full control over the code.

## CLI Commands

### Initialize a project

```bash
npx shadcn-vue@latest init
```

Options:
- `-b, --base-color <color>` - Base color: `neutral`, `gray`, `zinc`, `stone`, `slate`
- `-y, --yes` - Skip confirmation (default: true)
- `-f, --force` - Force overwrite existing config
- `--css-variables` / `--no-css-variables` - Toggle CSS variable theming (default: true)
- `--src-dir` / `--no-src-dir` - Toggle src directory usage

### Add components

```bash
npx shadcn-vue@latest add [component...]
```

Add specific components:
```bash
npx shadcn-vue@latest add button card dialog
```

Add all components:
```bash
npx shadcn-vue@latest add -a
```

Add from a remote URL:
```bash
npx shadcn-vue@latest add https://acme.com/registry/navbar.json
```

Options:
- `-o, --overwrite` - Overwrite existing files
- `-p, --path <path>` - Custom install path
- `-s, --silent` - Mute output

### Build registry

```bash
npx shadcn-vue@latest build
```

Generates registry JSON files from `registry.json` into `public/r/`.

## components.json

Configuration file for your project. Created by `npx shadcn-vue@latest init`.

```json
{
  "$schema": "https://shadcn-vue.com/schema.json",
  "style": "new-york",
  "typescript": true,
  "tailwind": {
    "config": "",
    "css": "src/assets/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "composables": "@/composables"
  }
}
```

Key points:
- `style` must be `"new-york"` (the `default` style is deprecated)
- `tailwind.config` should be blank for Tailwind CSS v4
- `tailwind.css` points to the CSS file importing Tailwind
- `tailwind.cssVariables` cannot be changed after initialization
- `aliases.ui` controls where UI components are installed
- `aliases.lib` controls where utility functions (like `cn`) are placed
- `aliases.composables` controls where composables (like `useToast`) are placed
- Set `typescript: false` for JavaScript-only `.vue` components

## Utility Function

The `cn` utility merges Tailwind classes using `clsx` and `tailwind-merge`:

```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## valueUpdater Utility

Used with TanStack Table to update Vue refs from updater functions:

```ts
import type { Updater } from '@tanstack/vue-table'
import type { Ref } from 'vue'

export function valueUpdater<T extends Updater<any>>(updaterOrValue: T, ref: Ref) {
  ref.value = typeof updaterOrValue === 'function'
    ? updaterOrValue(ref.value)
    : updaterOrValue
}
```

<!--
Source references:
- https://www.shadcn-vue.com/docs/cli
- https://www.shadcn-vue.com/docs/components-json
- https://www.shadcn-vue.com/docs/installation
-->
