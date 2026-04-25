---
name: components-button
description: Button, ButtonGroup, and ButtonGroupSeparator components with variants and compositions.
---

# Button & ButtonGroup

## Button

```bash
npx shadcn-vue@latest add button
```

```vue
<script setup lang="ts">
import { Button } from '@/components/ui/button'
</script>

<template>
  <Button>Click me</Button>
  <Button variant="secondary">Secondary</Button>
  <Button variant="destructive">Delete</Button>
  <Button variant="outline">Outline</Button>
  <Button variant="ghost">Ghost</Button>
  <Button variant="link">Link</Button>
</template>
```

### Variants

| Prop | Values |
|------|--------|
| `variant` | `default`, `secondary`, `destructive`, `outline`, `ghost`, `link` |
| `size` | `default`, `sm`, `lg`, `icon` |

### As Link

Use `as-child` to render as a different element:

```vue
<Button as-child>
  <a href="/login">Login</a>
</Button>
```

### Loading State

```vue
<Button disabled>
  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
  Please wait
</Button>
```

### Icon Button

```vue
<Button variant="outline" size="icon">
  <ChevronRight class="h-4 w-4" />
</Button>
```

## ButtonGroup

```bash
npx shadcn-vue@latest add button-group
```

```vue
<script setup lang="ts">
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '@/components/ui/button-group'
</script>
```

### Sub-components

- `ButtonGroup` - Container that groups buttons
- `ButtonGroupSeparator` - Divider for split button patterns
- `ButtonGroupText` - Text prefix/suffix for input groups

### Basic Group

```vue
<ButtonGroup>
  <Button>Button 1</Button>
  <Button>Button 2</Button>
</ButtonGroup>
```

### Split Button with Dropdown

```vue
<ButtonGroup>
  <Button>Save</Button>
  <ButtonGroupSeparator />
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="outline" size="icon">
        <ChevronDown class="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem>Save as Draft</DropdownMenuItem>
      <DropdownMenuItem>Save and Publish</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</ButtonGroup>
```

### With Input

```vue
<ButtonGroup>
  <ButtonGroupText>Prefix</ButtonGroupText>
  <Input placeholder="Type something here..." />
  <Button>Submit</Button>
</ButtonGroup>
```

### Nested Groups (Spacing)

```vue
<ButtonGroup>
  <ButtonGroup>
    <Button>A</Button>
    <Button>B</Button>
  </ButtonGroup>
  <ButtonGroup>
    <Button>C</Button>
    <Button>D</Button>
  </ButtonGroup>
</ButtonGroup>
```

<!--
Source references:
- https://www.shadcn-vue.com/docs/components/button
- https://www.shadcn-vue.com/docs/components/button-group
-->
