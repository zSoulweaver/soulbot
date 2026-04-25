---
name: components-date-picker
description: Calendar, DatePicker, and RangeCalendar components for date selection.
---

# Date Components

## Calendar

```bash
npx shadcn-vue@latest add calendar
```

Built on Reka UI Calendar.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { Calendar } from '@/components/ui/calendar'

const date = ref()
</script>

<template>
  <Calendar v-model="date" />
</template>
```

## DatePicker

```bash
npx shadcn-vue@latest add date-picker
```

DatePicker is composed from `Popover`, `Calendar`, and `Button` components.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { CalendarDate, type DateValue } from '@internationalized/date'
import { Calendar as CalendarIcon } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const value = ref<DateValue>()

function dateToString(date: DateValue | undefined) {
  if (!date) return 'Pick a date'
  return `${date.month}/${date.day}/${date.year}`
}
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        :class="cn('w-[280px] justify-start text-left font-normal', !value && 'text-muted-foreground')"
      >
        <CalendarIcon class="mr-2 h-4 w-4" />
        {{ dateToString(value) }}
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0">
      <Calendar v-model="value" initial-focus />
    </PopoverContent>
  </Popover>
</template>
```

### Date Range Picker

Use `RangeCalendar` for selecting date ranges:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { DateRange } from 'reka-ui'
import { RangeCalendar } from '@/components/ui/range-calendar'

const value = ref<DateRange>()
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button variant="outline">
        <CalendarIcon class="mr-2 h-4 w-4" />
        <template v-if="value?.start && value?.end">
          {{ dateToString(value.start) }} - {{ dateToString(value.end) }}
        </template>
        <template v-else>Pick a date range</template>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0">
      <RangeCalendar v-model="value" :number-of-months="2" initial-focus />
    </PopoverContent>
  </Popover>
</template>
```

## RangeCalendar

```bash
npx shadcn-vue@latest add range-calendar
```

Built on Reka UI RangeCalendar.

```vue
<script setup lang="ts">
import { RangeCalendar } from '@/components/ui/range-calendar'
</script>

<template>
  <RangeCalendar v-model="value" :number-of-months="2" />
</template>
```

Key props: `v-model` (DateRange), `:number-of-months`, `:min-value`, `:max-value`, `initial-focus`.

Uses `@internationalized/date` for date handling (`CalendarDate`, `DateValue`, etc.).

<!--
Source references:
- https://www.shadcn-vue.com/docs/components/calendar
- https://www.shadcn-vue.com/docs/components/date-picker
- https://www.shadcn-vue.com/docs/components/range-calendar
-->
