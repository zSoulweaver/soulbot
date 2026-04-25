---
name: components-selection-controls
description: Checkbox, RadioGroup, Switch, Toggle, ToggleGroup, and Slider components.
---

# Selection Controls

## Checkbox

```bash
npx shadcn-vue@latest add checkbox
```

Built on Reka UI Checkbox.

```vue
<script setup lang="ts">
import { Checkbox } from '@/components/ui/checkbox'
</script>

<template>
  <div class="flex items-center space-x-2">
    <Checkbox id="terms" />
    <Label for="terms">Accept terms and conditions</Label>
  </div>
</template>
```

Supports `v-model` with `boolean` or `'indeterminate'` values.

## RadioGroup

```bash
npx shadcn-vue@latest add radio-group
```

Built on Reka UI RadioGroup.

```vue
<script setup lang="ts">
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
</script>

<template>
  <RadioGroup default-value="option-one">
    <div class="flex items-center space-x-2">
      <RadioGroupItem id="option-one" value="option-one" />
      <Label for="option-one">Option One</Label>
    </div>
    <div class="flex items-center space-x-2">
      <RadioGroupItem id="option-two" value="option-two" />
      <Label for="option-two">Option Two</Label>
    </div>
  </RadioGroup>
</template>
```

## Switch

```bash
npx shadcn-vue@latest add switch
```

Built on Reka UI Switch.

```vue
<script setup lang="ts">
import { Switch } from '@/components/ui/switch'
</script>

<template>
  <div class="flex items-center space-x-2">
    <Switch id="airplane-mode" />
    <Label for="airplane-mode">Airplane Mode</Label>
  </div>
</template>
```

## Toggle

```bash
npx shadcn-vue@latest add toggle
```

Built on Reka UI Toggle.

```vue
<script setup lang="ts">
import { Toggle } from '@/components/ui/toggle'
</script>

<template>
  <Toggle aria-label="Toggle italic">
    <Bold class="h-4 w-4" />
  </Toggle>
</template>
```

Variants: `variant` (`default`, `outline`), `size` (`default`, `sm`, `lg`).

## ToggleGroup

```bash
npx shadcn-vue@latest add toggle-group
```

Built on Reka UI ToggleGroup.

```vue
<script setup lang="ts">
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
</script>

<template>
  <ToggleGroup type="multiple">
    <ToggleGroupItem value="bold" aria-label="Toggle bold">
      <Bold class="h-4 w-4" />
    </ToggleGroupItem>
    <ToggleGroupItem value="italic" aria-label="Toggle italic">
      <Italic class="h-4 w-4" />
    </ToggleGroupItem>
    <ToggleGroupItem value="underline" aria-label="Toggle underline">
      <Underline class="h-4 w-4" />
    </ToggleGroupItem>
  </ToggleGroup>
</template>
```

Props: `type` (`single`, `multiple`), `variant` (`default`, `outline`), `size` (`default`, `sm`, `lg`).

## Slider

```bash
npx shadcn-vue@latest add slider
```

Built on Reka UI Slider.

```vue
<script setup lang="ts">
import { Slider } from '@/components/ui/slider'
</script>

<template>
  <Slider :default-value="[33]" :max="100" :step="1" />
</template>
```

<!--
Source references:
- https://www.shadcn-vue.com/docs/components/checkbox
- https://www.shadcn-vue.com/docs/components/radio-group
- https://www.shadcn-vue.com/docs/components/switch
- https://www.shadcn-vue.com/docs/components/toggle
- https://www.shadcn-vue.com/docs/components/toggle-group
- https://www.shadcn-vue.com/docs/components/slider
-->
