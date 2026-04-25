---
name: core-theming
description: CSS variables, color conventions, dark mode setup, and custom color creation for shadcn-vue.
---

# Theming & Dark Mode

## Color Convention

shadcn-vue uses a `background` / `foreground` naming convention:

```vue
<div class="bg-primary text-primary-foreground">Hello</div>
```

- `--primary` is the background color
- `--primary-foreground` is the text color used on that background

## CSS Variables (Recommended)

Define colors in your CSS file using oklch format:

```css
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.269 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.371 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}
```

Base color options: `neutral`, `gray`, `zinc`, `stone`, `slate`.

## Adding Custom Colors

1. Define CSS variables for both light and dark modes:

```css
:root {
  --warning: oklch(0.84 0.16 84);
  --warning-foreground: oklch(0.28 0.07 46);
}

.dark {
  --warning: oklch(0.41 0.11 46);
  --warning-foreground: oklch(0.99 0.02 95);
}
```

2. Register with Tailwind CSS v4 using `@theme inline`:

```css
@theme inline {
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
}
```

3. Use in components:

```vue
<div class="bg-warning text-warning-foreground" />
```

## Dark Mode Setup

### Vite

Use `@vueuse/core` `useColorMode`:

```ts
// composables/useColorMode.ts
import { useColorMode as useColorModeVueUse } from '@vueuse/core'

export function useColorMode() {
  return useColorModeVueUse({ emitAuto: true })
}
```

Toggle button:

```vue
<script setup lang="ts">
import { useColorMode } from '@/composables/useColorMode'
const mode = useColorMode()
</script>

<template>
  <Button @click="mode = mode === 'dark' ? 'light' : 'dark'" variant="outline" size="icon">
    <Sun class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
    <Moon class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
  </Button>
</template>
```

### Nuxt

Use `@nuxtjs/color-mode` module:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/color-mode'],
  colorMode: { classSuffix: '' },
})
```

```vue
<script setup lang="ts">
const colorMode = useColorMode()
</script>

<template>
  <Button @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'">
    Toggle
  </Button>
</template>
```

<!--
Source references:
- https://www.shadcn-vue.com/docs/theming
- https://www.shadcn-vue.com/docs/dark-mode
-->
