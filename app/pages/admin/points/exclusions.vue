<script setup lang="ts">
import type { AutoExclusion, ExcludedUser } from '~/types/points'
import { createColumnHelper } from '@tanstack/vue-table'
import { Loader2, PlusIcon, SearchIcon, ShieldAlert, TrashIcon } from 'lucide-vue-next'
import { computed, h, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '~/components/ui/button'

const { data, refresh, pending: loadingTable } = await useFetch<{ manualExclusions: ExcludedUser[], autoExclusions: AutoExclusion[] }>('/api/points/exclusions')

const isDeleting = ref<string | null>(null)
const isAddSheetOpen = ref(false)

// Search & Pagination States
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Client-side search filtering
const filteredExclusions = computed(() => {
	const query = searchQuery.value.trim().toLowerCase()
	const list = data.value?.manualExclusions || []
	if (!query)
		return list

	return list.filter(user =>
		user.username.toLowerCase().includes(query)
		|| user.displayName.toLowerCase().includes(query)
		|| (user.reason && user.reason.toLowerCase().includes(query)),
	)
})

const filteredTotal = computed(() => filteredExclusions.value.length)

// Reset to first page on search query change
watch(searchQuery, () => {
	currentPage.value = 1
})

// Paginated items
const paginatedExclusions = computed(() => {
	const start = (currentPage.value - 1) * itemsPerPage.value
	const end = start + itemsPerPage.value
	return filteredExclusions.value.slice(start, end)
})

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
		/>

		<!-- System Exclusions Callout -->
		<Alert
			class="
				border-blue-500/20 bg-blue-500/5
				dark:bg-blue-500/10
			"
		>
			<ShieldAlert
				class="
					size-4 text-blue-600
					dark:text-blue-400
				"
			/>
			<AlertTitle
				class="
					font-semibold text-blue-700
					dark:text-blue-300
				"
			>
				System Exclusions
			</AlertTitle>
			<AlertDescription
				class="
					mt-1 text-blue-600/90
					dark:text-blue-400/90
				"
			>
				The bot account, <strong>{{ data?.autoExclusions?.[0]?.displayName || 'bot' }}</strong> is automatically excluded from all watch-time points payouts.
			</AlertDescription>
		</Alert>

		<div>
			<!-- Header & Search/Action Control Row -->
			<div
				class="
					flex flex-col gap-4
					md:flex-row md:items-center md:justify-between
				"
			>
				<div>
					<h2 class="text-xl font-bold text-foreground">
						Excluded Users
					</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						Accounts manually blocked from earning watch-time payout points.
					</p>
				</div>

				<div
					class="
						flex items-center gap-2 self-start
						md:self-auto
					"
				>
					<div
						class="
							relative flex w-full items-center
							sm:w-64
						"
					>
						<SearchIcon class="absolute left-2.5 size-4 text-muted-foreground" />
						<Input
							v-model="searchQuery"
							type="search"
							placeholder="Search username or reason..."
							class="h-9 pl-8"
						/>
					</div>

					<Button size="sm" class="h-9 shrink-0 gap-1.5" @click="isAddSheetOpen = true">
						<PlusIcon data-icon="inline-start" class="size-4" />
						Add Exclusion
					</Button>
				</div>
			</div>
			<!-- Top Pagination Row (Sits directly on top of the table) -->
			<div
				class="
					sticky top-0 z-10 flex flex-col gap-4 bg-background py-4
					sm:flex-row sm:items-center sm:justify-between
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
		</div>

		<!-- Add Exclusion Slide-over Sheet Component -->
		<ExclusionAddSheet
			v-model:open="isAddSheetOpen"
			:default-username="searchQuery"
			@added="refresh"
		/>
	</AppPageContainer>
</template>
