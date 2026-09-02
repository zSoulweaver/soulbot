<script setup lang="ts">
import { Music, PlusIcon, SearchIcon, TrashIcon } from '@lucide/vue'
import { createColumnHelper } from '@tanstack/vue-table'
import { computed, h, ref, watchEffect } from 'vue'
import { toast } from 'vue-sonner'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Spinner } from '~/components/ui/spinner'
import { usePagination } from '~/composables/usePagination'

const { loggedIn, user } = useUserSession()

useHead({
	title: 'Spotify Blacklist',
})

watchEffect(() => {
	if (!loggedIn.value || (user.value?.role !== 'caster' && user.value?.role !== 'admin' && user.value?.role !== 'moderator')) {
		navigateTo('/')
	}
})

interface BlacklistedTrack {
	id: number
	trackId: string
	title: string
	artist: string
	albumArt: string | null
	addedBy: string
	addedByImage?: string | null
	createdAt: string
}

const {
	page: currentPage,
	limit: itemsPerPage,
	search: searchQuery,
	data,
	refresh,
	loading: loadingTable,
} = usePagination<{ data: BlacklistedTrack[], meta: any }>('/api/spotify/blacklist')

const isDeleting = ref<number | null>(null)
const isAddDialogOpen = ref(false)
const trackToRemove = ref<BlacklistedTrack | null>(null)
const isRemoveDialogOpen = computed({
	get: () => trackToRemove.value !== null,
	set: (val) => {
		if (!val)
			trackToRemove.value = null
	},
})

const blacklistItems = computed(() => data.value?.data || [])
const filteredTotal = computed(() => data.value?.meta?.total || 0)

const startIndex = computed(() => {
	if (filteredTotal.value === 0)
		return 0
	return (currentPage.value - 1) * itemsPerPage.value + 1
})

const endIndex = computed(() => {
	return Math.min(currentPage.value * itemsPerPage.value, filteredTotal.value)
})

async function confirmRemoveTrack() {
	if (!trackToRemove.value)
		return
	const id = trackToRemove.value.id
	trackToRemove.value = null

	isDeleting.value = id
	try {
		await $fetch(`/api/spotify/blacklist/${id}`, { method: 'DELETE' })
		toast.success('Track removed from blacklist successfully')
		await refresh()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to remove track from blacklist')
	}
	finally {
		isDeleting.value = null
	}
}

const columnHelper = createColumnHelper<BlacklistedTrack>()
const columns: any[] = [
	columnHelper.display({
		id: 'track',
		header: 'Track',
		cell: (info) => {
			const row = info.row.original
			return h('div', { class: 'flex items-center gap-3 py-1' }, [
				// Album art thumbnail or Music icon placeholder
				h('div', { class: 'relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted border' }, [
					row.albumArt
						? h('img', { src: row.albumArt, class: 'size-full object-cover', alt: 'Album Art' })
						: h(Music, { class: 'size-5 text-muted-foreground' }),
				]),
				h('div', { class: 'flex flex-col min-w-0' }, [
					h('span', { class: 'font-semibold truncate text-sm text-foreground' }, row.title),
					h('span', { class: 'text-xs text-muted-foreground truncate' }, row.artist),
				]),
			])
		},
	}),
	columnHelper.accessor('addedBy', {
		header: 'Added By',
		cell: info => h('div', { class: 'flex items-center gap-2' }, [
			h(Avatar, { class: 'size-6 shrink-0' }, () => [
				h(AvatarImage, { src: info.row.original.addedByImage || '', alt: info.getValue() }),
				h(AvatarFallback, { class: 'text-[10px]' }, () => info.getValue().charAt(0).toUpperCase()),
			]),
			h('span', { class: 'text-sm font-medium' }, info.getValue()),
		]),
	}),
	columnHelper.accessor('createdAt', {
		header: 'Blacklisted At',
		cell: info => h('span', { class: 'text-sm text-muted-foreground' }, new Date(info.getValue()).toLocaleString()),
	}),
	columnHelper.display({
		id: 'actions',
		header: () => h('div', { class: 'text-right' }, 'Actions'),
		cell: info => h('div', { class: 'flex justify-end' }, [
			h(Button, {
				variant: 'ghostDestructive',
				size: 'sm',
				disabled: isDeleting.value !== null,
				onClick: () => {
					trackToRemove.value = info.row.original
				},
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
		heading="Spotify Blacklist"
		subheading="Prevent specific tracks from being requested via chat commands or the queue page."
	>
		<template #header-actions>
			<Button @click="isAddDialogOpen = true">
				<PlusIcon data-icon="inline-start" />
				Add to Blacklist
			</Button>
			<AppRefreshButton :loading="loadingTable" @click="refresh" />
		</template>
		<div class="flex flex-col gap-4">
			<InputGroup class="w-full max-w-sm">
				<InputGroupAddon>
					<SearchIcon class="text-muted-foreground" />
				</InputGroupAddon>
				<InputGroupInput
					v-model="searchQuery"
					type="search"
					placeholder="Search track title or artist..."
				/>
			</InputGroup>

			<DataTable
				:columns="columns"
				:data="blacklistItems"
				:loading="loadingTable"
				loading-text="Loading blacklist..."
			>
				<template #empty>
					No blacklisted tracks found.
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
					Showing {{ startIndex }}-{{ endIndex }} of {{ filteredTotal }} blacklisted tracks
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

			<!-- Add Blacklist Modal Dialog Component -->
			<BlacklistAddDialog
				v-model:open="isAddDialogOpen"
				@added="refresh"
			/>

			<!-- Confirm Remove Blacklist Dialog -->
			<AlertDialog v-model:open="isRemoveDialogOpen">
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove from Blacklist?</AlertDialogTitle>
						<AlertDialogDescription v-if="trackToRemove">
							Are you sure you want to remove <strong>{{ trackToRemove.title }}</strong> by <strong>{{ trackToRemove.artist }}</strong> from the blacklist? Users will be able to request this song again.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel @click="trackToRemove = null">
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction @click="confirmRemoveTrack">
							Confirm
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	</AppSettingsPage>
</template>
