<script setup lang="ts">
import type { Timer } from '~/types/timers'
import { Plus, Search, Settings, Trash2 } from '@lucide/vue'
import { createColumnHelper } from '@tanstack/vue-table'
import { computed, h, ref, resolveComponent } from 'vue'
import { toast } from 'vue-sonner'
import DataTable from '@/components/ui/data-table/DataTable.vue'
import TimerEditSheet from '~/components/timers/TimerEditSheet.vue'
import TimerMessagesHoverCard from '~/components/timers/TimerMessagesHoverCard.vue'
import { Button } from '~/components/ui/button'
import { Switch } from '~/components/ui/switch'
import { usePagination } from '~/composables/usePagination'

const {
	page: currentPage,
	limit: itemsPerPage,
	search: searchQuery,
	data: timersData,
	refresh: refreshTimers,
	loading: loadingTable,
} = usePagination<{ data: Timer[], meta: any }>('/api/timers')

const paginatedTimers = computed(() => timersData.value?.data || [])
const totalTimers = computed(() => timersData.value?.meta?.total || 0)

const startIndex = computed(() => {
	if (totalTimers.value === 0)
		return 0
	return (currentPage.value - 1) * itemsPerPage.value + 1
})

const endIndex = computed(() => {
	return Math.min(currentPage.value * itemsPerPage.value, totalTimers.value)
})

const isSheetOpen = ref(false)
const selectedTimer = ref<Timer | null>(null)

const isDeleteDialogOpen = ref(false)
const timerToDelete = ref<Timer | null>(null)

function openCreateSheet() {
	selectedTimer.value = null
	isSheetOpen.value = true
}

function openEditSheet(timer: Timer) {
	selectedTimer.value = timer
	isSheetOpen.value = true
}

async function toggleTimerActive(timer: Timer) {
	try {
		await $fetch('/api/timers', {
			method: 'PUT',
			body: {
				id: timer.id,
				name: timer.name,
				enabled: timer.enabled,
				messages: timer.messages,
				intervalOnline: timer.intervalOnline,
				intervalOffline: timer.intervalOffline,
				minMessages: timer.minMessages,
			},
		})
		toast.success(`Timer '${timer.name}' has been ${timer.enabled ? 'enabled' : 'disabled'}!`)
		await refreshTimers()
	}
	catch (error: any) {
		toast.error(error.data?.statusMessage || 'Failed to update timer state.')
		// Revert UI state on failure
		timer.enabled = !timer.enabled
	}
}

function deleteTimer(timer: Timer) {
	timerToDelete.value = timer
	isDeleteDialogOpen.value = true
}

async function confirmDelete() {
	if (!timerToDelete.value)
		return

	const timer = timerToDelete.value
	try {
		await $fetch('/api/timers', {
			method: 'DELETE',
			body: { id: timer.id },
		})
		toast.success(`Timer '${timer.name}' deleted successfully.`)
		await refreshTimers()
	}
	catch (error: any) {
		toast.error(error.data?.statusMessage || 'Failed to delete timer.')
	}
	finally {
		isDeleteDialogOpen.value = false
		timerToDelete.value = null
	}
}

function formatInterval(minutes: number) {
	if (minutes <= 0)
		return 'Disabled'
	return `${minutes} min${minutes > 1 ? 's' : ''}`
}

function formatLastRun(lastTriggeredAt: string | null) {
	if (!lastTriggeredAt)
		return 'Never'
	const date = new Date(lastTriggeredAt)
	return `${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`
}

const columnHelper = createColumnHelper<Timer>()
const columns: any[] = [
	columnHelper.accessor('name', {
		header: 'Timer Name',
		cell: info => h('span', { class: 'font-semibold text-foreground text-sm' }, info.getValue()),
	}),
	columnHelper.display({
		id: 'messages',
		header: 'Messages',
		cell: info => h(TimerMessagesHoverCard, { timer: info.row.original }),
	}),
	columnHelper.accessor('intervalOnline', {
		header: 'Online Interval',
		cell: info => formatInterval(info.getValue()),
	}),
	columnHelper.accessor('intervalOffline', {
		header: 'Offline Interval',
		cell: info => formatInterval(info.getValue()),
	}),
	columnHelper.accessor('minMessages', {
		header: 'Min Messages',
		cell: info => info.getValue() > 0 ? `${info.getValue()} msgs` : 'None',
	}),
	columnHelper.accessor('lastTriggeredAt', {
		header: 'Last Run',
		cell: info => h(
			resolveComponent('ClientOnly'),
			{},
			{
				default: () => formatLastRun(info.getValue() ? String(info.getValue()) : null),
				fallback: () => 'Never',
			},
		),
	}),
	columnHelper.display({
		id: 'enabled',
		header: () => h('div', { class: 'text-center' }, 'Status'),
		cell: (info) => {
			const timer = info.row.original
			return h('div', { class: 'flex justify-center' }, [
				h(Switch, {
					'checked': timer.enabled,
					'onUpdate:checked': (val: boolean) => {
						timer.enabled = val
						toggleTimerActive(timer)
					},
				}),
			])
		},
	}),
	columnHelper.display({
		id: 'actions',
		header: () => h('div', { class: 'text-right' }, 'Actions'),
		cell: (info) => {
			const timer = info.row.original
			return h('div', { class: 'flex justify-end gap-1.5' }, [
				h(Button, {
					size: 'sm',
					variant: 'outline',
					onClick: () => openEditSheet(timer),
				}, () => [
					h(Settings, { 'data-icon': 'inline-start' }),
					'Config',
				]),
				h(Button, {
					size: 'sm',
					variant: 'ghostDestructive',
					onClick: () => deleteTimer(timer),
				}, () => [
					h(Trash2, { 'data-icon': 'inline-start' }),
					'Remove',
				]),
			])
		},
	}),
]
</script>

<template>
	<AppPageContainer>
		<AppPageHeader
			heading="Message Timers"
			subheading="Set up automated, rotating chat announcements to be sent to Twitch chat at specified time intervals."
		>
			<div class="flex items-center gap-2">
				<Button variant="outline" :disabled="loadingTable" @click="refreshTimers">
					Refresh List
				</Button>
				<Button @click="openCreateSheet">
					<Plus data-icon="inline-start" />
					Add Timer
				</Button>
			</div>
		</AppPageHeader>

		<div class="flex flex-col gap-4">
			<!-- Search & Count Control Row -->
			<InputGroup class="w-full max-w-sm">
				<InputGroupAddon>
					<Search class="text-muted-foreground" />
				</InputGroupAddon>
				<InputGroupInput
					v-model="searchQuery"
					type="search"
					placeholder="Search timers..."
				/>
			</InputGroup>

			<DataTable
				:columns="columns"
				:data="paginatedTimers"
				:loading="loadingTable"
				loading-text="Loading timers..."
			>
				<template #empty>
					<span>No timers found matching your search.</span>
				</template>
			</DataTable>

			<div
				v-if="totalTimers > 0"
				class="
					flex flex-col items-center justify-between gap-4 py-2 select-none
					sm:flex-row
				"
			>
				<span class="text-xs text-muted-foreground">
					Showing {{ startIndex }}-{{ endIndex }} of {{ totalTimers }} timers
				</span>

				<Pagination
					v-model:page="currentPage"
					:total="totalTimers"
					:sibling-count="1"
					:items-per-page="itemsPerPage"
					class="mx-0 w-auto"
				>
					<PaginationContent>
						<PaginationFirst />
						<PaginationPrevious />
						<PaginationNext />
						<PaginationLast />
					</PaginationContent>
				</Pagination>
			</div>
		</div>

		<!-- Timer Edit Sheet -->
		<TimerEditSheet
			:timer="selectedTimer"
			:open="isSheetOpen"
			@update:open="isSheetOpen = $event"
			@saved="refreshTimers"
		/>

		<!-- Deletion confirmation alert dialog -->
		<AlertDialog :open="isDeleteDialogOpen" @update:open="isDeleteDialogOpen = $event">
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
					<AlertDialogDescription>
						This will permanently delete the timer
						<span class="font-bold text-foreground">{{ timerToDelete?.name }}</span>.
						This action cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel @click="timerToDelete = null">
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction @click="confirmDelete">
						Delete Timer
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	</AppPageContainer>
</template>
