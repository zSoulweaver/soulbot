<script setup lang="ts">
import type { AutoExclusion, ExcludedUser } from '~/types/points'
import { createColumnHelper } from '@tanstack/vue-table'
import { Loader2, PlusIcon, SearchIcon, TrashIcon } from 'lucide-vue-next'
import { computed, h, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '~/components/ui/button'
import { usePagination } from '~/composables/usePagination'

const {
	page: currentPage,
	limit: itemsPerPage,
	search: searchQuery,
	data,
	refresh,
	loading: loadingTable,
} = usePagination<{ manualExclusions: { data: ExcludedUser[], meta: any }, autoExclusions: AutoExclusion[] }>('/api/points/exclusions')

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
	isDeleting.value = id
	try {
		await $fetch(`/api/points/exclusions/${id}`, { method: 'DELETE' })
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
			}, [
				isDeleting.value === info.row.original.id
					? h(Loader2, { 'class': 'animate-spin', 'data-icon': 'inline-start' })
					: h(TrashIcon, { 'data-icon': 'inline-start' }),
				'Remove',
			]),
		]),
	}),
]
</script>

<template>
	<AppPageContainer>
		<AppPageHeader
			heading="Payout Exclusions"
			subheading="Manage accounts that are excluded from watch-time points payouts."
		>
			<Button size="sm" class="h-9 shrink-0 gap-1.5" @click="isAddSheetOpen = true">
				<PlusIcon data-icon="inline-start" />
				Add Exclusion
			</Button>
		</AppPageHeader>

		<!-- System Exclusions Callout -->
		<Alert
			variant="info"
		>
			<AlertTitle
				class="
					font-semibold text-blue-700
					dark:text-blue-300
				"
			>
				System Exclusions
			</AlertTitle>
			<AlertDescription>
				The bot account, <strong>{{ data?.autoExclusions?.[0]?.displayName || 'bot' }}</strong> is automatically excluded from all watch-time points payouts.
			</AlertDescription>
		</Alert>

		<div class="flex flex-col gap-2">
			<!-- Search & Count Control Row -->
			<div
				class="
					flex flex-col gap-4 py-2
					sm:flex-row sm:items-center sm:justify-between
				"
			>
				<div class="relative w-full max-w-sm">
					<SearchIcon class="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						v-model="searchQuery"
						type="search"
						placeholder="Search username or reason..."
						class="h-9 pl-8"
					/>
				</div>

				<div class="text-xs text-muted-foreground select-none">
					Showing {{ paginatedExclusions.length }} of {{ filteredTotal }} exclusions
				</div>
			</div>

			<!-- Table container -->
			<div class="relative min-h-50">
				<DataTable
					v-if="paginatedExclusions.length > 0"
					:columns="columns"
					:data="paginatedExclusions"
				/>
				<div v-else-if="loadingTable" class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/50">
					<Loader2 class="size-6 animate-spin text-primary" />
					<span class="text-sm text-muted-foreground">Loading exclusions...</span>
				</div>
				<div v-else class="rounded-lg border bg-muted/20 py-12 text-center text-sm text-muted-foreground">
					No excluded users found.
				</div>
			</div>

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
	</AppPageContainer>
</template>
