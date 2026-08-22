<script setup lang="ts">
import type { Alias, Command, Template } from '~/types/commands'
import { ChevronRight, CornerDownRight, MessageSquare, RefreshCcw, SearchIcon, Settings } from '@lucide/vue'
import { createColumnHelper } from '@tanstack/vue-table'
import { computed, h, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import CommandCooldownsDisplay from '~/components/commands/CommandCooldownsDisplay.vue'
import CommandEditSheet from '~/components/commands/CommandEditSheet.vue'
import CommandPermissionBadge from '~/components/commands/CommandPermissionBadge.vue'
import CommandPointsBadge from '~/components/commands/CommandPointsBadge.vue'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import DataTable from '~/components/ui/data-table/DataTable.vue'
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group'
import { Switch } from '~/components/ui/switch'
import { cn } from '~/lib/utils'

export interface CoreCommandRow {
	id: string
	rootCommandId: string
	subcommandPath?: string
	trigger: string | null
	activeTrigger: string
	parentTriggerPath?: string
	fullTriggerPath: string
	description: string
	usage?: string
	permission: string
	enabled: boolean
	cost: number
	globalCooldown: number
	userCooldown: number
	allowWhisper: boolean
	whisperSilentResponse: boolean
	hidden: boolean
	aliases: Alias[]
	templates: Template[]
	hasHandler?: boolean
	subRows?: CoreCommandRow[]
}

const { data: commandsList, refresh: refreshCommands, pending: loading } = useFetch<Command[]>('/api/commands')

useHead({
	title: 'Command Management',
})

// Expanded state - admin core commands collapsed by default
const expandedState = ref<any>({})
const searchQuery = ref('')

// Auto-expand all matching trees when searching
watch(searchQuery, (query) => {
	if (query.trim()) {
		expandedState.value = true
	}
	else {
		expandedState.value = {}
	}
})

// Edit sheet states
const isSheetOpen = ref(false)
const selectedCommand = ref<Command | null>(null)

// Open quick config sheet for any command or subcommand
function openQuickEdit(row: CoreCommandRow) {
	selectedCommand.value = {
		id: row.id,
		trigger: row.trigger,
		activeTrigger: row.activeTrigger,
		parentTriggerPath: row.parentTriggerPath,
		description: row.description || '',
		usage: row.usage,
		permission: row.permission || 'everyone',
		enabled: row.enabled,
		cost: row.cost,
		globalCooldown: row.globalCooldown,
		userCooldown: row.userCooldown,
		allowWhisper: Boolean(row.allowWhisper),
		whisperSilentResponse: Boolean(row.whisperSilentResponse),
		hidden: Boolean(row.hidden),
		aliases: row.aliases || [],
		templates: row.templates || [],
		hasHandler: row.hasHandler,
	}
	isSheetOpen.value = true
}

// Inline toggle switch active state instantly
async function toggleCommandActive(command: CoreCommandRow) {
	try {
		const nextState = command.enabled
		await $fetch('/api/commands/save', {
			method: 'PUT',
			body: {
				id: command.id,
				trigger: command.trigger,
				enabled: nextState,
				cost: command.cost,
				globalCooldown: command.globalCooldown,
				userCooldown: command.userCooldown,
				permission: command.permission,
			},
		})
		toast.success(`Command '!${command.activeTrigger}' has been ${nextState ? 'enabled' : 'disabled'}!`)
		await refreshCommands()
	}
	catch (error: any) {
		toast.error(error.data?.statusMessage || 'Failed to toggle command state')
		command.enabled = !command.enabled
	}
}

// Recursive builder to convert subcommands dict into typed nested rows
function buildSubRows(
	subcommandsRecord: any,
	rootCommandId: string,
	parentTriggerPath: string,
	currentPathPrefix: string,
): CoreCommandRow[] {
	if (!subcommandsRecord || typeof subcommandsRecord !== 'object' || Array.isArray(subcommandsRecord)) {
		return []
	}

	const rows: CoreCommandRow[] = []
	for (const [key, sub] of Object.entries(subcommandsRecord)) {
		if (!sub || typeof sub !== 'object')
			continue
		const detail = sub as any
		const activeTrigger = detail.activeTrigger || key
		const fullTriggerPath = `${parentTriggerPath} ${activeTrigger}`
		const subcommandPath = currentPathPrefix ? `${currentPathPrefix} ${key}` : key
		const childRows = detail.subcommands
			? buildSubRows(detail.subcommands, rootCommandId, fullTriggerPath, subcommandPath)
			: undefined

		rows.push({
			id: detail.id || key,
			rootCommandId,
			subcommandPath,
			trigger: detail.trigger || null,
			activeTrigger,
			parentTriggerPath,
			fullTriggerPath,
			description: detail.description || '',
			usage: detail.usage || undefined,
			permission: detail.permission || 'everyone',
			enabled: Boolean(detail.enabled),
			cost: detail.cost || 0,
			globalCooldown: detail.globalCooldown || 0,
			userCooldown: detail.userCooldown || 0,
			allowWhisper: Boolean(detail.allowWhisper),
			whisperSilentResponse: Boolean(detail.whisperSilentResponse),
			hidden: Boolean(detail.hidden),
			aliases: detail.aliases || [],
			templates: detail.templates || [],
			hasHandler: detail.hasHandler !== false,
			subRows: childRows && childRows.length > 0 ? childRows : undefined,
		})
	}
	return rows
}

// Normalize all core commands into a nested tree
const commandTree = computed<CoreCommandRow[]>(() => {
	if (!commandsList.value)
		return []

	return commandsList.value.map((cmd) => {
		const parentTriggerPath = `!${cmd.activeTrigger}`
		const childRows = cmd.subcommands
			? buildSubRows(cmd.subcommands, cmd.id, parentTriggerPath, '')
			: undefined

		return {
			id: cmd.id,
			rootCommandId: cmd.id,
			trigger: cmd.trigger,
			activeTrigger: cmd.activeTrigger,
			fullTriggerPath: parentTriggerPath,
			description: cmd.description || '',
			usage: cmd.usage,
			permission: cmd.permission || 'everyone',
			enabled: cmd.enabled,
			cost: cmd.cost,
			globalCooldown: cmd.globalCooldown,
			userCooldown: cmd.userCooldown,
			allowWhisper: cmd.allowWhisper,
			whisperSilentResponse: cmd.whisperSilentResponse,
			hidden: cmd.hidden,
			aliases: cmd.aliases || [],
			templates: cmd.templates || [],
			hasHandler: true,
			subRows: childRows && childRows.length > 0 ? childRows : undefined,
		}
	})
})

function rowMatchesFilter(row: CoreCommandRow, filter: string): boolean {
	const match = row.activeTrigger.toLowerCase().includes(filter)
		|| row.id.toLowerCase().includes(filter)
		|| row.fullTriggerPath.toLowerCase().includes(filter)
		|| (row.description && row.description.toLowerCase().includes(filter))

	if (match)
		return true

	if (row.subRows && row.subRows.length > 0) {
		return row.subRows.some(child => rowMatchesFilter(child, filter))
	}

	return false
}

function filterTree(rows: CoreCommandRow[], filter: string): CoreCommandRow[] {
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

const filteredCommands = computed<CoreCommandRow[]>(() => {
	const filter = searchQuery.value.trim().toLowerCase()
	if (!filter)
		return commandTree.value

	return filterTree(commandTree.value, filter)
})

// TanStack Column Definitions
const columnHelper = createColumnHelper<CoreCommandRow>()

const columns = [
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

				h('div', { class: 'flex flex-col gap-0.5 min-w-0' }, [
					h('div', {
						class: cn('flex flex-wrap items-baseline gap-2', hasChildren && 'cursor-pointer select-none'),
						onClick: hasChildren ? () => row.toggleExpanded() : undefined,
					}, [
						h('span', { class: 'font-bold whitespace-nowrap text-foreground' }, item.fullTriggerPath),
						depth === 0 && item.activeTrigger !== item.id
							? h('span', { class: 'rounded-sm bg-muted/65 px-1.5 py-0.5 font-mono text-xs text-muted-foreground' }, item.id)
							: null,
						item.hidden
							? h(Badge, { variant: 'outline', class: 'border-muted-foreground/30 text-[9px] text-muted-foreground' }, () => 'Hidden')
							: null,
						item.hasHandler === false
							? h(Badge, {
									variant: 'outline',
									class: 'border-amber-500/20 bg-amber-500/5 px-1 py-0 text-[9px] font-medium text-amber-600 dark:text-amber-400',
								}, () => 'Route Group')
							: null,
					]),
					item.description
						? h('span', { class: 'line-clamp-1 max-w-72 text-xs text-muted-foreground' }, item.description)
						: null,
				]),
			])
		},
	}),
	columnHelper.accessor('permission', {
		header: 'Permission',
		cell: info => h(CommandPermissionBadge, { permission: info.getValue() || 'everyone' }),
	}),
	columnHelper.accessor('cost', {
		header: 'Points Cost',
		cell: info => h(CommandPointsBadge, { cost: info.getValue() }),
	}),
	columnHelper.display({
		id: 'cooldowns',
		header: 'Cooldowns',
		cell: ({ row }) => h(CommandCooldownsDisplay, {
			global: row.original.globalCooldown,
			user: row.original.userCooldown,
		}),
	}),
	columnHelper.display({
		id: 'status',
		header: () => h('div', { class: 'text-center' }, 'Status'),
		cell: ({ row }) => h('div', { class: 'flex justify-center' }, [
			h(Switch, {
				'modelValue': row.original.enabled,
				'onUpdate:modelValue': (val: boolean) => {
					row.original.enabled = val
					toggleCommandActive(row.original)
				},
			}),
		]),
	}),
	columnHelper.display({
		id: 'actions',
		header: () => h('div', { class: 'text-right' }, 'Actions'),
		cell: ({ row }) => {
			const item = row.original
			const templatePath = `/admin/commands/${item.rootCommandId}`

			return h('div', { class: 'flex items-center justify-end gap-1.5' }, [
				h(Button, {
					size: 'sm',
					variant: 'outline',
					onClick: () => openQuickEdit(item),
				}, () => [
					h(Settings, { 'data-icon': 'inline-start' }),
					'Config',
				]),
				row.depth === 0 && item.hasHandler !== false
					? h(Button, {
							variant: 'outline',
							size: 'sm',
							asChild: true,
						}, () => [
							h(resolveComponent('NuxtLink'), { to: templatePath }, () => [
								h(MessageSquare, { 'data-icon': 'inline-start' }),
								'Templates',
							]),
						])
					: null,
			])
		},
	}),
]
</script>

<template>
	<AppSettingsPage
		heading="Command Management"
		subheading="Configure point costs, dynamic execution cooldowns, trigger aliases, and chat response templates."
	>
		<template #header-actions>
			<Button variant="ghost" :disabled="loading" @click="refreshCommands">
				<RefreshCcw :class="{ 'animate-spin': loading }" />
			</Button>
		</template>

		<!-- Command Controls and Dashboard Table -->
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
						placeholder="Search trigger or description..."
					/>
				</InputGroup>

				<div class="text-xs text-muted-foreground select-none">
					Showing {{ filteredCommands.length }} of {{ commandsList?.length || 0 }} core commands
				</div>
			</div>

			<!-- DataTable Component -->
			<DataTable
				v-model:expanded="expandedState"
				:columns="columns"
				:data="filteredCommands"
				:loading="loading"
				loading-text="Loading bot commands..."
				:get-sub-rows="(row: CoreCommandRow) => row.subRows"
				:auto-reset-expanded="false"
			>
				<template #empty>
					No commands found matching your search.
				</template>
			</DataTable>

			<!-- Command Edit Slide-over Sheet -->
			<CommandEditSheet
				:command="selectedCommand"
				:open="isSheetOpen"
				@update:open="isSheetOpen = $event"
				@saved="refreshCommands"
			/>
		</div>
	</AppSettingsPage>
</template>
