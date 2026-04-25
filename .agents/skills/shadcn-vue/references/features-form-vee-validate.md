---
name: features-form-vee-validate
description: Building validated forms with VeeValidate, Zod schemas, and shadcn-vue Field components.
---

# Forms with VeeValidate

## Dependencies

```bash
npm install vee-validate @vee-validate/zod zod
```

## Setup Pattern

```vue
<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm, Field as VeeField } from 'vee-validate'
import * as z from 'zod'
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

const { handleSubmit } = useForm({
  validationSchema: toTypedSchema(formSchema),
  initialValues: { title: '', description: '' },
})

const onSubmit = handleSubmit((values) => {
  console.log(values)
})
</script>

<template>
  <form @submit="onSubmit">
    <FieldGroup>
      <VeeField v-slot="{ field, errors }" name="title">
        <Field :data-invalid="!!errors.length">
          <FieldLabel for="title">Title</FieldLabel>
          <Input id="title" v-bind="field" :aria-invalid="!!errors.length" />
          <FieldDescription>Provide a concise title.</FieldDescription>
          <FieldError v-if="errors.length" :errors="errors" />
        </Field>
      </VeeField>
    </FieldGroup>
    <Button type="submit">Submit</Button>
  </form>
</template>
```

## Field Type Binding Patterns

### Input / Textarea

Use `v-bind="field"` directly:

```vue
<VeeField v-slot="{ field, errors }" name="email">
  <Field :data-invalid="!!errors.length">
    <Input v-bind="field" :aria-invalid="!!errors.length" />
    <FieldError v-if="errors.length" :errors="errors" />
  </Field>
</VeeField>
```

### Select

Use `field.value` and `field.onChange`:

```vue
<VeeField v-slot="{ field, errors }" name="language">
  <Select :model-value="field.value" @update:model-value="field.onChange" @blur="field.onBlur">
    <SelectTrigger :aria-invalid="!!errors.length">
      <SelectValue placeholder="Select" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="en">English</SelectItem>
    </SelectContent>
  </Select>
</VeeField>
```

### Checkbox (Array)

```vue
<VeeField v-slot="{ field, errors }" name="tasks">
  <FieldGroup data-slot="checkbox-group">
    <Field v-for="task in tasks" :key="task.id" orientation="horizontal" :data-invalid="!!errors.length">
      <Checkbox
        :model-value="field.value?.includes(task.id) ?? false"
        :aria-invalid="!!errors.length"
        @update:model-value="(checked) => {
          const current = field.value || []
          field.onChange(checked ? [...current, task.id] : current.filter(id => id !== task.id))
        }"
      />
      <FieldLabel class="font-normal">{{ task.label }}</FieldLabel>
    </Field>
  </FieldGroup>
</VeeField>
```

### RadioGroup

```vue
<VeeField v-slot="{ field, errors }" name="plan">
  <RadioGroup :model-value="field.value" @update:model-value="field.onChange">
    <FieldLabel v-for="option in options" :key="option.id">
      <Field orientation="horizontal" :data-invalid="!!errors.length">
        <FieldContent>
          <FieldTitle>{{ option.title }}</FieldTitle>
        </FieldContent>
        <RadioGroupItem :value="option.id" :aria-invalid="!!errors.length" />
      </Field>
    </FieldLabel>
  </RadioGroup>
</VeeField>
```

### Switch

```vue
<VeeField v-slot="{ field, errors }" name="enabled">
  <Field orientation="horizontal" :data-invalid="!!errors.length">
    <FieldContent>
      <FieldLabel>Enable feature</FieldLabel>
    </FieldContent>
    <Switch :model-value="field.value" :aria-invalid="!!errors.length" @update:model-value="field.onChange" />
  </Field>
</VeeField>
```

## Array Fields

Use `FieldArray` for dynamic field lists:

```vue
<script setup lang="ts">
import { FieldArray as VeeFieldArray, Field as VeeField } from 'vee-validate'
</script>

<template>
  <VeeFieldArray v-slot="{ fields, push, remove }" name="emails">
    <VeeField
      v-for="(field, index) in fields"
      :key="field.key"
      v-slot="{ field: controllerField, errors }"
      :name="`emails[${index}].address`"
    >
      <InputGroup>
        <InputGroupInput v-bind="controllerField" type="email" placeholder="name@example.com" />
        <InputGroupAddon v-if="fields.length > 1" align="inline-end">
          <InputGroupButton @click="remove(index)"><XIcon /></InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <FieldError v-if="errors.length" :errors="errors" />
    </VeeField>

    <Button type="button" variant="outline" size="sm" :disabled="fields.length >= 5" @click="push({ address: '' })">
      Add Email
    </Button>
  </VeeFieldArray>
</template>
```

## Reset Form

```vue
<script setup>
const { handleSubmit, resetForm } = useForm({ ... })
</script>

<template>
  <Button type="button" variant="outline" @click="resetForm">Reset</Button>
</template>
```

## Key Rules

1. Always add `:data-invalid="!!errors.length"` to the `<Field>` component
2. Always add `:aria-invalid="!!errors.length"` to form controls (`Input`, `SelectTrigger`, `Checkbox`, etc.)
3. Use `field.key` as the key when iterating over `FieldArray` fields

<!--
Source references:
- https://www.shadcn-vue.com/docs/forms/vee-validate
-->
