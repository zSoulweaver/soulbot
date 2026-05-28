<script setup lang="ts">
import { createColumnHelper } from '@tanstack/vue-table'
import { HashIcon, Loader2, PlusIcon, SearchIcon } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import DataTable from '@/components/ui/data-table/DataTable.vue'
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

// Manual Adjust State
const targetUsername = ref('')
const amount = ref<number>(0)
const lookupResult = ref<User | null>(null)
const loadingLookup = ref(false)
const adjustError = ref('')
const adjustLoading = ref(false)

async function lookupUser() {
	if (!targetUsername.value)
		return
	loadingLookup.value = true
	adjustError.value = ''
	try {
		const res = await $fetch<{ points: number }>(`/api/points/${targetUsername.value}`)
		lookupResult.value = {
			id: '',
			username: targetUsername.value,
			displayName: targetUsername.value,
			points: res.points,
		}
	}
	catch (err: any) {
		adjustError.value = err.data?.statusMessage || 'User not found'
		lookupResult.value = null
	}
	finally {
		loadingLookup.value = false
	}
}

async function updatePoints(mode: 'add' | 'set') {
	if (!targetUsername.value)
		return
	adjustLoading.value = true
	adjustError.value = ''
	try {
		await $fetch(`/api/points/${targetUsername.value}`, {
			method: 'POST' as any,
			body: {
				amount: amount.value,
				mode,
			},
		})
		amount.value = 0
		await lookupUser() // Refresh lookup display
		await refreshUsers() // Refresh table
	}
	catch (err: any) {
		adjustError.value = err.data?.statusMessage || 'Failed to update points'
	}
	finally {
		adjustLoading.value = false
	}
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
		cell: info => info.getValue().toLocaleString(),
	}),
]
</script>

<template>
	<AppPageContainer>
		<AppPageHeader heading="Points Balances" subheading="Manage user points and view the points database." />

		<!-- Adjustment Form (Keep in a compact Card as it's an action panel) -->
		<Card class="mb-8">
			<CardHeader>
				<CardTitle>Manual Adjustment</CardTitle>
				<CardDescription>Search for a user and adjust their points manually.</CardDescription>
			</CardHeader>
			<CardContent class="flex flex-col gap-4">
				<div class="flex gap-2">
					<FieldGroup class="w-full">
						<Field>
							<FieldLabel for="targetUser">
								Username
							</FieldLabel>
							<InputGroup>
								<InputGroupInput
									id="targetUser"
									v-model="targetUsername"
									placeholder="Search username..."
									@keyup.enter="lookupUser"
								/>
								<InputGroupAddon class="bg-muted px-3">
									<SearchIcon />
								</InputGroupAddon>
							</InputGroup>
						</Field>
					</FieldGroup>
					<div class="flex items-end">
						<Button :disabled="loadingLookup || !targetUsername" @click="lookupUser">
							Lookup
						</Button>
					</div>
				</div>

				<div v-if="lookupResult" class="flex flex-col gap-3 rounded-lg bg-muted p-4">
					<div class="flex items-center justify-between">
						<span class="font-semibold">{{ lookupResult.displayName }}</span>
						<Badge variant="secondary" class="text-lg">
							{{ lookupResult.points.toLocaleString() }} pts
						</Badge>
					</div>

					<div class="grid grid-cols-1 gap-2 pt-2">
						<FieldGroup>
							<Field>
								<FieldLabel for="adjustAmount">
									Amount
								</FieldLabel>
								<Input id="adjustAmount" v-model="amount" type="number" />
							</Field>
						</FieldGroup>
						<div class="flex gap-2">
							<Button class="flex-1" variant="outline" :disabled="adjustLoading" @click="updatePoints('add')">
								<PlusIcon data-icon="inline-start" /> Add
							</Button>
							<Button class="flex-1" :disabled="adjustLoading" @click="updatePoints('set')">
								<HashIcon data-icon="inline-start" /> Set
							</Button>
						</div>
					</div>
				</div>

				<div v-if="adjustError" class="text-sm font-medium text-destructive">
					{{ adjustError }}
				</div>
			</CardContent>
		</Card>

		<!-- Users Table - Redesigned to be Card-Free -->
		<div>
			<!-- Header & Search Control Row -->
			<div
				class="
					flex flex-col gap-4
					md:flex-row md:items-center md:justify-between
				"
			>
				<div>
					<h2 class="text-xl font-bold text-foreground">
						User Database
					</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						Browse all users and their point balances.
					</p>
				</div>

				<div
					class="
						relative flex w-full items-center self-start
						sm:w-64
						md:self-auto
					"
				>
					<SearchIcon class="absolute left-2.5 size-4 text-muted-foreground" />
					<Input
						v-model="searchQuery"
						type="search"
						placeholder="Search username..."
						class="h-9 pl-8"
					/>
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
				<div v-else class="rounded-lg border bg-muted/20 py-12 text-center text-sm text-muted-foreground">
					No users found matching your search.
				</div>
			</div>
		</div>
	</AppPageContainer>
</template>
