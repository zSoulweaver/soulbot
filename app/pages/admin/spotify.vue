<script setup lang="ts">
import { Link2, Link2Off, ListMusic, Music, Plus, Radio, RefreshCw } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'
import { toast } from 'vue-sonner'
import { NumberField, NumberFieldContent, NumberFieldDecrement, NumberFieldIncrement, NumberFieldInput } from '~/components/ui/number-field'
import { Progress } from '~/components/ui/progress'

const { loggedIn, user } = useUserSession()

watchEffect(() => {
	if (!loggedIn.value || user.value?.role !== 'caster') {
		navigateTo('/')
	}
})

const forceRefreshQuery = ref(false)
const { data: status, pending, refresh } = await useFetch('/api/spotify/status', {
	query: computed(() => ({
		refresh: forceRefreshQuery.value ? 'true' : 'false',
	})),
})

const isDisconnecting = ref(false)

async function handleDisconnect() {
	isDisconnecting.value = true
	try {
		await $fetch('/api/spotify/disconnect', { method: 'POST' })
		toast.success('Spotify account disconnected successfully.')
		await refresh()
	}
	catch (err: any) {
		console.error('Failed to disconnect Spotify', err)
		toast.error(err.data?.statusMessage || 'Failed to disconnect Spotify account.')
	}
	finally {
		isDisconnecting.value = false
	}
}

async function handleRefresh() {
	forceRefreshQuery.value = true
	await refresh()
	forceRefreshQuery.value = false
	toast.success('Spotify status updated.')
}

// Warning toast when rate limited
watch(() => status.value?.rateLimited, (limited) => {
	if (limited) {
		toast.warning(`Spotify API requests are rate-limited. Retrying in ${status.value?.retryAfter || 5} seconds.`)
	}
})

// Client-side animated progress tracking
const activeProgressMs = ref(0)
let progressIntervalId: any = null

watch(() => status.value?.currentlyPlaying, (newTrack) => {
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
		const checkTime = newTrack.timestamp || Date.now()
		const duration = newTrack.durationMs
		const progress = newTrack.progressMs
		progressIntervalId = setInterval(() => {
			const elapsed = Date.now() - checkTime
			const currentProgress = progress + elapsed
			if (currentProgress >= duration) {
				activeProgressMs.value = duration
				clearInterval(progressIntervalId)
				// Re-fetch when song completes
				refresh()
			}
			else {
				activeProgressMs.value = currentProgress
			}
		}, 1000)
	}
}, { immediate: true })

// Polling interval to refresh status from the server (uses cached API path)
let statusPollingId: any = null

onMounted(() => {
	statusPollingId = setInterval(() => {
		refresh()
	}, 10000) // Poll every 10 seconds
})

onUnmounted(() => {
	if (progressIntervalId) {
		clearInterval(progressIntervalId)
	}
	if (statusPollingId) {
		clearInterval(statusPollingId)
	}
})

// Progress percentage mapping
const progressPercent = computed(() => {
	const track = status.value?.currentlyPlaying
	if (!track || !track.durationMs)
		return 0
	return (activeProgressMs.value / track.durationMs) * 100
})

// Mock settings state for Spotify Song Requests & Playlist Logging
const initialForm = ref({
	active: true,
	pointsCost: 10,
	maxLength: 8,
	maxQueue: 50,
	cooldown: 1,
	followersOnly: false,
	permitExplicit: true,
	targetPlaylist: 'stream-gems',
	allowModerators: true,
	whisperNotifications: false,
})

const form = ref({ ...initialForm.value })

const isModified = computed(() => {
	return JSON.stringify(form.value) !== JSON.stringify(initialForm.value)
})

const isSaving = ref(false)

async function saveSettings() {
	isSaving.value = true
	// Simulate saving payload
	await new Promise(resolve => setTimeout(resolve, 800))
	initialForm.value = { ...form.value }
	isSaving.value = false
	toast.success('Spotify settings saved successfully.')
}

function discardChanges() {
	form.value = { ...initialForm.value }
	toast.info('Discarded unsaved changes')
}

// Playlist details mock configuration
const playlists = ref([
	{ id: 'stream-gems', name: 'Stream Gems (Active Backup)' },
	{ id: 'liked-songs', name: 'Liked Songs' },
	{ id: 'chill-vibes', name: 'Chill Vibes' },
])

function handleCreatePlaylist() {
	toast.info('Feature coming soon: Creating a new Spotify playlist.')
}

// Helper to format track progress and duration times
function formatTime(ms?: number) {
	if (!ms)
		return '0:00'
	const totalSeconds = Math.floor(ms / 1000)
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds % 60
	return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
</script>

<template>
	<AppPageContainer>
		<AppPageHeader heading="Spotify Integration" subheading="Manage Spotify authentication, automated queue requests, and saved playlists.">
			<Button
				variant="outline"
				size="sm"
				:disabled="pending || status?.rateLimited"
				@click="handleRefresh"
			>
				<RefreshCw class="size-4" />
				{{ status?.rateLimited ? 'Rate Limited' : 'Refresh Status' }}
			</Button>
		</AppPageHeader>

		<!-- Loading State -->
		<div v-if="pending && !status" class="flex items-center justify-center p-12">
			<div class="flex flex-col items-center gap-2">
				<Spinner class="size-8" />
				<p class="text-muted-foreground">
					Loading Spotify status...
				</p>
			</div>
		</div>

		<template v-else-if="status">
			<!-- Disconnected / Connect Action Card -->
			<div v-if="!status.connected">
				<Item variant="outline" class="justify-between gap-4">
					<div class="flex items-center gap-3">
						<div class="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
							<Music class="size-5" />
						</div>
						<div>
							<ItemTitle>
								Spotify Disconnected
							</ItemTitle>
							<ItemDescription>Link your Spotify account to enable viewer commands and song requests.</ItemDescription>
						</div>
					</div>
					<ItemActions>
						<Button
							as="a"
							href="/api/auth/spotify"
							class="
								bg-[#1ed760] font-semibold text-black shadow-xs
								hover:bg-[#2bea6e]
							"
						>
							<Link2 class="mr-2 size-4" />
							Connect Account
						</Button>
					</ItemActions>
				</Item>
			</div>

			<!-- Connected State Grid Layout -->
			<div
				v-else class="
					grid grid-cols-1 gap-6
					xl:grid-cols-3
				"
			>
				<!-- Left Column -->
				<div
					class="
						flex flex-col gap-8
						xl:col-span-2
					"
				>
					<!-- Spotify Connection Info Item -->
					<Item variant="outline" class="justify-between gap-4">
						<div class="flex items-center gap-3">
							<div class="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
								<Music class="size-5" />
							</div>
							<div>
								<ItemTitle>
									Spotify Connected
								</ItemTitle>
								<ItemDescription>
									Linked account: {{ user?.displayName || 'unknown username' }}
								</ItemDescription>
							</div>
						</div>
						<ItemActions>
							<Button
								variant="ghostDestructive"
								:disabled="isDisconnecting"
								@click="handleDisconnect"
							>
								<Link2Off />
								Disconnect Account
							</Button>
						</ItemActions>
					</Item>

					<!-- Mobile/Tablet Compact Playback Widget (only visible on smaller screens, xl:hidden) -->
					<Card
						class="
							relative z-10
							xl:hidden
						"
					>
						<img v-if="status.currentlyPlaying?.albumArt" :src="status.currentlyPlaying.albumArt" class="absolute inset-0 -z-1 size-full object-cover opacity-15 blur-2xl">
						<CardHeader class="flex items-center justify-between">
							<p class="text-xs font-bold tracking-wider text-muted-foreground uppercase">
								Live Playback Status
							</p>
							<Badge v-if="status.rateLimited" variant="destructive">
								RATE LIMITED
							</Badge>
							<Badge
								v-else-if="status.currentlyPlaying?.isPlaying" class="
									border-emerald-500/10 bg-emerald-600/10 text-emerald-600
									dark:text-emerald-500
								"
							>
								PLAYING
							</Badge>
							<Badge v-else variant="secondary">
								PAUSED
							</Badge>
						</CardHeader>
						<CardContent>
							<div v-if="status.currentlyPlaying" class="flex gap-4">
								<!-- Album Art / Placeholder -->
								<div class="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
									<img
										v-if="status.currentlyPlaying.albumArt"
										:src="status.currentlyPlaying.albumArt"
										class="size-full object-cover"
										alt="Album Art"
									>
									<Radio v-else class="size-6 text-muted-foreground" />
								</div>
								<div class="flex min-w-0 flex-1 flex-col justify-center">
									<p class="truncate text-sm font-bold text-foreground">
										{{ status.currentlyPlaying.title }}
									</p>
									<p class="truncate text-xs text-muted-foreground">
										{{ status.currentlyPlaying.artist }}
									</p>
									<p v-if="status.currentlyPlaying.albumName" class="truncate text-xs text-muted-foreground/70 italic">
										{{ status.currentlyPlaying.albumName }}
									</p>
									<!-- Progress bar -->
									<Progress :model-value="progressPercent" class="mt-2 h-1" />
									<div class="mt-1 flex justify-between text-xs text-muted-foreground select-none">
										<span>{{ formatTime(activeProgressMs) }}</span>
										<span>{{ formatTime(status.currentlyPlaying.durationMs) }}</span>
									</div>
								</div>
							</div>
							<div v-else class="flex items-center gap-3">
								<div class="flex size-10 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground">
									<Radio class="size-5" />
								</div>
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-medium text-foreground">
										No active playback
									</p>
									<p class="truncate text-xs text-muted-foreground">
										Start playing music on Spotify to see commands working
									</p>
								</div>
							</div>
						</CardContent>
						<CardFooter v-if="status.currentlyPlaying?.link" class="flex justify-center">
							<Button
								as="a"
								:href="status.currentlyPlaying.link"
								target="_blank"
								variant="ghost"
								size="sm"
								class="w-full gap-1.5"
							>
								<Link2 class="size-4" />
								Open in Spotify
							</Button>
						</CardFooter>
					</Card>

					<!-- Settings Section 1: Song Request Settings -->
					<div class="flex flex-col gap-4">
						<h3 class="flex items-center gap-2 text-xl font-semibold">
							<Radio class="size-6 text-muted-foreground" />
							Song Request Settings
						</h3>

						<Item variant="outline">
							<ItemContent>
								<ItemTitle>
									Enable Song Requests
								</ItemTitle>
								<ItemDescription>
									Allow viewers to request songs using channel points or chat commands.
								</ItemDescription>
							</ItemContent>

							<ItemActions>
								<Switch v-model:checked="form.active" />
							</ItemActions>
						</Item>

						<FieldGroup
							class="
								grid grid-cols-1 gap-4
								md:grid-cols-2
							"
						>
							<Field>
								<FieldLabel for="pointsCost">
									Request Channel Points Cost
								</FieldLabel>
								<NumberField id="pointsCost" v-model="form.pointsCost" :min="0" :default-value="10">
									<NumberFieldContent>
										<NumberFieldDecrement />
										<NumberFieldInput />
										<NumberFieldIncrement />
									</NumberFieldContent>
								</NumberField>
								<FieldDescription>Cost to request a song via chat command or Twitch reward.</FieldDescription>
							</Field>

							<Field>
								<FieldLabel for="maxLength">
									Max Song Length (Minutes)
								</FieldLabel>
								<NumberField id="maxLength" v-model="form.maxLength" :min="1" :default-value="8">
									<NumberFieldContent>
										<NumberFieldDecrement />
										<NumberFieldInput />
										<NumberFieldIncrement />
									</NumberFieldContent>
								</NumberField>
								<FieldDescription>Songs longer than this threshold will be blocked from submission.</FieldDescription>
							</Field>

							<Field>
								<FieldLabel for="maxQueue">
									Max Active Queue Items
								</FieldLabel>
								<NumberField id="maxQueue" v-model="form.maxQueue" :min="1" :default-value="50">
									<NumberFieldContent>
										<NumberFieldDecrement />
										<NumberFieldInput />
										<NumberFieldIncrement />
									</NumberFieldContent>
								</NumberField>
								<FieldDescription>Caps maximum entries in the queue to prevent overrunning the list.</FieldDescription>
							</Field>

							<Field>
								<FieldLabel for="cooldown">
									Stream Cooldown (Minutes)
								</FieldLabel>
								<NumberField id="cooldown" v-model="form.cooldown" :min="0" :default-value="1">
									<NumberFieldContent>
										<NumberFieldDecrement />
										<NumberFieldInput />
										<NumberFieldIncrement />
									</NumberFieldContent>
								</NumberField>
								<FieldDescription>Restricts how often a single chatter can request consecutive songs.</FieldDescription>
							</Field>
						</FieldGroup>

						<div class="space-y-4 rounded-lg border p-4">
							<div class="flex items-center justify-between gap-4">
								<div class="space-y-0.5">
									<Label class="text-sm font-semibold">Restrict to Followers Only</Label>
									<p class="text-xs text-muted-foreground">
										Only verified channel followers can issue song requests.
									</p>
								</div>
								<Switch v-model:checked="form.followersOnly" />
							</div>
							<Separator />
							<div class="flex items-center justify-between gap-4">
								<div class="space-y-0.5">
									<Label class="text-sm font-semibold">Permit Explicit Tracks</Label>
									<p class="text-xs text-muted-foreground">
										Allows tracks containing explicit content flags in results.
									</p>
								</div>
								<Switch v-model:checked="form.permitExplicit" />
							</div>
						</div>
					</div>

					<Separator />

					<!-- Settings Section 2: Save-to-Playlist Integration -->
					<div class="flex flex-col gap-4">
						<h3 class="flex items-center gap-2 text-xl font-semibold">
							<ListMusic class="size-6 text-muted-foreground" />
							Save-to-Playlist Integration
						</h3>

						<FieldGroup class="grid grid-cols-1 gap-4">
							<Field>
								<FieldLabel for="targetPlaylist">
									Target Spotify Playlist
								</FieldLabel>
								<div
									class="
										flex flex-col gap-3
										sm:flex-row
									"
								>
									<Select v-model="form.targetPlaylist">
										<SelectTrigger
											class="
												w-full
												sm:max-w-md
											"
										>
											<SelectValue placeholder="Select target playlist" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem v-for="pl in playlists" :key="pl.id" :value="pl.id">
												{{ pl.name }}
											</SelectItem>
										</SelectContent>
									</Select>
									<Button variant="outline" size="sm" class="flex shrink-0 items-center gap-1.5" @click="handleCreatePlaylist">
										<Plus class="size-4" />
										CREATE NEW PLAYLIST
									</Button>
								</div>
								<FieldDescription>When you or qualified moderators type <code class="rounded-sm bg-muted px-1.5 py-0.5 text-xs font-semibold">!like</code> in Twitch chat, the currently playing track immediately saves to this playlist.</FieldDescription>
							</Field>
						</FieldGroup>

						<div class="space-y-4 rounded-lg border bg-muted/10 p-4">
							<div class="flex items-center justify-between gap-4">
								<div class="space-y-0.5">
									<Label class="text-sm font-semibold">Allow Moderators to Like Songs</Label>
									<p class="text-xs text-muted-foreground">
										Grants like access to active stream mods. If toggled off, only you can trigger saves.
									</p>
								</div>
								<Switch v-model:checked="form.allowModerators" />
							</div>
							<Separator />
							<div class="flex items-center justify-between gap-4">
								<div class="space-y-0.5">
									<Label class="text-sm font-semibold">Whisper Save Notifications</Label>
									<p class="text-xs text-muted-foreground">
										Quietly whisper users when their song is officially saved to your playlist instead of shouting in chat.
									</p>
								</div>
								<Switch v-model:checked="form.whisperNotifications" />
							</div>
						</div>
					</div>
				</div>

				<!-- Right Column (Desktop only widget) -->
				<div
					class="
						hidden
						xl:col-span-1 xl:block
					"
				>
					<Card class="sticky top-6 h-fit">
						<img v-if="status.currentlyPlaying?.albumArt" :src="status.currentlyPlaying.albumArt" class="absolute inset-0 -z-1 size-full object-cover opacity-20 blur-2xl">
						<CardHeader class="flex items-center justify-between">
							<CardTitle class="text-xs font-bold tracking-wider text-muted-foreground uppercase">
								Live Playback Status
							</CardTitle>
							<Badge v-if="status.rateLimited" variant="destructive">
								RATE LIMITED
							</Badge>
							<Badge
								v-else-if="status.currentlyPlaying?.isPlaying" class="
									border-emerald-500/10 bg-emerald-600/10 text-emerald-600
									dark:text-emerald-500
								"
							>
								PLAYING
							</Badge>
							<Badge v-else variant="secondary">
								PAUSED
							</Badge>
						</CardHeader>
						<CardContent class="space-y-6">
							<!-- Album Art cover frame -->
							<div class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-muted">
								<img
									v-if="status.currentlyPlaying?.albumArt"
									:src="status.currentlyPlaying.albumArt"
									class="size-full object-cover"
									alt="Album Art"
								>
								<!-- Radar / Vinyl Placeholder -->
								<div v-else class="flex flex-col items-center justify-center p-6 text-muted-foreground">
									<Radio class="mb-2 size-16 stroke-1" />
									<p class="text-center text-xs font-medium">
										No Cover Art Available
									</p>
								</div>
							</div>

							<!-- Song Metadata -->
							<div v-if="status.currentlyPlaying" class="space-y-1 text-center">
								<p class="line-clamp-1 text-lg font-bold text-foreground">
									{{ status.currentlyPlaying.title }}
								</p>
								<p class="line-clamp-1 text-sm text-muted-foreground">
									{{ status.currentlyPlaying.artist }}
								</p>
								<p v-if="status.currentlyPlaying.albumName" class="line-clamp-1 text-xs text-muted-foreground/70 italic">
									{{ status.currentlyPlaying.albumName }}
								</p>
							</div>

							<div v-else class="space-y-2 py-6 text-center">
								<Radio class="mx-auto size-10 stroke-1 text-muted-foreground" />
								<p class="text-sm font-semibold text-muted-foreground">
									No active track playing
								</p>
								<p class="mx-auto max-w-3xs text-xs text-muted-foreground/80">
									Start a track on your Spotify account to test the widgets.
								</p>
							</div>

							<!-- Playback Progress Bar -->
							<div v-if="status.currentlyPlaying" class="space-y-2">
								<Progress :model-value="progressPercent" class="h-1" />
								<div class="flex justify-between text-xs text-muted-foreground select-none">
									<span>{{ formatTime(activeProgressMs) }}</span>
									<span>{{ formatTime(status.currentlyPlaying.durationMs) }}</span>
								</div>
							</div>
						</CardContent>
						<CardFooter v-if="status.currentlyPlaying?.link">
							<Button
								as="a"
								:href="status.currentlyPlaying.link"
								target="_blank"
								variant="ghost"
								size="sm"
								class="w-full gap-1.5"
							>
								<Link2 class="size-4" />
								Open in Spotify
							</Button>
						</CardFooter>
					</Card>
				</div>
			</div>
		</template>

		<!-- Unsaved settings floating save bar -->
		<AppFloatingSaveBar
			:show="isModified"
			:is-saving="isSaving"
			title="Unsaved Spotify Settings"
			description="You have modified Spotify settings. Save to update configurations."
			save-text="Save Settings"
			saving-text="Saving Settings..."
			discard-text="Discard Changes"
			@save="saveSettings"
			@discard="discardChanges"
		/>
	</AppPageContainer>
</template>
