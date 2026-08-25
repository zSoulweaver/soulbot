<script setup lang="ts">
import { PencilIcon, PlusIcon, SearchIcon } from '@lucide/vue'
import { createColumnHelper } from '@tanstack/vue-table'
import { computed, h, ref } from 'vue'
import DataTable from '@/components/ui/data-table/DataTable.vue'
import UserWatchTimeEditSheet from '~/components/loyalty/UserWatchTimeEditSheet.vue'
import { Button } from '~/components/ui/button'
import { usePagination } from '~/composables/usePagination'

interface User {
	id: string
	username: string
	displayName: string
	watchTime: number
}

const {
	page: currentPage,
	limit: itemsPerPage,
	search: searchQuery,
	data: usersData,
	refresh: refreshUsers,
	loading: loadingTable,
} = usePagination<{ data: User[], meta: any }>('/api/users', {
	defaultParams: { sortBy: 'watchTime' },
})

useHead({
	title: 'Watch Time Balances',
})

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

// Watch Time adjustment state
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
		watchTime: 0,
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
	columnHelper.accessor('watchTime', {
		header: 'Watch Time',
		cell: info => h('div', { class: 'flex flex-col gap-0.5' }, [
			h('span', { class: 'font-medium text-foreground tabular-nums text-sm' }, formatWatchTime(info.getValue())),
			h('span', { class: 'text-[10px] font-bold text-muted-foreground uppercase tracking-wider' }, `(${info.getValue().toLocaleString()} mins)`),
		]),
	}),
	columnHelper.display({
		id: 'actions',
		header: () => h('div', { class: 'text-right' }, 'Actions'),
		cell: info => h('div', { class: 'flex justify-end' }, [
			h(Button, {
				variant: 'ghostPrimary',
				size: 'sm',
				onClick: () => openAdjustSheet(info.row.original),
			}, () => [
				h(PencilIcon, { 'data-icon': 'inline-start' }),
				'Adjust Watch Time',
			]),
		]),
	}),
]
</script>

<template>
	<AppSettingsPage
		heading="Watch Time Balances"
		subheading="Manage viewer watch times and search the viewer loyalty database."
	>
		<template #header-actions>
			<AppRefreshButton :loading="loadingTable" @click="refreshUsers" />
		</template>
		<div class="flex flex-col gap-4">
			<InputGroup class="w-full max-w-sm">
				<InputGroupAddon>
					<SearchIcon class="text-muted-foreground" />
				</InputGroupAddon>
				<InputGroupInput
					v-model="searchQuery"
					type="search"
					placeholder="Search username..."
				/>
			</InputGroup>

			<div class="overflow-hidden rounded-lg border">
				<DataTable
					:columns="columns"
					:data="paginatedUsers"
					:loading="loadingTable"
					loading-text="Loading users..."
				>
					<template #empty>
						<div class="flex flex-col items-center justify-center gap-3 py-6 text-center">
							<span>No users found matching your search.</span>
							<Button
								v-if="searchQuery.trim()"
								size="sm"
								@click="openAdjustSheetForNewUser"
							>
								<PlusIcon data-icon="inline-start" />
								Add "{{ searchQuery.trim() }}" & Set Watch Time
							</Button>
						</div>
					</template>
				</DataTable>
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

		<!-- Watch Time Adjust Sheet Slide-over -->
		<UserWatchTimeEditSheet
			v-model:open="isAdjustSheetOpen"
			:user="selectedUserForAdjustment"
			@saved="refreshUsers"
		/>
	</AppSettingsPage>
</template>
