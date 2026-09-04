<script setup lang="ts">
import type { DeathsListResponse, GameDeathRecord } from '~/types/deaths'
import { Gamepad2, PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from '@lucide/vue'
import { createColumnHelper } from '@tanstack/vue-table'
import { computed, h, ref, resolveComponent } from 'vue'
import { toast } from 'vue-sonner'
import DataTable from '@/components/ui/data-table/DataTable.vue'
import GameDeathsEditSheet from '~/components/deaths/GameDeathsEditSheet.vue'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { usePagination } from '~/composables/usePagination'

useHead({
	title: 'Game Deaths',
})

const {
	page: currentPage,
	limit: itemsPerPage,
	search: searchQuery,
	data: deathsData,
	refresh: refreshDeaths,
	loading: loadingTable,
} = usePagination<DeathsListResponse>('/api/admin/deaths')

const paginatedDeaths = computed(() => deathsData.value?.data || [])
const currentGame = computed(() => deathsData.value?.currentGame || '')
const totalDeaths = computed(() => deathsData.value?.meta?.total || 0)

const startIndex = computed(() => {
	if (totalDeaths.value === 0)
		return 0
	return (currentPage.value - 1) * itemsPerPage.value + 1
})

const endIndex = computed(() => {
	return Math.min(currentPage.value * itemsPerPage.value, totalDeaths.value)
})

// Adjustment sheet state
const isSheetOpen = ref(false)
const selectedRecord = ref<GameDeathRecord | null>(null)

function openEditSheet(record: GameDeathRecord) {
	selectedRecord.value = record
	isSheetOpen.value = true
}

function openAddSheet() {
	selectedRecord.value = null
	isSheetOpen.value = true
}

async function deleteRecord(record: GameDeathRecord) {
	try {
		await $fetch(`/api/admin/deaths/${record.id}`, {
			method: 'DELETE',
		})
		toast.success(`Deleted death counter for "${record.gameName}"`)
		refreshDeaths()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to delete record')
	}
}

// Table Columns
const columnHelper = createColumnHelper<GameDeathRecord>()
const columns: any[] = [
	columnHelper.accessor('gameName', {
		header: 'Game',
		cell: (info) => {
			const game = info.getValue()
			const row = info.row.original
			const isLive = game.toLowerCase() === currentGame.value.toLowerCase()
			const hasCustomActive = row.activeCounterName && row.activeCounterName.toLowerCase() !== 'default'

			const boxArtEl = row.boxArtUrl
				? h('img', {
						src: row.boxArtUrl,
						alt: game,
						class: 'h-12 w-9 rounded-sm object-cover border border-border/50 bg-muted/40 shrink-0',
					})
				: h('div', {
						class: 'h-12 w-9 rounded-sm border border-border/50 bg-muted/50 flex items-center justify-center text-muted-foreground shrink-0',
					}, [h(Gamepad2, { class: 'size-4 opacity-40' })])

			return h('div', { class: 'flex items-center gap-3 font-medium' }, [
				boxArtEl,
				h('div', { class: 'flex flex-col gap-1' }, [
					h('div', { class: 'flex items-center gap-2' }, [
						h('span', { class: 'font-semibold text-foreground' }, game),
						isLive ? h(Badge, { variant: 'default', class: 'text-[10px] uppercase font-bold' }, () => 'Currently Live') : null,
					]),
					h('div', { class: 'flex items-center gap-1.5 text-xs text-muted-foreground' }, [
						hasCustomActive
							? h(Badge, { variant: 'outline', class: 'text-[10px] px-1.5 py-0 font-medium' }, () => `Active: ${row.activeCounterName}`)
							: null,
						h('span', `${row.counters?.length || 1} counter(s)`),
					]),
				]),
			])
		},
	}),
	columnHelper.accessor('deaths', {
		header: 'Total Deaths',
		cell: info => h('span', { class: 'font-bold tabular-nums text-primary text-base' }, info.getValue().toLocaleString()),
	}),
	columnHelper.accessor('updatedAt', {
		header: 'Last Updated',
		cell: (info) => {
			const val = info.getValue()
			if (!val)
				return '-'
			const date = typeof val === 'number' ? new Date(val * 1000) : new Date(val)
			return h(
				resolveComponent('ClientOnly'),
				{},
				{
					default: () => h('span', { class: 'text-xs text-muted-foreground' }, date.toLocaleString()),
					fallback: () => h('span', { class: 'text-xs text-muted-foreground' }, '--'),
				},
			)
		},
	}),
	columnHelper.display({
		id: 'actions',
		header: () => h('div', { class: 'text-right' }, 'Actions'),
		cell: info => h('div', { class: 'flex justify-end gap-2' }, [
			h(Button, {
				variant: 'ghostPrimary',
				size: 'sm',
				onClick: () => openEditSheet(info.row.original),
			}, () => [
				h(PencilIcon, { 'data-icon': 'inline-start' }),
				'Manage Counters',
			]),
			h(Tooltip, null, () => [
				h(TooltipTrigger, { asChild: true }, () => [
					h(Button, {
						variant: 'ghostDestructive',
						size: 'icon-sm',
						onClick: () => deleteRecord(info.row.original),
					}, () => [
						h(Trash2Icon),
						h('span', { class: 'sr-only' }, 'Delete game record'),
					]),
				]),
				h(TooltipContent, { side: 'bottom' }, () => 'Delete game record'),
			]),
		]),
	}),
]
</script>

<template>
	<AppSettingsPage
		heading="Deaths"
		subheading="Track and adjust death counts per game for Twitch stream command responses."
	>
		<template #header-actions>
			<Button @click="openAddSheet">
				<PlusIcon data-icon="inline-start" />
				Add Game
			</Button>
			<AppRefreshButton :loading="loadingTable" @click="refreshDeaths" />
		</template>

		<div class="flex flex-col gap-4">
			<InputGroup class="w-full max-w-sm">
				<InputGroupAddon>
					<SearchIcon class="text-muted-foreground" />
				</InputGroupAddon>
				<InputGroupInput
					v-model="searchQuery"
					type="search"
					placeholder="Search game..."
				/>
			</InputGroup>

			<DataTable
				:columns="columns"
				:data="paginatedDeaths"
				:loading="loadingTable"
				loading-text="Loading death counters..."
			>
				<template #empty>
					<div class="flex flex-col items-center justify-center gap-3 py-8 text-center">
						<Gamepad2 class="size-10 text-muted-foreground/50" />
						<div class="flex flex-col gap-1">
							<span class="font-semibold text-foreground">No game deaths found</span>
							<span class="text-xs text-muted-foreground">Start tracking deaths by using !deaths in Twitch chat or adding a game counter manually.</span>
						</div>
						<Button size="sm" class="mt-2" @click="openAddSheet">
							<PlusIcon data-icon="inline-start" />
							Add Game Counter
						</Button>
					</div>
				</template>
			</DataTable>

			<!-- Bottom Pagination Row -->
			<div
				v-if="totalDeaths > 0"
				class="
					flex flex-col items-center justify-between gap-4 select-none
					sm:flex-row
				"
			>
				<span class="text-xs text-muted-foreground">
					Showing {{ startIndex }}-{{ endIndex }} of {{ totalDeaths }} games
				</span>

				<Pagination
					v-model:page="currentPage"
					:total="totalDeaths"
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

		<!-- Deaths Edit / Create Sheet -->
		<GameDeathsEditSheet
			v-model:open="isSheetOpen"
			:game-record="selectedRecord"
			@saved="refreshDeaths"
		/>
	</AppSettingsPage>
</template>
