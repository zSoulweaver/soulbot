<script setup lang="ts" generic="TData, TValue">
import type { ColumnDef } from '@tanstack/vue-table'
import {
	FlexRender,
	getCoreRowModel,
	useVueTable,
} from '@tanstack/vue-table'
import { Spinner } from '~/components/ui/spinner'

const props = defineProps<{
	columns: ColumnDef<TData, any>[]
	data: TData[]
	loading?: boolean
	loadingText?: string
}>()

const table = useVueTable({
	get data() { return props.data },
	get columns() { return props.columns },
	getCoreRowModel: getCoreRowModel(),
})
</script>

<template>
	<div class="relative overflow-hidden rounded-lg border">
		<Table>
			<TableHeader>
				<TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
					<TableHead v-for="header in headerGroup.headers" :key="header.id">
						<FlexRender
							v-if="!header.isPlaceholder"
							:render="header.column.columnDef.header"
							:props="header.getContext()"
						/>
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				<!-- Initial Load Row -->
				<template v-if="loading && !data.length">
					<TableRow class="hover:bg-transparent">
						<TableCell :colspan="columns.length" class="h-32 text-center text-muted-foreground select-none">
							<div class="flex flex-col items-center justify-center gap-2">
								<Spinner class="size-6 text-primary" />
								<span class="text-xs">{{ loadingText || 'Loading...' }}</span>
							</div>
						</TableCell>
					</TableRow>
				</template>

				<!-- Data Rows -->
				<template v-else-if="table.getRowModel().rows?.length">
					<TableRow
						v-for="row in table.getRowModel().rows"
						:key="row.id"
						:data-state="row.getIsSelected() ? 'selected' : undefined"
					>
						<TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
							<FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
						</TableCell>
					</TableRow>
				</template>

				<!-- Empty State Row -->
				<template v-else>
					<TableRow class="hover:bg-transparent">
						<TableCell :colspan="columns.length" class="h-24 text-center text-muted-foreground select-none">
							<slot name="empty">
								No results.
							</slot>
						</TableCell>
					</TableRow>
				</template>
			</TableBody>
		</Table>

		<!-- Background refresh overlay when data is already present but loading in background -->
		<div v-if="loading && data.length > 0" class="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
			<Spinner class="size-6 text-primary" />
		</div>
	</div>
</template>
