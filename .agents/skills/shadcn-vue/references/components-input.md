---
name: components-input
description: Input, InputGroup, Textarea, NumberField, InputOTP, PinInput, and TagsInput components.
---

# Input Components

## Input

```bash
npx shadcn-vue@latest add input
```

```vue
<script setup lang="ts">
import { Input } from '@/components/ui/input'
</script>

<template>
  <Input type="email" placeholder="Email" />
  <Input type="password" placeholder="Password" />
  <Input disabled placeholder="Disabled" />

  <!-- With label -->
  <div class="grid w-full max-w-sm items-center gap-1.5">
    <Label for="email">Email</Label>
    <Input id="email" type="email" placeholder="Email" />
  </div>

  <!-- File input -->
  <Input id="picture" type="file" />
</template>
```

## InputGroup

```bash
npx shadcn-vue@latest add input-group
```

```vue
<script setup lang="ts">
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
</script>
```

### Sub-components

- `InputGroup` - Container
- `InputGroupInput` - The input field
- `InputGroupAddon` - Wrapper for icons, text, or buttons
- `InputGroupButton` - Button inside the group

### With Icons

```vue
<InputGroup>
  <InputGroupAddon>
    <SearchIcon class="h-4 w-4" />
  </InputGroupAddon>
  <InputGroupInput placeholder="Search..." />
</InputGroup>
```

### With Button

```vue
<InputGroup>
  <InputGroupInput placeholder="Enter URL..." />
  <InputGroupAddon align="inline-end">
    <InputGroupButton>Copy</InputGroupButton>
  </InputGroupAddon>
</InputGroup>
```

### With Textarea

InputGroup also works with textareas for complex prompt forms.

## Textarea

```bash
npx shadcn-vue@latest add textarea
```

```vue
<script setup lang="ts">
import { Textarea } from '@/components/ui/textarea'
</script>

<template>
  <Textarea placeholder="Type your message here." />
</template>
```

## NumberField

```bash
npx shadcn-vue@latest add number-field
```

Built on Reka UI NumberField.

```vue
<script setup lang="ts">
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@/components/ui/number-field'
</script>

<template>
  <NumberField :default-value="5" :min="0" :max="100">
    <NumberFieldContent>
      <NumberFieldDecrement />
      <NumberFieldInput />
      <NumberFieldIncrement />
    </NumberFieldContent>
  </NumberField>
</template>
```

## InputOTP

```bash
npx shadcn-vue@latest add input-otp
```

One-time password input built on `input-otp` library.

```vue
<script setup lang="ts">
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp'
</script>

<template>
  <InputOTP :length="6">
    <InputOTPGroup>
      <InputOTPSlot :index="0" />
      <InputOTPSlot :index="1" />
      <InputOTPSlot :index="2" />
    </InputOTPGroup>
    <InputOTPSeparator />
    <InputOTPGroup>
      <InputOTPSlot :index="3" />
      <InputOTPSlot :index="4" />
      <InputOTPSlot :index="5" />
    </InputOTPGroup>
  </InputOTP>
</template>
```

Props: `:length`, `v-model`, `:pattern` (e.g. `REGEXP_ONLY_DIGITS`).

## PinInput

```bash
npx shadcn-vue@latest add pin-input
```

Built on Reka UI PinInput.

```vue
<script setup lang="ts">
import { PinInput, PinInputGroup, PinInputInput, PinInputSeparator } from '@/components/ui/pin-input'
</script>

<template>
  <PinInput v-model="value">
    <PinInputGroup>
      <PinInputInput v-for="(id, index) in 5" :key="id" :index="index" />
    </PinInputGroup>
  </PinInput>
</template>
```

## TagsInput

```bash
npx shadcn-vue@latest add tags-input
```

Built on Reka UI TagsInput.

```vue
<script setup lang="ts">
import { TagsInput, TagsInputInput, TagsInputItem, TagsInputItemDelete, TagsInputItemText } from '@/components/ui/tags-input'
</script>

<template>
  <TagsInput v-model="modelValue">
    <TagsInputItem v-for="item in modelValue" :key="item" :value="item">
      <TagsInputItemText />
      <TagsInputItemDelete />
    </TagsInputItem>
    <TagsInputInput placeholder="Add tag..." />
  </TagsInput>
</template>
```

<!--
Source references:
- https://www.shadcn-vue.com/docs/components/input
- https://www.shadcn-vue.com/docs/components/input-group
- https://www.shadcn-vue.com/docs/components/textarea
- https://www.shadcn-vue.com/docs/components/number-field
- https://www.shadcn-vue.com/docs/components/input-otp
- https://www.shadcn-vue.com/docs/components/pin-input
- https://www.shadcn-vue.com/docs/components/tags-input
-->
