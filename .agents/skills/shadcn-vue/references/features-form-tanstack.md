---
name: features-form-tanstack
description: Building validated forms with TanStack Form, Zod schemas, and shadcn-vue Field components.
---

# Forms with TanStack Form

## Dependencies

```bash
npm install @tanstack/vue-form zod
```

## Setup Pattern

```vue
<script setup lang="ts">
import { useForm } from '@tanstack/vue-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.').max(32),
  description: z.string().min(20).max(100),
})

const form = useForm({
  defaultValues: { title: '', description: '' },
  validators: { onSubmit: formSchema },
  onSubmit: async ({ value }) => {
    console.log(value)
  },
})

function isInvalid(field: any) {
  return field.state.meta.isTouched && !field.state.meta.isValid
}
</script>

<template>
  <form @submit.prevent="form.handleSubmit">
    <FieldGroup>
      <form.Field name="title" #default="{ field }">
        <Field :data-invalid="isInvalid(field)">
          <FieldLabel :for="field.name">Title</FieldLabel>
          <Input
            :id="field.name"
            :name="field.name"
            :model-value="field.state.value"
            @blur="field.handleBlur"
            @input="field.handleChange($event.target.value)"
            :aria-invalid="isInvalid(field)"
          />
          <FieldDescription>Provide a concise title.</FieldDescription>
          <FieldError v-if="isInvalid(field)" :errors="field.state.meta.errors" />
        </Field>
      </form.Field>
    </FieldGroup>
    <Button type="submit">Submit</Button>
  </form>
</template>
```

## Field Type Binding Patterns

### Input / Textarea

```vue
<form.Field name="username" #default="{ field }">
  <Field :data-invalid="isInvalid(field)">
    <Input
      :name="field.name"
      :model-value="field.state.value"
      @blur="field.handleBlur"
      @input="field.handleChange($event.target.value)"
      :aria-invalid="isInvalid(field)"
    />
  </Field>
</form.Field>
```

### Select

```vue
<form.Field name="language" #default="{ field }">
  <Select :name="field.name" :model-value="field.state.value" @update:model-value="field.handleChange">
    <SelectTrigger :aria-invalid="isInvalid(field)">
      <SelectValue placeholder="Select" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="en">English</SelectItem>
    </SelectContent>
  </Select>
</form.Field>
```

### Checkbox (Array)

Use `mode="array"` with `pushValue`/`removeValue`:

```vue
<form.Field name="tasks" mode="array" #default="{ field }">
  <FieldGroup data-slot="checkbox-group">
    <Field v-for="task in tasks" :key="task.id" orientation="horizontal" :data-invalid="isInvalid(field)">
      <Checkbox
        :model-value="field.state.value.includes(task.id)"
        :aria-invalid="isInvalid(field)"
        @update:model-value="(checked) => {
          if (checked) {
            field.pushValue(task.id)
          } else {
            const index = field.state.value.indexOf(task.id)
            if (index > -1) field.removeValue(index)
          }
        }"
      />
      <FieldLabel class="font-normal">{{ task.label }}</FieldLabel>
    </Field>
  </FieldGroup>
</form.Field>
```

### RadioGroup

```vue
<form.Field name="plan" #default="{ field }">
  <RadioGroup :name="field.name" :model-value="field.state.value" @update:model-value="field.handleChange">
    <FieldLabel v-for="plan in plans" :key="plan.id">
      <Field orientation="horizontal" :data-invalid="isInvalid(field)">
        <FieldContent>
          <FieldTitle>{{ plan.title }}</FieldTitle>
        </FieldContent>
        <RadioGroupItem :value="plan.id" :aria-invalid="isInvalid(field)" />
      </Field>
    </FieldLabel>
  </RadioGroup>
</form.Field>
```

### Switch

```vue
<form.Field name="enabled" #default="{ field }">
  <Field orientation="horizontal" :data-invalid="isInvalid(field)">
    <FieldContent>
      <FieldLabel :for="field.name">Enable feature</FieldLabel>
    </FieldContent>
    <Switch :model-value="field.state.value" @update:model-value="field.handleChange" :aria-invalid="isInvalid(field)" />
  </Field>
</form.Field>
```

## Validation Modes

```ts
const form = useForm({
  defaultValues: { ... },
  validators: {
    onSubmit: formSchema,   // Validate on submit
    onChange: formSchema,   // Validate on every change
    onBlur: formSchema,     // Validate on blur
  },
})
```

## Array Fields

Use `mode="array"` on parent field, bracket notation for nested fields:

```vue
<form.Field name="emails" mode="array" #default="{ field }">
  <template v-for="(_, index) in field.state.value">
    <form.Field :name="`emails[${index}].address`" #default="{ subField }">
      <InputGroupInput
        :model-value="subField.state.value"
        @blur="subField.handleBlur"
        @input="subField.handleChange($event.target.value)"
      />
    </form.Field>
  </template>
  <Button @click="field.pushValue({ address: '' })" :disabled="field.state.value.length >= 5">
    Add Email
  </Button>
</form.Field>
```

Remove items: `field.removeValue(index)`.

## Reset Form

```vue
<Button type="button" variant="outline" @click="form.reset()">Reset</Button>
```

## Key Rules

1. Always define `isInvalid(field)` helper: `field.state.meta.isTouched && !field.state.meta.isValid`
2. Always add `:data-invalid="isInvalid(field)"` to the `<Field>` component
3. Always add `:aria-invalid="isInvalid(field)"` to form controls
4. Use `@submit.prevent="form.handleSubmit"` on the form element

<!--
Source references:
- https://www.shadcn-vue.com/docs/forms/tanstack-form
-->
