<script setup lang="ts">
import { createColumnHelper } from '@tanstack/vue-table'
import { HashIcon, PlusIcon, SearchIcon } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import DataTable from '@/components/ui/data-table/DataTable.vue'

interface User {
	id: string
	username: string
	displayName: string
	points: number
}

const searchQuery = ref('')
const { data: users, refresh: refreshUsers, pending: loadingTable } = await useFetch<User[]>('/api/users', {
	query: computed(() => ({ q: searchQuery.value })),
	watch: [searchQuery],
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
		// Find in current users list or just show points
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
	<div class="flex flex-col gap-6">
		<div class="flex flex-col gap-1">
			<h1 class="text-3xl font-bold tracking-tight">
				Points Administration
			</h1>
			<p class="text-muted-foreground">
				Manage user points and view the points database.
			</p>
		</div>

		<!-- Adjustment Form -->
		<Card>
			<CardHeader>
				<CardTitle>Manual Adjustment</CardTitle>
				<CardDescription>Search for a user and adjust their points manually.</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="flex gap-2">
					<div class="grid w-full items-center gap-1.5">
						<Label for="targetUser">Username</Label>
						<div class="relative">
							<SearchIcon class="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
							<Input
								id="targetUser"
								v-model="targetUsername"
								placeholder="Search username..."
								class="pl-9"
								@keyup.enter="lookupUser"
							/>
						</div>
					</div>
					<div class="flex items-end">
						<Button :disabled="loadingLookup || !targetUsername" @click="lookupUser">
							Lookup
						</Button>
					</div>
				</div>

				<div v-if="lookupResult" class="space-y-3 rounded-lg bg-muted p-4">
					<div class="flex items-center justify-between">
						<span class="font-semibold">{{ lookupResult.displayName }}</span>
						<Badge variant="secondary" class="text-lg">
							{{ lookupResult.points.toLocaleString() }} pts
						</Badge>
					</div>

					<div class="grid grid-cols-1 gap-2 pt-2">
						<div class="grid w-full items-center gap-1.5">
							<Label for="adjustAmount">Amount</Label>
							<Input id="adjustAmount" v-model="amount" type="number" />
						</div>
						<div class="flex gap-2">
							<Button class="flex-1" variant="outline" :disabled="adjustLoading" @click="updatePoints('add')">
								<PlusIcon class="mr-2 size-4" /> Add
							</Button>
							<Button class="flex-1" :disabled="adjustLoading" @click="updatePoints('set')">
								<HashIcon class="mr-2 size-4" /> Set
							</Button>
						</div>
					</div>
				</div>

				<div v-if="adjustError" class="text-sm font-medium text-destructive">
					{{ adjustError }}
				</div>
			</CardContent>
		</Card>

		<!-- Users Table -->
		<Card>
			<CardHeader>
				<div class="flex items-center justify-between">
					<div>
						<CardTitle>User Database</CardTitle>
						<CardDescription>Browse all users and their point balances.</CardDescription>
					</div>
					<div class="w-64">
						<Input v-model="searchQuery" placeholder="Filter users..." />
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<DataTable :columns="columns" :data="users || []" />
				<div v-if="loadingTable" class="py-4 text-center text-sm text-muted-foreground">
					Loading users...
				</div>
			</CardContent>
		</Card>
	</div>
</template>
