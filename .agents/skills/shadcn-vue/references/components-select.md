---
name: components-select
description: Select, NativeSelect, Combobox, and Command components for option selection.
---

# Select Components

## Select

```bash
npx shadcn-vue@latest add select
```

Built on Reka UI Select.

```vue
<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
</script>

<template>
  <Select>
    <SelectTrigger class="w-[180px]">
      <SelectValue placeholder="Select a fruit" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectLabel>Fruits</SelectLabel>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="orange">Orange</SelectItem>
      </SelectGroup>
      <SelectSeparator />
      <SelectGroup>
        <SelectLabel>Vegetables</SelectLabel>
        <SelectItem value="carrot">Carrot</SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
```

Use `v-model` or `:model-value` + `@update:model-value` for controlled state.

## NativeSelect

```bash
npx shadcn-vue@latest add native-select
```

A styled native HTML `<select>` element.

```vue
<script setup lang="ts">
import { NativeSelect } from '@/components/ui/native-select'
</script>

<template>
  <NativeSelect v-model="value">
    <option value="apple">Apple</option>
    <option value="banana">Banana</option>
  </NativeSelect>
</template>
```

## Combobox

```bash
npx shadcn-vue@latest add combobox
```

Combobox is built by combining the `Popover` and `Command` components.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { Check, ChevronsUpDown } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const frameworks = [
  { value: 'next.js', label: 'Next.js' },
  { value: 'sveltekit', label: 'SvelteKit' },
  { value: 'nuxt', label: 'Nuxt' },
  { value: 'remix', label: 'Remix' },
  { value: 'astro', label: 'Astro' },
]

const open = ref(false)
const value = ref('')
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        role="combobox"
        :aria-expanded="open"
        class="w-[200px] justify-between"
      >
        {{ value ? frameworks.find(f => f.value === value)?.label : 'Select framework...' }}
        <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-[200px] p-0">
      <Command>
        <CommandInput placeholder="Search framework..." />
        <CommandEmpty>No framework found.</CommandEmpty>
        <CommandList>
          <CommandGroup>
            <CommandItem
              v-for="framework in frameworks"
              :key="framework.value"
              :value="framework.value"
              @select="(ev) => {
                if (typeof ev.detail.value === 'string') {
                  value = ev.detail.value
                }
                open = false
              }"
            >
              <Check :class="cn('mr-2 h-4 w-4', value === framework.value ? 'opacity-100' : 'opacity-0')" />
              {{ framework.label }}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>
```

## Command

```bash
npx shadcn-vue@latest add command
```

A command palette / search interface. Built on Reka UI Combobox.

```vue
<script setup lang="ts">
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
</script>

<template>
  <Command>
    <CommandInput placeholder="Type a command or search..." />
    <CommandList>
      <CommandEmpty>No results found.</CommandEmpty>
      <CommandGroup heading="Suggestions">
        <CommandItem value="calendar">Calendar</CommandItem>
        <CommandItem value="search">Search</CommandItem>
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup heading="Settings">
        <CommandItem value="profile">
          Profile
          <CommandShortcut>⌘P</CommandShortcut>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </Command>
</template>
```

### Command Dialog (⌘K)

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const open = ref(false)

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    open.value = !open.value
  }
}

onMounted(() => document.addEventListener('keydown', handleKeyDown))
onUnmounted(() => document.removeEventListener('keydown', handleKeyDown))
</script>

<template>
  <CommandDialog v-model:open="open">
    <CommandInput placeholder="Type a command or search..." />
    <CommandList>
      <CommandEmpty>No results found.</CommandEmpty>
      <CommandGroup heading="Suggestions">
        <CommandItem value="calendar">Calendar</CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
</template>
```

<!--
Source references:
- https://www.shadcn-vue.com/docs/components/select
- https://www.shadcn-vue.com/docs/components/native-select
- https://www.shadcn-vue.com/docs/components/combobox
- https://www.shadcn-vue.com/docs/components/command
-->
