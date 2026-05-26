<script setup lang="ts">
import { createColumnHelper } from '@tanstack/vue-table'
import { Loader2, PlusIcon, ShieldAlert, Sparkles, TrashIcon } from 'lucide-vue-next'
import { h, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import DataTable from '@/components/ui/data-table/DataTable.vue'

interface ExcludedUser {
	id: string
	username: string
	displayName: string
	reason: string | null
	createdAt: string
}

interface AutoExclusion {
	role: string
	username: string
	displayName: string
}

const { data, refresh, pending: loadingTable } = await useFetch<{ manualExclusions: ExcludedUser[], autoExclusions: AutoExclusion[] }>('/api/points/exclusions')

const newUsername = ref('')
const newReason = ref('')
const isAdding = ref(false)
const isDeleting = ref<string | null>(null)

async function addExclusion() {
	if (!newUsername.value.trim())
		return
	isAdding.value = true
	try {
		await $fetch('/api/points/exclusions', {
			method: 'POST',
			body: {
				username: newUsername.value,
				reason: newReason.value || undefined,
			},
		})
		toast.success(`Successfully excluded ${newUsername.value}`)
		newUsername.value = ''
		newReason.value = ''
		await refresh()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to add exclusion')
	}
	finally {
		isAdding.value = false
	}
}

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

		<div
			class="
				grid grid-cols-1 gap-6
				lg:grid-cols-3
			"
		>
			<div
				class="
					flex flex-col gap-6
					lg:col-span-1
				"
			>
				<!-- System Exclusions Banner -->
				<Card
					class="
						overflow-hidden border-blue-500/20 bg-blue-500/5
						dark:bg-blue-500/10
					"
				>
					<CardHeader>
						<CardTitle
							class="
								flex items-center gap-2 text-blue-600
								dark:text-blue-400
							"
						>
							<ShieldAlert class="size-5" />
							System Excluded
						</CardTitle>
						<CardDescription
							class="
								text-blue-600/80
								dark:text-blue-400/80
							"
						>
							These accounts are automatically excluded.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ul class="flex flex-col gap-2">
							<li
								v-for="user in data?.autoExclusions" :key="user.username" class="
									rounded-md bg-blue-500/10 p-2 px-3 text-sm font-medium text-blue-700
									dark:bg-blue-500/20 dark:text-blue-300
								"
							>
								<span>{{ user.displayName }}</span>
							</li>
						</ul>
						<p
							v-if="!data?.autoExclusions?.length" class="
								text-sm text-blue-600/70
								dark:text-blue-400/70
							"
						>
							No system exclusions found.
						</p>
					</CardContent>
				</Card>

				<!-- Add Exclusion Form -->
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<Sparkles class="size-4 text-purple-500" />
							Add Exclusion
						</CardTitle>
						<CardDescription>Manually add an account to the list.</CardDescription>
					</CardHeader>
					<CardContent class="flex flex-col gap-4">
						<FieldGroup>
							<Field>
								<FieldLabel for="username">
									Twitch Username
								</FieldLabel>
								<Input
									id="username"
									v-model="newUsername"
									placeholder="e.g. streamelements"
									@keyup.enter="addExclusion"
								/>
							</Field>
							<Field>
								<FieldLabel for="reason">
									Reason (Optional)
								</FieldLabel>
								<Input
									id="reason"
									v-model="newReason"
									placeholder="e.g. System Bot"
									@keyup.enter="addExclusion"
								/>
							</Field>
						</FieldGroup>
					</CardContent>
					<CardFooter>
						<Button class="w-full" :disabled="isAdding || !newUsername.trim()" @click="addExclusion">
							<Loader2 v-if="isAdding" class="animate-spin" data-icon="inline-start" />
							<PlusIcon v-else data-icon="inline-start" />
							{{ isAdding ? 'Adding...' : 'Add Exclusion' }}
						</Button>
					</CardFooter>
				</Card>
			</div>

			<!-- Exclusions Table -->
			<DataTable :columns="columns" :data="data?.manualExclusions || []" class="lg:col-span-2" />
			<div v-if="loadingTable" class="py-4 text-center text-sm text-muted-foreground">
				Loading exclusion list...
			</div>
		</div>
	</AppPageContainer>
</template>
