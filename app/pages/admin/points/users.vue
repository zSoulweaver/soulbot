<script setup lang="ts">
import { createColumnHelper } from '@tanstack/vue-table'
import { Loader2, PencilIcon, PlusIcon, SearchIcon } from 'lucide-vue-next'
import { computed, h, ref } from 'vue'
import DataTable from '@/components/ui/data-table/DataTable.vue'
import UserPointsEditSheet from '~/components/points/UserPointsEditSheet.vue'
import { Button } from '~/components/ui/button'
import { usePagination } from '~/composables/usePagination'

interface User {
	id: string
	username: string
	displayName: string
	points: number
}

const {
	page: currentPage,
	limit: itemsPerPage,
	search: searchQuery,
	data: usersData,
	refresh: refreshUsers,
	loading: loadingTable,
} = usePagination<{ data: User[], meta: any }>('/api/users')

const paginatedUsers = computed(() => usersData.value?.data || [])
const totalUsers = computed(() => usersData.value?.meta?.total || 0)

const startIndex = computed(() => {
	if (totalUsers.value === 0)
		return 0
	return (currentPage.value - 1) * itemsPerPage.value + 1
})

const endIndex = computed(() => {
	return Math.min(currentPage.value * itemsPerPage.value, totalUsers.value)
})

// Point adjustment state
const isAdjustSheetOpen = ref(false)
const selectedUserForAdjustment = ref<User | null>(null)

function openAdjustSheet(user: User) {
	selectedUserForAdjustment.value = user
	isAdjustSheetOpen.value = true
}

function openAdjustSheetForNewUser() {
	const clean = searchQuery.value.trim().toLowerCase()
	if (!clean)
		return
	selectedUserForAdjustment.value = {
		id: '',
		username: clean,
		displayName: searchQuery.value.trim(),
		points: 0,
	}
	isAdjustSheetOpen.value = true
}

// Table Columns
const columnHelper = createColumnHelper<User>()
const columns: any[] = [
	columnHelper.accessor('username', {
		header: 'User',
		cell: info => info.getValue(),
	}),
	columnHelper.accessor('displayName', {
		header: 'Display Name',
		cell: info => info.getValue(),
	}),
	columnHelper.accessor('points', {
		header: 'Points',
		cell: info => h('span', { class: 'font-mono font-medium tabular-nums' }, info.getValue().toLocaleString()),
	}),
	columnHelper.display({
		id: 'actions',
		header: () => h('div', { class: 'text-right' }, 'Actions'),
		cell: info => h('div', { class: 'flex justify-end' }, [
			h(Button, {
				variant: 'outline',
				size: 'sm',
				onClick: () => openAdjustSheet(info.row.original),
			}, [
				h(PencilIcon),
				'Adjust Points',
			]),
		]),
	}),
]
</script>

<template>
	<AppPageContainer>
		<AppPageHeader heading="Points Balances" subheading="Manage user points and view the points database." />

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
						placeholder="Search username..."
						class="h-9 pl-8"
					/>
				</div>

				<div class="text-xs text-muted-foreground select-none">
					Showing {{ paginatedUsers.length }} of {{ totalUsers }} users
				</div>
			</div>

			<!-- Table container -->
			<div class="relative min-h-50">
				<DataTable
					v-if="paginatedUsers.length > 0"
					:columns="columns"
					:data="paginatedUsers"
				/>
				<div v-else-if="loadingTable" class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/50">
					<Loader2 class="size-6 animate-spin text-primary" />
					<span class="text-sm text-muted-foreground">Loading users...</span>
				</div>
				<div v-else class="flex flex-col items-center justify-center gap-3 rounded-lg border bg-muted/20 py-12 text-center text-sm text-muted-foreground select-none">
					<span>No users found matching your search.</span>
					<Button
						v-if="searchQuery.trim()"
						size="sm"
						@click="openAdjustSheetForNewUser"
					>
						<PlusIcon data-icon="inline-start" />
						Add "{{ searchQuery.trim() }}" & Set Points
					</Button>
				</div>
			</div>

			<!-- Bottom Pagination Row -->
			<div
				v-if="totalUsers > 0" class="
					flex flex-col items-center justify-between gap-4 select-none
					sm:flex-row
				"
			>
				<span class="text-xs text-muted-foreground">
					Showing {{ startIndex }}-{{ endIndex }} of {{ totalUsers }} users
				</span>

				<Pagination
					v-model:page="currentPage"
					:total="totalUsers"
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

		<!-- Points Adjust Sheet Slide-over -->
		<UserPointsEditSheet
			v-model:open="isAdjustSheetOpen"
			:user="selectedUserForAdjustment"
			@saved="refreshUsers"
		/>
	</AppPageContainer>
</template>
