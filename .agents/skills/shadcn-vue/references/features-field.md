---
name: features-field
description: Field component system for building accessible, responsive forms with labels, descriptions, errors, and field groups.
---

# Field Component

```bash
npx shadcn-vue@latest add field
```

The Field component is the recommended way to build forms in shadcn-vue. It provides a flexible, composable structure for form fields with labels, descriptions, error messages, and grouping.

## Sub-components

- `Field` - Container for a single form field
- `FieldLabel` - Label for the field
- `FieldDescription` - Help text below the field
- `FieldError` - Error message display
- `FieldContent` - Content wrapper (used in horizontal layouts)
- `FieldTitle` - Title text (used in choice cards)
- `FieldGroup` - Groups multiple fields together
- `FieldSet` - HTML fieldset wrapper
- `FieldLegend` - Legend for a fieldset

```vue
<script setup lang="ts">
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field'
</script>
```

## Basic Field

```vue
<template>
  <Field>
    <FieldLabel html-for="username">Username</FieldLabel>
    <Input id="username" placeholder="Max Leiter" />
    <FieldDescription>Choose a unique username.</FieldDescription>
  </Field>
</template>
```

## With Error State

```vue
<template>
  <Field :data-invalid="!!errors.length">
    <FieldLabel for="email">Email</FieldLabel>
    <Input id="email" :aria-invalid="!!errors.length" />
    <FieldError v-if="errors.length" :errors="errors" />
  </Field>
</template>
```

## Orientation

Use `orientation` to control field layout:

- **Default (vertical)**: Label above input
- **`horizontal`**: Label and input side by side
- **`responsive`**: Vertical on mobile, horizontal on desktop

```vue
<Field orientation="horizontal">
  <FieldContent>
    <FieldLabel for="toggle">Dark Mode</FieldLabel>
    <FieldDescription>Enable dark mode.</FieldDescription>
  </FieldContent>
  <Switch id="toggle" />
</Field>
```

```vue
<Field orientation="responsive">
  <FieldContent>
    <FieldLabel for="lang">Language</FieldLabel>
    <FieldDescription>Select your language.</FieldDescription>
  </FieldContent>
  <Select>
    <SelectTrigger id="lang"><SelectValue placeholder="Select" /></SelectTrigger>
    <SelectContent>
      <SelectItem value="en">English</SelectItem>
    </SelectContent>
  </Select>
</Field>
```

## FieldSet & FieldGroup

Group related fields with `FieldSet` and `FieldGroup`:

```vue
<template>
  <FieldSet>
    <FieldLegend>Personal Information</FieldLegend>
    <FieldGroup>
      <Field>
        <FieldLabel html-for="first-name">First Name</FieldLabel>
        <Input id="first-name" />
      </Field>
      <Field>
        <FieldLabel html-for="last-name">Last Name</FieldLabel>
        <Input id="last-name" />
      </Field>
    </FieldGroup>
  </FieldSet>
</template>
```

## Checkbox Fields

Add `data-slot="checkbox-group"` to `FieldGroup` for proper checkbox/radio spacing:

```vue
<FieldGroup data-slot="checkbox-group">
  <Field orientation="horizontal">
    <Checkbox id="terms" />
    <FieldLabel for="terms" class="font-normal">Accept terms</FieldLabel>
  </Field>
</FieldGroup>
```

## Choice Cards

Wrap fields in `FieldLabel` to create selectable cards:

```vue
<RadioGroup v-model="plan">
  <FieldLabel for="plan-free">
    <Field orientation="horizontal">
      <FieldContent>
        <FieldTitle>Free</FieldTitle>
        <FieldDescription>For personal use</FieldDescription>
      </FieldContent>
      <RadioGroupItem id="plan-free" value="free" />
    </Field>
  </FieldLabel>
</RadioGroup>
```

<!--
Source references:
- https://www.shadcn-vue.com/docs/components/field
-->
