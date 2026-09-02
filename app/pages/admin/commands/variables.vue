<script setup lang="ts">
import { ChevronRight, CornerDownRight, Search } from '@lucide/vue'
import { createColumnHelper } from '@tanstack/vue-table'
import { computed, h, ref, watch } from 'vue'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import DataTable from '~/components/ui/data-table/DataTable.vue'
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group'
import { cn } from '~/lib/utils'

export interface Variable {
	name: string
	description: string
	examples: { syntax: string, description: string, output?: string }[]
}

export interface VariableRow {
	id: string
	name: string
	type: 'variable' | 'example'
	description: string
	syntax?: string
	output?: string
	subRows?: VariableRow[]
}

const { data: apiVariables, pending: loading } = useFetch<Variable[]>('/api/commands/variables')
const { public: { botName } } = useRuntimeConfig()

useHead({
	title: 'Command Variables',
})

// Hardcoded positional variables definition (core aspect of custom commands)
const positionalVariable: Variable = {
	name: '1...n',
	description: 'Positional parameters representing arguments typed after the command.',
	examples: [
		{ syntax: '$(1)', description: 'Resolves to the first argument typed after the command.' },
		{ syntax: '$(2)', description: 'Resolves to the second argument typed after the command.' },
		{ syntax: '$(N)', description: 'Resolves to the N-th argument typed after the command.' },
	],
}

const variables = computed(() => {
	if (!apiVariables.value) {
		return [positionalVariable]
	}
	return [positionalVariable, ...apiVariables.value]
})

// Search query
const searchQuery = ref('')

// Expandable rows state mapping (positional guide expanded initially)
const expandedRows = ref<any>({
	0: true, // Index '0' corresponds to positionalVariable '1...n'
})

// Convert variables into hierarchical rows
const variableTree = computed<VariableRow[]>(() => {
	return variables.value.map(v => ({
		id: v.name,
		name: v.name,
		type: 'variable' as const,
		description: v.description,
		subRows: v.examples?.map((ex, index) => ({
			id: `${v.name}-ex-${index}`,
			name: ex.syntax,
			type: 'example' as const,
			description: ex.description,
			syntax: ex.syntax,
			output: ex.output,
		})),
	}))
})

function rowMatchesFilter(row: VariableRow, filter: string): boolean {
	const nameMatch = row.name.toLowerCase().includes(filter)
	const descMatch = row.description.toLowerCase().includes(filter)
	const syntaxMatch = row.syntax?.toLowerCase().includes(filter)

	if (nameMatch || descMatch || syntaxMatch)
		return true

	if (row.subRows && row.subRows.length > 0) {
		return row.subRows.some(child => rowMatchesFilter(child, filter))
	}

	return false
}

function filterTree(rows: VariableRow[], filter: string): VariableRow[] {
	return rows
		.filter(row => rowMatchesFilter(row, filter))
		.map((row) => {
			if (!row.subRows || row.subRows.length === 0)
				return row

			return {
				...row,
				subRows: filterTree(row.subRows, filter),
			}
		})
}

// Filtered variables computed property based on search
const filteredVariables = computed<VariableRow[]>(() => {
	const query = searchQuery.value.trim().toLowerCase()
	if (!query)
		return variableTree.value

	return filterTree(variableTree.value, query)
})

// Auto-expand all matching rows if search is active
watch(searchQuery, (newQuery) => {
	if (newQuery.trim()) {
		expandedRows.value = true
	}
	else {
		expandedRows.value = { 0: true }
	}
})

// TanStack Column Definitions
const columnHelper = createColumnHelper<VariableRow>()

const columns = [
	columnHelper.display({
		id: 'trigger',
		header: 'Variable Trigger',
		cell: ({ row }) => {
			const item = row.original
			const hasChildren = row.getCanExpand()
			const isExpanded = row.getIsExpanded()
			const depth = row.depth

			return h('div', {
				class: 'flex items-center gap-2 py-1',
				style: { paddingLeft: `${depth * 1.5}rem` },
			}, [
				hasChildren
					? h('button', {
							class: 'rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer',
							title: 'Toggle examples',
							onClick: (e: MouseEvent) => {
								e.stopPropagation()
								row.toggleExpanded()
							},
						}, [
							h(ChevronRight, {
								class: cn('size-4 text-primary transition-transform duration-200', isExpanded && 'rotate-90'),
							}),
						])
					: depth > 0
						? h(CornerDownRight, { class: 'size-3.5 shrink-0 text-muted-foreground/50 ml-1 mr-0.5' })
						: null,

				item.type === 'variable'
					? h('span', {
							class: cn('font-mono font-bold text-foreground', hasChildren && 'cursor-pointer select-none'),
							onClick: hasChildren ? () => row.toggleExpanded() : undefined,
						}, `$(${item.name})`)
					: h(Badge, {
							variant: 'secondary',
							class: 'font-mono text-xs font-bold',
						}, () => item.syntax || item.name),
			])
		},
	}),
	columnHelper.accessor('description', {
		header: 'Description',
		cell: ({ row }) => {
			const item = row.original
			return h('span', {
				class: cn(
					'whitespace-normal text-muted-foreground',
					item.type === 'example' ? 'text-xs' : 'text-sm text-foreground/90',
				),
			}, item.description)
		},
	}),
]
</script>

<template>
	<AppSettingsPage
		heading="Command Variables"
		:subheading="`Self-documenting reference guide for placeholders, parameters, and database counters supported inside ${botName} custom commands.`"
	>
		<div class="flex flex-col gap-4">
			<!-- Pro Tip Helper alert box -->
			<Alert variant="info">
				<AlertTitle>
					Pro Tip: Innermost Expression Parsing
				</AlertTitle>
				<AlertDescription>
					The bot processes nested placeholder variables from the <strong>inside out</strong>.
					For example, if you write <code>$(count $(1) +1)</code> and trigger the command via <code>!score bob</code>,
					the bot will first resolve the positional variable <code>$(1)</code> to <code>bob</code>, resulting in <code>$(count bob +1)</code>,
					and then increment/evaluate the named persistent counter <code>bob</code>.
				</AlertDescription>
			</Alert>

			<!-- Search & Filtration Row -->
			<div
				class="
					flex flex-col gap-4
					sm:flex-row sm:items-center sm:justify-between
				"
			>
				<InputGroup class="w-full max-w-sm">
					<InputGroupAddon>
						<Search class="text-muted-foreground" />
					</InputGroupAddon>
					<InputGroupInput
						v-model="searchQuery"
						type="search"
						placeholder="Search variables or descriptions..."
					/>
				</InputGroup>

				<div class="text-xs text-muted-foreground select-none">
					Showing {{ filteredVariables.length }} of {{ variables.length }} variables
				</div>
			</div>

			<!-- Unified Data Table of Variables -->
			<DataTable
				v-model:expanded="expandedRows"
				:columns="columns"
				:data="filteredVariables"
				:loading="loading"
				loading-text="Loading variable documentation registry..."
				:get-sub-rows="(row: VariableRow) => row.subRows"
				:auto-reset-expanded="false"
			>
				<template #empty>
					No variables found matching your search.
				</template>
			</DataTable>
		</div>
	</AppSettingsPage>
</template>
