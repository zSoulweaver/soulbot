<script setup lang="ts">
import type { PublicCommand } from '~/types/commands'
import { ChevronRight, CornerDownRight, SearchIcon } from '@lucide/vue'
import { createColumnHelper } from '@tanstack/vue-table'
import { computed, h, ref, watch } from 'vue'
import CommandPermissionBadge from '~/components/commands/CommandPermissionBadge.vue'
import CommandPointsBadge from '~/components/commands/CommandPointsBadge.vue'
import { Badge } from '~/components/ui/badge'
import DataTable from '~/components/ui/data-table/DataTable.vue'
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group'
import { cn } from '~/lib/utils'

export interface CommandDirectoryRow {
	id: string
	type: 'core' | 'custom' | 'subcommand'
	trigger: string | null
	activeTrigger: string
	fullTriggerPath: string
	description: string | null
	usage: string | null
	permission: string
	cost: number
	hidden: boolean
	aliases: Array<{ id?: number, trigger: string, subcommand?: string | null }>
	hasHandler?: boolean
	subRows?: CommandDirectoryRow[]
}

const { user } = useUserSession()
const { data: commandsList, refresh: refreshCommands, pending: loading } = useFetch<PublicCommand[]>('/api/commands/directory')

useHead({
	title: 'Commands Directory',
})

const isPrivileged = computed(() => {
	const role = user.value?.role
	return Boolean(role && ['moderator', 'admin', 'caster'].includes(role))
})

// Expanded subcommands tracking - public directory expanded by default
const expandedState = ref<any>(true)
const searchQuery = ref('')

// Auto-expand all when search query is active
watch(searchQuery, (query) => {
	if (query.trim()) {
		expandedState.value = true
	}
})

// Convert subcommands dictionary tree to recursive array of subRows
function buildSubRows(subcommandsRecord: any, parentTriggerPath: string): CommandDirectoryRow[] {
	if (!subcommandsRecord || typeof subcommandsRecord !== 'object' || Array.isArray(subcommandsRecord)) {
		return []
	}

	const rows: CommandDirectoryRow[] = []
	for (const [key, sub] of Object.entries(subcommandsRecord)) {
		if (!sub || typeof sub !== 'object')
			continue
		const detail = sub as any
		const activeTrigger = detail.activeTrigger || key
		const fullTriggerPath = `${parentTriggerPath} ${activeTrigger}`
		const childRows = detail.subcommands ? buildSubRows(detail.subcommands, fullTriggerPath) : undefined

		rows.push({
			id: detail.id || key,
			type: 'subcommand',
			trigger: detail.trigger || null,
			activeTrigger,
			fullTriggerPath,
			description: detail.description || null,
			usage: detail.usage || null,
			permission: detail.permission || 'everyone',
			cost: detail.cost || 0,
			hidden: Boolean(detail.hidden),
			aliases: detail.aliases || [],
			hasHandler: detail.hasHandler !== false,
			subRows: childRows && childRows.length > 0 ? childRows : undefined,
		})
	}
	return rows
}

// Convert public command list into tree
const commandTree = computed<CommandDirectoryRow[]>(() => {
	if (!commandsList.value)
		return []

	return commandsList.value.map((cmd) => {
		const fullTriggerPath = `!${cmd.activeTrigger}`
		const childRows = cmd.subcommands ? buildSubRows(cmd.subcommands, fullTriggerPath) : undefined

		return {
			id: cmd.id,
			type: cmd.type,
			trigger: cmd.trigger,
			activeTrigger: cmd.activeTrigger,
			fullTriggerPath,
			description: cmd.description,
			usage: cmd.usage,
			permission: cmd.permission,
			cost: cmd.cost,
			hidden: cmd.hidden,
			aliases: cmd.aliases || [],
			hasHandler: true,
			subRows: childRows && childRows.length > 0 ? childRows : undefined,
		}
	})
})

function rowMatchesFilter(row: CommandDirectoryRow, filter: string): boolean {
	const match = row.activeTrigger.toLowerCase().includes(filter)
		|| row.id.toLowerCase().includes(filter)
		|| row.fullTriggerPath.toLowerCase().includes(filter)
		|| (row.description && row.description.toLowerCase().includes(filter))
		|| (row.usage && row.usage.toLowerCase().includes(filter))
		|| (row.aliases && row.aliases.some(a => a.trigger.toLowerCase().includes(filter)))

	if (match)
		return true

	if (row.subRows && row.subRows.length > 0) {
		return row.subRows.some(child => rowMatchesFilter(child, filter))
	}

	return false
}

function filterTree(rows: CommandDirectoryRow[], filter: string): CommandDirectoryRow[] {
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

const filteredCommands = computed<CommandDirectoryRow[]>(() => {
	const filter = searchQuery.value.trim().toLowerCase()
	if (!filter)
		return commandTree.value

	return filterTree(commandTree.value, filter)
})

// Define TanStack Table Columns
const columnHelper = createColumnHelper<CommandDirectoryRow>()

const columns = computed(() => {
	const cols: any[] = [
		columnHelper.display({
			id: 'trigger',
			header: 'Command Trigger',
			cell: ({ row }) => {
				const item = row.original
				const hasChildren = row.getCanExpand()
				const isExpanded = row.getIsExpanded()
				const depth = row.depth

				return h('div', {
					class: 'flex items-center gap-1.5 py-1',
					style: { paddingLeft: `${depth * 1.5}rem` },
				}, [
					hasChildren
						? h('button', {
								class: 'rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer',
								title: 'Toggle nested subcommands',
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

					h('div', {
						class: cn('flex flex-wrap items-baseline gap-2', hasChildren && 'cursor-pointer select-none'),
						onClick: hasChildren ? () => row.toggleExpanded() : undefined,
					}, [
						h('span', { class: 'font-bold whitespace-nowrap text-foreground' }, item.fullTriggerPath),
						item.aliases && item.aliases.length > 0
							? h('span', { class: 'flex items-center gap-1 text-xs text-muted-foreground' }, item.aliases.map(alias =>
									h('span', {
										key: alias.trigger,
										class: 'rounded-sm bg-muted/65 px-1.5 py-0.5 font-mono text-[11px]',
									}, `!${alias.trigger}`),
								))
							: null,
						item.hasHandler === false
							? h(Badge, {
									variant: 'outline',
									class: 'border-amber-500/20 bg-amber-500/5 px-1 py-0 text-[9px] font-medium text-amber-600 dark:text-amber-400',
								}, () => 'Route Group')
							: null,
					]),
				])
			},
		}),
		columnHelper.accessor('type', {
			header: 'Type',
			cell: info => h(Badge, { variant: 'outline', class: 'capitalize' }, () => info.getValue()),
		}),
		columnHelper.display({
			id: 'description',
			header: 'Description & Usage',
			cell: ({ row }) => {
				const item = row.original
				if (!item.description && !item.usage) {
					return h('span', { class: 'text-xs text-muted-foreground/60 italic' }, '—')
				}
				return h('div', { class: 'flex flex-col gap-1 py-1' }, [
					item.description ? h('span', { class: 'text-sm text-foreground' }, item.description) : null,
					item.usage ? h('span', { class: 'font-mono text-xs text-muted-foreground' }, `Usage: ${item.usage}`) : null,
				])
			},
		}),
		columnHelper.accessor('cost', {
			header: 'Points Cost',
			cell: (info) => {
				const cost = info.getValue()
				return cost > 0
					? h(CommandPointsBadge, { cost })
					: h('span', { class: 'text-xs text-muted-foreground' }, 'Free')
			},
		}),
	]

	if (isPrivileged.value) {
		cols.push(
			columnHelper.accessor('permission', {
				header: 'Permission',
				cell: info => h(CommandPermissionBadge, { permission: info.getValue() }),
			}),
			columnHelper.accessor('hidden', {
				id: 'visibility',
				header: () => h('div', { class: 'text-right' }, 'Visibility'),
				cell: info => h('div', { class: 'flex justify-end' }, [
					info.getValue()
						? h(Badge, { variant: 'outline', class: 'border-muted-foreground/30 text-[10px] text-muted-foreground' }, () => 'Hidden')
						: h('span', { class: 'text-xs text-muted-foreground' }, 'Public'),
				]),
			}),
		)
	}

	return cols
})
</script>

<template>
	<div class="flex flex-col">
		<AppPageHeader
			heading="Commands Directory"
			subheading="Explore available chat commands, usage syntax, and point costs for our Twitch stream."
		>
			<AppRefreshButton :loading="loading" @click="refreshCommands" />
		</AppPageHeader>

		<AppPageContainer class="flex-1">
			<div class="flex flex-col gap-4">
				<!-- Search & Count Control Row -->
				<div
					class="
						flex flex-col gap-4
						sm:flex-row sm:items-center sm:justify-between
					"
				>
					<InputGroup class="w-full max-w-sm">
						<InputGroupAddon>
							<SearchIcon class="text-muted-foreground" />
						</InputGroupAddon>
						<InputGroupInput
							v-model="searchQuery"
							type="search"
							placeholder="Search commands or usage..."
						/>
					</InputGroup>

					<div class="text-xs text-muted-foreground select-none">
						Showing {{ filteredCommands.length }} of {{ commandsList?.length || 0 }} commands
					</div>
				</div>

				<!-- DataTable Component -->
				<DataTable
					v-model:expanded="expandedState"
					:columns="columns"
					:data="filteredCommands"
					:loading="loading"
					loading-text="Loading bot commands..."
					:get-sub-rows="(row: CommandDirectoryRow) => row.subRows"
					:auto-reset-expanded="false"
				>
					<template #empty>
						No commands found matching your search.
					</template>
				</DataTable>
			</div>
		</AppPageContainer>
	</div>
</template>
