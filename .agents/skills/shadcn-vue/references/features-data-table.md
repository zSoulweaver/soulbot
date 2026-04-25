---
name: features-data-table
description: Building data tables with TanStack Table, including sorting, filtering, pagination, row selection, column visibility, and expanding.
---

# Data Table with TanStack Table

## Dependencies

```bash
npx shadcn-vue@latest add table
npm install @tanstack/vue-table
```

## Project Structure

```
components/payments/
  ├── columns.ts              # Column definitions
  ├── data-table.vue          # DataTable component
  └── data-table-dropdown.vue # Row action dropdown
```

## Column Definitions

```ts
// columns.ts
import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'

interface Payment {
  id: string
  amount: number
  status: 'pending' | 'processing' | 'success' | 'failed'
  email: string
}

export const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: 'status',
    header: 'Status',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'amount',
    header: () => h('div', { class: 'text-right' }, 'Amount'),
    cell: ({ row }) => {
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(Number.parseFloat(row.getValue('amount')))
      return h('div', { class: 'text-right font-medium' }, formatted)
    },
  },
]
```

## Basic DataTable Component

```vue
<!-- data-table.vue -->
<script setup lang="ts" generic="TData, TValue">
import type { ColumnDef } from '@tanstack/vue-table'
import { FlexRender, getCoreRowModel, useVueTable } from '@tanstack/vue-table'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

const props = defineProps<{
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}>()

const table = useVueTable({
  get data() { return props.data },
  get columns() { return props.columns },
  getCoreRowModel: getCoreRowModel(),
})
</script>

<template>
  <div class="border rounded-md">
    <Table>
      <TableHeader>
        <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
          <TableHead v-for="header in headerGroup.headers" :key="header.id">
            <FlexRender v-if="!header.isPlaceholder" :render="header.column.columnDef.header" :props="header.getContext()" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <template v-if="table.getRowModel().rows?.length">
          <TableRow v-for="row in table.getRowModel().rows" :key="row.id"
            :data-state="row.getIsSelected() ? 'selected' : undefined">
            <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
              <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
            </TableCell>
          </TableRow>
        </template>
        <template v-else>
          <TableRow>
            <TableCell :colspan="columns.length" class="h-24 text-center">No results.</TableCell>
          </TableRow>
        </template>
      </TableBody>
    </Table>
  </div>
</template>
```

## Adding Features

Each feature requires: (1) importing the row model, (2) adding state ref, (3) configuring `useVueTable`.

Use the `valueUpdater` utility from `@/lib/utils` for all state change handlers:

```ts
import { valueUpdater } from '@/lib/utils'
```

### Pagination

```ts
import { getCoreRowModel, getPaginationRowModel, useVueTable } from '@tanstack/vue-table'

const table = useVueTable({
  // ...
  getPaginationRowModel: getPaginationRowModel(),
})
```

Controls:
```vue
<Button variant="outline" size="sm" :disabled="!table.getCanPreviousPage()" @click="table.previousPage()">Previous</Button>
<Button variant="outline" size="sm" :disabled="!table.getCanNextPage()" @click="table.nextPage()">Next</Button>
```

### Sorting

```ts
import type { SortingState } from '@tanstack/vue-table'
import { getSortedRowModel } from '@tanstack/vue-table'

const sorting = ref<SortingState>([])

const table = useVueTable({
  // ...
  getSortedRowModel: getSortedRowModel(),
  onSortingChange: updaterOrValue => valueUpdater(updaterOrValue, sorting),
  state: { get sorting() { return sorting.value } },
})
```

Sortable column header:
```ts
{
  accessorKey: 'email',
  header: ({ column }) => h(Button, {
    variant: 'ghost',
    onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
  }, () => ['Email', h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })]),
}
```

### Filtering

```ts
import type { ColumnFiltersState } from '@tanstack/vue-table'
import { getFilteredRowModel } from '@tanstack/vue-table'

const columnFilters = ref<ColumnFiltersState>([])

const table = useVueTable({
  // ...
  getFilteredRowModel: getFilteredRowModel(),
  onColumnFiltersChange: updaterOrValue => valueUpdater(updaterOrValue, columnFilters),
  state: { get columnFilters() { return columnFilters.value } },
})
```

Filter input:
```vue
<Input class="max-w-sm" placeholder="Filter emails..."
  :model-value="table.getColumn('email')?.getFilterValue() as string"
  @update:model-value="table.getColumn('email')?.setFilterValue($event)" />
```

### Column Visibility

```ts
import type { VisibilityState } from '@tanstack/vue-table'

const columnVisibility = ref<VisibilityState>({})

const table = useVueTable({
  // ...
  onColumnVisibilityChange: updaterOrValue => valueUpdater(updaterOrValue, columnVisibility),
  state: { get columnVisibility() { return columnVisibility.value } },
})
```

### Row Selection

```ts
const rowSelection = ref({})

const table = useVueTable({
  // ...
  onRowSelectionChange: updaterOrValue => valueUpdater(updaterOrValue, rowSelection),
  state: { get rowSelection() { return rowSelection.value } },
})
```

Checkbox column:
```ts
{
  id: 'select',
  header: ({ table }) => h(Checkbox, {
    'modelValue': table.getIsAllPageRowsSelected(),
    'onUpdate:modelValue': (value: boolean) => table.toggleAllPageRowsSelected(!!value),
    'ariaLabel': 'Select all',
  }),
  cell: ({ row }) => h(Checkbox, {
    'modelValue': row.getIsSelected(),
    'onUpdate:modelValue': (value: boolean) => row.toggleSelected(!!value),
    'ariaLabel': 'Select row',
  }),
  enableSorting: false,
  enableHiding: false,
}
```

### Row Expanding

```ts
import type { ExpandedState } from '@tanstack/vue-table'
import { getExpandedRowModel } from '@tanstack/vue-table'

const expanded = ref<ExpandedState>({})

const table = useVueTable({
  // ...
  getExpandedRowModel: getExpandedRowModel(),
  onExpandedChange: updaterOrValue => valueUpdater(updaterOrValue, expanded),
  state: { get expanded() { return expanded.value } },
})
```

Expanded row template:
```vue
<template v-for="row in table.getRowModel().rows" :key="row.id">
  <TableRow><!-- normal cells --></TableRow>
  <TableRow v-if="row.getIsExpanded()">
    <TableCell :colspan="row.getAllCells().length">
      {{ JSON.stringify(row.original) }}
    </TableCell>
  </TableRow>
</template>
```

## Row Actions

```ts
// In columns.ts
{
  id: 'actions',
  enableHiding: false,
  cell: ({ row }) => h('div', { class: 'relative' }, h(DropdownAction, { payment: row.original })),
}
```

Access original row data via `row.original`.

<!--
Source references:
- https://www.shadcn-vue.com/docs/components/data-table
-->
