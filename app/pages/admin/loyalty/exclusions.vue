<script setup lang="ts">
import type { AutoExclusion, ExcludedUser } from '~/types/loyalty'
import { PlusIcon, SearchIcon, TrashIcon } from '@lucide/vue'
import { createColumnHelper } from '@tanstack/vue-table'
import { computed, h, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '~/components/ui/button'
import { Spinner } from '~/components/ui/spinner'
import { usePagination } from '~/composables/usePagination'

const {
	page: currentPage,
	limit: itemsPerPage,
	search: searchQuery,
	data,
	refresh,
	loading: loadingTable,
} = usePagination<{ manualExclusions: { data: ExcludedUser[], meta: any }, autoExclusions: AutoExclusion[] }>('/api/loyalty/exclusions')

useHead({
	title: 'Payout Exclusions',
})

const isDeleting = ref<string | null>(null)
const isAddSheetOpen = ref(false)

const paginatedExclusions = computed(() => data.value?.manualExclusions?.data || [])
const filteredTotal = computed(() => data.value?.manualExclusions?.meta?.total || 0)

const startIndex = computed(() => {
	if (filteredTotal.value === 0)
		return 0
	return (currentPage.value - 1) * itemsPerPage.value + 1
})

const endIndex = computed(() => {
	return Math.min(currentPage.value * itemsPerPage.value, filteredTotal.value)
})

async function removeExclusion(id: string) {
	if (isDeleting.value === id)
		return
	isDeleting.value = id
	try {
		await $fetch(`/api/loyalty/exclusions/${id}`, { method: 'DELETE' })
		toast.success('Exclusion removed successfully')
		await refresh()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to remove exclusion')
	}
	finally {
		isDeleting.value = null
	}
}

const columnHelper = createColumnHelper<ExcludedUser>()
const columns: any[] = [
	columnHelper.accessor('displayName', {
		header: 'User',
		cell: info => h('div', { class: 'flex items-center gap-2' }, [
			h('span', { class: 'font-semibold' }, info.getValue()),
			h('span', { class: 'text-xs text-muted-foreground' }, `(${info.row.original.username})`),
		]),
	}),
	columnHelper.accessor('reason', {
		header: 'Reason',
		cell: (info) => {
			const reason = info.getValue()
			return reason ? h('span', { class: 'text-muted-foreground' }, reason) : h('span', { class: 'text-muted-foreground/50 italic' }, 'No reason provided')
		},
	}),
	columnHelper.accessor('createdAt', {
		header: 'Excluded At',
		cell: info => h('span', { class: 'text-sm' }, new Date(info.getValue()).toLocaleString()),
	}),
	columnHelper.display({
		id: 'actions',
		header: () => h('div', { class: 'text-right' }, 'Actions'),
		cell: info => h('div', { class: 'flex justify-end' }, [
			h(Button, {
				variant: 'ghostDestructive',
				size: 'sm',
				disabled: isDeleting.value === info.row.original.id,
				onClick: () => removeExclusion(info.row.original.id),
			}, () => [
				isDeleting.value === info.row.original.id
					? h(Spinner, { 'data-icon': 'inline-start' })
					: h(TrashIcon, { 'data-icon': 'inline-start' }),
				'Remove',
			]),
		]),
	}),
]
</script>

<template>
	<AppSettingsPage
		heading="Payout Exclusions"
		subheading="Manage accounts that are excluded from watch time & points payouts."
	>
		<template #header-actions>
			<Button size="sm" class="h-9 shrink-0 gap-1.5" @click="isAddSheetOpen = true">
				<PlusIcon data-icon="inline-start" />
				Add Exclusion
			</Button>
			<AppRefreshButton :loading="loadingTable" @click="refresh" />
		</template>
		<!-- System Exclusions Callout -->
		<Alert
			variant="info"
		>
			<AlertTitle>
				System Exclusions
			</AlertTitle>
			<AlertDescription>
				The bot account, <strong>{{ data?.autoExclusions?.[0]?.displayName || 'bot' }}</strong> is automatically excluded from all watch time & points payouts.
			</AlertDescription>
		</Alert>

		<div class="flex flex-col gap-4">
			<InputGroup class="w-full max-w-sm">
				<InputGroupAddon>
					<SearchIcon class="text-muted-foreground" />
				</InputGroupAddon>
				<InputGroupInput
					v-model="searchQuery"
					type="search"
					placeholder="Search username or reason..."
				/>
			</InputGroup>

			<DataTable
				:columns="columns"
				:data="paginatedExclusions"
				:loading="loadingTable"
				loading-text="Loading exclusions..."
			>
				<template #empty>
					No excluded users found.
				</template>
			</DataTable>

			<!-- Bottom Pagination Row -->
			<div
				v-if="filteredTotal > 0" class="
					flex flex-col items-center justify-between gap-4 select-none
					sm:flex-row
				"
			>
				<span class="text-xs text-muted-foreground">
					Showing {{ startIndex }}-{{ endIndex }} of {{ filteredTotal }} exclusions
				</span>

				<Pagination
					v-model:page="currentPage"
					:total="filteredTotal"
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

		<!-- Add Exclusion Slide-over Sheet Component -->
		<ExclusionAddSheet
			v-model:open="isAddSheetOpen"
			:default-username="searchQuery"
			@added="refresh"
		/>
	</AppSettingsPage>
</template>
