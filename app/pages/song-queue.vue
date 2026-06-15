<script setup lang="ts">
import { Ban, ChevronDown, Heart, ListMusic, Music, Play, Plus, Radio, Shield, SkipForward, Trash2 } from '@lucide/vue'
import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'
import { computed, onUnmounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import SpotifyPlayer from '~/components/spotify/SpotifyPlayer.vue'
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
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Input } from '~/components/ui/input'
import { Spinner } from '~/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { usePagination } from '~/composables/usePagination'

const { loggedIn, user } = useUserSession()

// Fetch queue and currently playing details
const { data: queueData, refresh: originalRefresh, pending } = useFetch<any>('/api/spotify/queue')

const activeTab = ref('active')

const {
	page: currentPage,
	limit: itemsPerPage,
	data: historyData,
	loading: historyLoading,
	refresh: refreshHistory,
} = usePagination<{ data: any[], meta: any }>(
	'/api/spotify/queue/history',
	{
		initialLimit: 10,
		immediate: false,
	},
)

const historyTotal = computed(() => historyData.value?.meta?.total || 0)

const startIndex = computed(() => {
	if (historyTotal.value === 0)
		return 0
	return (currentPage.value - 1) * itemsPerPage.value + 1
})

const endIndex = computed(() => {
	return Math.min(currentPage.value * itemsPerPage.value, historyTotal.value)
})

watch(activeTab, (newTab) => {
	if (newTab === 'history' && !historyData.value) {
		refreshHistory()
	}
})

async function refresh() {
	await originalRefresh()
	if (activeTab.value === 'history') {
		await refreshHistory()
	}
}

// Dynamic progress calculations
const activeProgressMs = ref(0)
let progressIntervalId: any = null

watch(() => queueData.value?.currentlyPlaying, (newTrack) => {
	if (progressIntervalId) {
		clearInterval(progressIntervalId)
		progressIntervalId = null
	}

	if (!newTrack) {
		activeProgressMs.value = 0
		return
	}

	activeProgressMs.value = newTrack.progressMs || 0

	if (import.meta.client && newTrack.isPlaying && newTrack.progressMs !== undefined && newTrack.durationMs) {
		const checkTime = Date.now()
		const duration = newTrack.durationMs
		const progress = newTrack.progressMs
		progressIntervalId = setInterval(() => {
			const elapsed = Date.now() - checkTime
			const currentProgress = progress + elapsed
			if (currentProgress >= duration) {
				activeProgressMs.value = duration
				clearInterval(progressIntervalId)
				refresh()
			}
			else {
				activeProgressMs.value = currentProgress
			}
		}, 1000)
	}
}, { immediate: true })

// Polling for snappy queue/status updates
const { pause: pauseQueuePolling, resume: resumeQueuePolling } = useIntervalFn(() => {
	refresh()
}, 8000)

const visibility = useDocumentVisibility()
watch(visibility, (current) => {
	if (current === 'visible') {
		refresh()
		resumeQueuePolling()
	}
	else {
		pauseQueuePolling()
	}
})

onUnmounted(() => {
	if (progressIntervalId)
		clearInterval(progressIntervalId)
})

// Submission state
const songLink = ref('')
const isSubmitting = ref(false)

async function handleSubmitRequest() {
	if (isSubmitting.value)
		return
	if (!songLink.value.trim()) {
		toast.error('Please enter a Spotify link, URI, or song title.')
		return
	}
	isSubmitting.value = true
	try {
		await $fetch('/api/spotify/queue', {
			method: 'POST',
			body: { link: songLink.value },
		})
		toast.success('Song request added successfully!')
		songLink.value = ''
		await refresh()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to submit song request.')
	}
	finally {
		isSubmitting.value = false
	}
}

const isToggling = ref(false)
const isClearing = ref(false)
const isSkipping = ref(false)
const isPlaying = ref(false)
const isLiking = ref(false)
const isBlacklisting = ref(false)

const isModeratorOrCaster = computed(() => {
	return loggedIn.value && (user.value?.role === 'caster' || user.value?.role === 'moderator')
})

const isCaster = computed(() => {
	return loggedIn.value && user.value?.role === 'caster'
})

const userQueueCount = computed(() => {
	if (!queueData.value?.queue)
		return 0
	return queueData.value.queue.filter((item: any) => item.requestedBy !== 'Fallback Playlist').length
})

async function handleToggleQueue() {
	if (isToggling.value)
		return
	isToggling.value = true
	try {
		const res = await $fetch<any>('/api/spotify/queue/toggle', { method: 'PUT' })
		toast.success(res.enabled ? 'Song requests enabled.' : 'Song requests paused.')
		await refresh()
	}
	catch {
		toast.error('Failed to toggle song request state.')
	}
	finally {
		isToggling.value = false
	}
}

const clearQueueOpen = ref(false)
const deleteItemOpen = ref(false)
const itemToDelete = ref<any>(null)

function handleClearQueue() {
	if (isClearing.value)
		return
	clearQueueOpen.value = true
}

async function confirmClearQueue() {
	isClearing.value = true
	try {
		await $fetch('/api/spotify/queue', { method: 'DELETE' })
		toast.success('Song request queue cleared, points refunded.')
		await refresh()
	}
	catch {
		toast.error('Failed to clear queue.')
	}
	finally {
		isClearing.value = false
		clearQueueOpen.value = false
	}
}

async function handleSkipSong() {
	if (isSkipping.value || isBlacklisting.value || !queueData.value?.currentlyPlaying)
		return
	isSkipping.value = true
	try {
		await $fetch('/api/spotify/queue/skip', { method: 'POST' })
		toast.success('Skipped currently playing song request.')
		await refresh()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to skip song.')
	}
	finally {
		isSkipping.value = false
	}
}

async function handleSkipAndBlacklist() {
	if (!queueData.value?.currentlyPlaying)
		return
	const track = queueData.value.currentlyPlaying
	isBlacklisting.value = true
	try {
		await $fetch('/api/spotify/blacklist', {
			method: 'POST',
			body: { link: track.uri },
		})
		await $fetch('/api/spotify/queue/skip', { method: 'POST' })
		toast.success(`Skipped and blacklisted "${track.title}"`)
		await refresh()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to skip and blacklist track.')
	}
	finally {
		isBlacklisting.value = false
	}
}

async function handleStartPlayback() {
	if (isPlaying.value)
		return
	isPlaying.value = true
	try {
		await $fetch('/api/spotify/queue/play', { method: 'POST' })
		toast.success('Playback started on Spotify.')
		await refresh()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to start playback. Ensure Spotify is active on your device.')
	}
	finally {
		isPlaying.value = false
	}
}

async function handleLikeSong() {
	if (isLiking.value)
		return
	isLiking.value = true
	try {
		const res = await $fetch<any>('/api/spotify/like', { method: 'POST' })
		if (res.alreadyLiked) {
			toast.info(`"${res.title}" is already saved to target playlist!`)
		}
		else {
			toast.success(`Saved "${res.title}" to target playlist!`)
		}
		if (queueData.value?.currentlyPlaying) {
			queueData.value.currentlyPlaying.isLiked = true
		}
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to save song to playlist.')
	}
	finally {
		isLiking.value = false
	}
}

function handleDeleteItem(item: any) {
	itemToDelete.value = item
	deleteItemOpen.value = true
}

async function confirmDeleteItem() {
	if (!itemToDelete.value)
		return
	const item = itemToDelete.value
	try {
		await $fetch(`/api/spotify/queue/${item.id}`, { method: 'DELETE' })
		toast.success('Song removed successfully.')
		await refresh()
	}
	catch {
		toast.error('Failed to delete item.')
	}
	finally {
		itemToDelete.value = null
		deleteItemOpen.value = false
	}
}

function formatTime(ms?: number) {
	if (!ms)
		return '0:00'
	const totalSeconds = Math.floor(ms / 1000)
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds % 60
	return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatTimeAgo(timestamp?: number | null) {
	if (!timestamp)
		return 'recently'
	const seconds = Math.floor((Date.now() - timestamp) / 1000)
	if (seconds < 60)
		return 'Just now'
	const minutes = Math.floor(seconds / 60)
	if (minutes < 60)
		return `${minutes}m ago`
	const hours = Math.floor(minutes / 60)
	return `${hours}h ago`
}
</script>

<template>
	<AppPageContainer>
		<AppPageHeader heading="Song Queue" subheading="Request songs and view upcoming streams track lists.">
			<!-- Header Actions (Caster only controls) -->
			<div v-if="isCaster" class="flex gap-2">
				<Button
					size="sm"
					:variant="queueData?.settings?.active ? 'destructive' : 'default'"
					:disabled="isToggling"
					@click="handleToggleQueue"
				>
					<Spinner v-if="isToggling" data-icon="inline-start" />
					{{ queueData?.settings?.active ? 'Pause Queue' : 'Enable Queue' }}
				</Button>
				<Button
					size="sm"
					variant="outline"
					:disabled="isClearing"
					@click="handleClearQueue"
				>
					<Spinner v-if="isClearing" data-icon="inline-start" />
					Clear Queue
				</Button>
			</div>
		</AppPageHeader>

		<div
			class="
				grid grid-cols-1 gap-6
				xl:grid-cols-3
			"
		>
			<!-- Left/Middle Section: Submit Form and Queue Table -->
			<div
				class="
					flex flex-col gap-6
					xl:col-span-2
				"
			>
				<!-- Submit Request Form Card -->
				<Card>
					<CardHeader>
						<CardTitle>
							Request a Song
						</CardTitle>
						<CardDescription>
							Submit a Spotify track URL, URI, or search by song title to add a song to the queue.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div v-if="!loggedIn" class="space-y-4 rounded-lg border p-6 text-center">
							<p class="text-sm text-muted-foreground">
								Please sign in with Twitch to request songs.
							</p>
							<Button as="a" href="/api/auth/twitch" size="sm">
								Login with Twitch
							</Button>
						</div>
						<div v-else-if="!queueData?.settings?.active" class="space-y-2 rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center">
							<Radio class="mx-auto size-8 text-red-500/70" />
							<p
								class="
									text-sm font-semibold text-red-600
									dark:text-red-400
								"
							>
								Song requests are paused
							</p>
							<p class="text-xs text-muted-foreground">
								The streamer has temporarily paused song requests.
							</p>
						</div>
						<form
							v-else class="
								flex flex-col gap-3
								sm:flex-row
							" @submit.prevent="handleSubmitRequest"
						>
							<div class="relative flex-1">
								<Input
									v-model="songLink"
									placeholder="Spotify link, URI, or search by song title..."
									class="pr-10"
									:disabled="isSubmitting"
								/>
							</div>
							<Button type="submit" :disabled="isSubmitting" class="shrink-0">
								<Spinner v-if="isSubmitting" data-icon="inline-start" />
								<Plus v-else data-icon="inline-start" />
								Request Song
								<Badge v-if="queueData?.settings?.pointsCost" variant="secondary">
									{{ queueData.settings.pointsCost }} pts
								</Badge>
							</Button>
						</form>
					</CardContent>
				</Card>

				<!-- Tabs for Active Queue & History -->
				<Tabs v-model="activeTab" class="w-full">
					<TabsList class="mb-4">
						<TabsTrigger value="active" class="relative">
							Active Queue
							<Badge v-if="userQueueCount" class="bg-primary/20 text-primary">
								{{ userQueueCount }}
							</Badge>
						</TabsTrigger>
						<TabsTrigger value="history">
							History
						</TabsTrigger>
					</TabsList>

					<TabsContent value="active">
						<!-- Queue Table Wrapper -->
						<div class="overflow-hidden rounded-lg border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead class="w-12 text-center">
											#
										</TableHead>
										<TableHead>Track Details</TableHead>
										<TableHead>Requested By</TableHead>
										<TableHead v-if="loggedIn" class="w-16 text-center">
											Actions
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									<TableRow v-if="pending && !queueData" class="hover:bg-transparent">
										<TableCell colspan="4" class="space-y-2 py-10 text-center text-muted-foreground">
											<Spinner class="mx-auto size-6" />
											Loading song list...
										</TableCell>
									</TableRow>
									<TableRow v-else-if="!queueData?.queue?.length" class="hover:bg-transparent">
										<TableCell colspan="4" class="space-y-2 py-12 text-center">
											<ListMusic class="mx-auto size-10 stroke-1 text-muted-foreground" />
											<p class="font-semibold text-foreground">
												The queue is currently empty
											</p>
											<p class="text-xs text-muted-foreground">
												Submit a song request above to start playing!
											</p>
										</TableCell>
									</TableRow>
									<TableRow
										v-for="(item, idx) in queueData?.queue" :key="item.id" :class="item.status === 'playing' ? `
											bg-emerald-500/5
											dark:bg-emerald-500/10
										` : ''"
									>
										<TableCell class="text-center text-xs font-semibold text-muted-foreground select-none">
											<template v-if="item.status === 'playing'">
												<Badge
													v-if="queueData?.currentlyPlaying?.isPlaying"
													variant="default"
													class="
														bg-emerald-600 px-1 py-0.5 text-[9px] text-white
														hover:bg-emerald-600
													"
												>
													PLAYING
												</Badge>
												<Badge
													v-else
													variant="secondary"
													class="
														bg-amber-600 px-1 py-0.5 text-[9px] text-white
														hover:bg-amber-600
														dark:bg-amber-600 dark:text-white
													"
												>
													PAUSED
												</Badge>
											</template>
											<span v-else>#{{ Number(idx) + 1 }}</span>
										</TableCell>
										<TableCell>
											<div class="flex items-center gap-3">
												<div class="relative size-9 shrink-0 overflow-hidden rounded-sm bg-muted">
													<img v-if="item.albumArt" :src="item.albumArt" class="size-full object-cover">
													<Music v-else class="m-auto size-4 text-muted-foreground" />
												</div>
												<div class="min-w-0">
													<p class="truncate text-sm font-bold text-foreground">
														{{ item.title }}
													</p>
													<p class="truncate text-xs text-muted-foreground">
														{{ item.artist }} &bull; {{ formatTime(item.durationMs) }}
													</p>
												</div>
											</div>
										</TableCell>
										<TableCell class="text-sm text-foreground">
											<span class="flex items-center gap-1.5">
												<span v-if="item.requestedBy === 'Fallback Playlist'" class="flex items-center gap-1 text-xs font-medium tracking-wider text-muted-foreground uppercase select-none">
													<Radio class="size-4" /> Autoplay
												</span>
												<span v-else>{{ item.requestedBy }}</span>
											</span>
										</TableCell>
										<TableCell v-if="loggedIn" class="text-center">
											<Button
												v-if="isModeratorOrCaster || (item.requestedBy.toLowerCase() === user?.displayName?.toLowerCase() && item.status === 'pending')"
												variant="ghostDestructive"
												size="icon"
												class="size-8"
												@click="handleDeleteItem(item)"
											>
												<Trash2 />
											</Button>
										</TableCell>
									</TableRow>
								</TableBody>
							</Table>
						</div>
					</TabsContent>

					<TabsContent value="history">
						<div class="overflow-hidden rounded-lg border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Track Details</TableHead>
										<TableHead>Requested By</TableHead>
										<TableHead class="w-32 text-right">
											Played At
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									<TableRow v-if="historyLoading && !historyData" class="hover:bg-transparent">
										<TableCell colspan="3" class="py-10 text-center text-muted-foreground">
											<Spinner class="mx-auto mb-2 size-6" />
											Loading history...
										</TableCell>
									</TableRow>
									<TableRow v-else-if="!historyData?.data?.length" class="hover:bg-transparent">
										<TableCell colspan="3" class="py-12 text-center">
											<Music class="mx-auto mb-2 size-10 stroke-1 text-muted-foreground" />
											<p class="text-sm font-semibold text-foreground">
												No play history available
											</p>
											<p class="mt-1 text-xs text-muted-foreground">
												Recently played songs will appear here.
											</p>
										</TableCell>
									</TableRow>
									<TableRow v-for="item in historyData?.data" v-else :key="item.id">
										<TableCell>
											<div class="flex items-center gap-3">
												<div class="relative size-9 shrink-0 overflow-hidden rounded-sm bg-muted">
													<img v-if="item.albumArt" :src="item.albumArt" class="size-full object-cover">
													<Music v-else class="m-auto size-4 text-muted-foreground" />
												</div>
												<div class="min-w-0">
													<p class="truncate text-sm font-bold text-foreground">
														{{ item.title }}
													</p>
													<p class="truncate text-xs text-muted-foreground">
														{{ item.artist }} &bull; {{ formatTime(item.durationMs) }}
													</p>
												</div>
											</div>
										</TableCell>
										<TableCell class="text-sm text-foreground">
											<span v-if="item.requestedBy === 'Fallback Playlist'" class="flex items-center gap-1 text-xs font-medium tracking-wider text-muted-foreground uppercase select-none">
												<Radio class="size-3 text-primary" /> Autoplay
											</span>
											<span v-else>{{ item.requestedBy }}</span>
										</TableCell>
										<TableCell class="text-right text-xs text-muted-foreground">
											{{ formatTimeAgo(item.playedAt) }}
										</TableCell>
									</TableRow>
								</TableBody>
							</Table>
						</div>

						<!-- Bottom Pagination Row -->
						<div
							v-if="historyTotal > 0" class="
								flex flex-col items-center justify-between gap-4 select-none
								sm:flex-row
							"
						>
							<span class="text-xs text-muted-foreground">
								Showing {{ startIndex }}-{{ endIndex }} of {{ historyTotal }} played tracks
							</span>

							<Pagination
								v-model:page="currentPage"
								:total="historyTotal"
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
					</TabsContent>
				</Tabs>
			</div>

			<!-- Right Column: Live Playback Card & Help -->
			<div class="flex flex-col gap-6">
				<SpotifyPlayer
					:currently-playing="queueData?.currentlyPlaying"
					:active-progress-ms="activeProgressMs"
					:show-default-footer="false"
				>
					<template #controls>
						<!-- Playback Controls (Caster / Moderator actions) -->
						<div v-if="isModeratorOrCaster && queueData?.connected && queueData?.settings?.playlistId" class="flex justify-center gap-3 pt-2">
							<!-- Start Playback (Caster only) -->
							<Button
								v-if="isCaster"
								variant="outline"
								size="sm"
								class="flex-1 gap-1.5"
								:disabled="isPlaying"
								@click="handleStartPlayback"
							>
								<Spinner v-if="isPlaying" data-icon="inline-start" />
								<Play v-else data-icon="inline-start" />
								Start Queue
							</Button>
							<!-- Skip Song / Button Group (Caster / Mods) -->
							<div class="flex flex-1">
								<Button
									variant="outline"
									size="sm"
									class="flex-1 gap-1.5 rounded-r-none"
									:disabled="isSkipping || isBlacklisting || !queueData?.currentlyPlaying"
									@click="handleSkipSong"
								>
									<Spinner v-if="isSkipping" data-icon="inline-start" />
									<SkipForward v-else data-icon="inline-start" />
									Skip Song
								</Button>
								<DropdownMenu>
									<DropdownMenuTrigger as-child>
										<Button
											variant="outline"
											size="sm"
											class="shrink-0 rounded-l-none border-l-0 px-2"
											:disabled="isSkipping || isBlacklisting || !queueData?.currentlyPlaying"
										>
											<ChevronDown />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem
											class="
												cursor-pointer gap-2 text-destructive
												focus:text-destructive
											"
											@click="handleSkipAndBlacklist"
										>
											<Spinner v-if="isBlacklisting" />
											<Ban v-else />
											<span>Skip & Blacklist Track</span>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
							<!-- Like Song (Caster / Mods) -->
							<Button
								variant="outline"
								size="icon"
								class="
									size-9 shrink-0
									hover:text-red-400
									hover:[&>svg]:fill-red-500
								"
								:disabled="isLiking"
								:title="queueData?.currentlyPlaying?.isLiked ? 'Already added to stream playlist' : 'Add to stream playlist'"
								@click="handleLikeSong"
							>
								<Spinner v-if="isLiking" />
								<Heart
									v-else class="transition-colors" :class="{ 'fill-red-500 text-red-400': queueData?.currentlyPlaying?.isLiked }"
								/>
							</Button>
						</div>
					</template>
				</SpotifyPlayer>

				<!-- Information Card -->
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-1.5 text-sm font-bold">
							<Shield class="size-4 text-muted-foreground" />
							Queue Rules & Cost
						</CardTitle>
					</CardHeader>
					<CardContent class="space-y-2 text-xs/relaxed text-muted-foreground">
						<p v-if="queueData?.settings?.pointsCost">
							Each song request deducts <span class="font-mono font-bold text-foreground">{{ queueData.settings.pointsCost }} points</span>. If a moderator deletes your pending request, your points will be automatically refunded.
						</p>
						<p v-else>
							Song requests are currently <span class="font-bold text-foreground">free</span>!
						</p>
						<p v-if="queueData?.settings?.maxLength">
							Maximum song duration permitted: <span class="font-semibold text-foreground">{{ queueData.settings.maxLength }} minutes</span>.
						</p>
						<p v-if="queueData?.settings?.maxUserRequests">
							Maximum active requests per user: <span class="font-semibold text-foreground">{{ queueData.settings.maxUserRequests }} songs</span>.
						</p>
						<p v-if="queueData?.settings?.followersOnly">
							Only channel <span class="font-semibold text-foreground">followers</span> are allowed to request songs.
						</p>
						<p v-if="!queueData?.settings?.permitExplicit">
							Tracks containing <span class="font-semibold text-foreground">explicit content</span> are blocked.
						</p>
						<p>
							Type <code class="rounded-sm bg-muted px-1 py-0.5 text-[10px] font-semibold">!songrequest wrongsong</code> in chat if you request the wrong track to quickly cancel and get a refund.
						</p>
					</CardContent>
				</Card>
			</div>
		</div>

		<!-- Clear Queue Dialog -->
		<AlertDialog v-model:open="clearQueueOpen">
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
					<AlertDialogDescription>
						This will clear all tracks in the song request queue. All deducted points will be refunded to viewers.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction @click="confirmClearQueue">
						Clear Queue
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>

		<!-- Delete Item Dialog -->
		<AlertDialog v-model:open="deleteItemOpen">
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Remove song request?</AlertDialogTitle>
					<AlertDialogDescription>
						<template v-if="itemToDelete?.status === 'playing'">
							Warning: "{{ itemToDelete?.title }}" is currently active on Spotify and cannot be recalled dynamically. If you delete it, it will be removed from our records, but you must skip it manually in Spotify. Continue?
						</template>
						<template v-else>
							Are you sure you want to remove "{{ itemToDelete?.title }}"?
						</template>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel @click="itemToDelete = null">
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction @click="confirmDeleteItem">
						Remove
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	</AppPageContainer>
</template>
