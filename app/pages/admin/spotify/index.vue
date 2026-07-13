<script setup lang="ts">
import { AlertTriangle, Check, ChevronsUpDown, Link2, Link2Off, Music, Plus, Radio, RefreshCcw, X } from '@lucide/vue'
import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'
import { computed, onUnmounted, ref, watch, watchEffect } from 'vue'
import { toast } from 'vue-sonner'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import {
	Combobox,
	ComboboxAnchor,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxInput,
	ComboboxItem,
	ComboboxItemIndicator,
	ComboboxList,
	ComboboxTrigger,
	ComboboxViewport,
} from '~/components/ui/combobox'
import { NumberField, NumberFieldContent, NumberFieldDecrement, NumberFieldIncrement, NumberFieldInput } from '~/components/ui/number-field'
import { Progress } from '~/components/ui/progress'
import {
	SettingsGroup,
	SettingsGroupAction,
	SettingsGroupContent,
	SettingsGroupDescription,
	SettingsGroupItem,
	SettingsGroupLabel,
} from '~/components/ui/settings-group'
import { SettingsHeading } from '~/components/ui/settings-heading'

const { loggedIn, user } = useUserSession()
const { public: { botName } } = useRuntimeConfig()

useHead({
	title: 'Spotify Integration',
})

watchEffect(() => {
	if (!loggedIn.value || user.value?.role !== 'caster') {
		navigateTo('/')
	}
})

const forceRefreshQuery = ref(false)
const { data: status, pending, refresh } = useFetch('/api/spotify/status', {
	query: computed(() => ({
		refresh: forceRefreshQuery.value ? 'true' : 'false',
	})),
})

const isDisconnecting = ref(false)

async function handleDisconnect() {
	if (isDisconnecting.value)
		return
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
	if (pending.value || status.value?.rateLimited)
		return
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
const { pause: pauseStatusPolling, resume: resumeStatusPolling } = useIntervalFn(() => {
	refresh()
}, 10000)

const visibility = useDocumentVisibility()
watch(visibility, (current) => {
	if (current === 'visible') {
		refresh()
		resumeStatusPolling()
	}
	else {
		pauseStatusPolling()
	}
})

onUnmounted(() => {
	if (progressIntervalId) {
		clearInterval(progressIntervalId)
	}
})

const progressPercent = computed(() => {
	const track = status.value?.currentlyPlaying
	if (!track || !track.durationMs)
		return 0
	return (activeProgressMs.value / track.durationMs) * 100
})

const { data: settingsData, refresh: refreshSettings, pending: loadingSettings } = useFetch('/api/spotify/settings')

const form = ref({
	active: true,
	pointsCost: 10,
	maxLength: 8,
	maxQueue: 50,
	maxUserRequests: 0,
	modsBypassLimits: true,
	followersOnly: false,
	permitExplicit: true,
	offlineOverride: false,
	targetPlaylist: '',
	targetPlaylistName: '',
	allowModerators: true,
	whisperNotifications: false,
	announceDeleteWebui: true,
	alertQueueLowEnabled: false,
	alertQueueEmptyEnabled: false,
})

// Synchronize loaded data
watch(settingsData, (newData) => {
	if (newData) {
		form.value = { ...newData }
		if (!newData.playlistId || newData.playlistExists === false) {
			form.value.active = false
		}
	}
}, { immediate: true })

const isModified = computed(() => {
	if (!settingsData.value)
		return false
	return (
		form.value.active !== settingsData.value.active
		|| form.value.pointsCost !== settingsData.value.pointsCost
		|| form.value.maxLength !== settingsData.value.maxLength
		|| form.value.maxQueue !== settingsData.value.maxQueue
		|| form.value.maxUserRequests !== settingsData.value.maxUserRequests
		|| form.value.modsBypassLimits !== settingsData.value.modsBypassLimits
		|| form.value.followersOnly !== settingsData.value.followersOnly
		|| form.value.permitExplicit !== settingsData.value.permitExplicit
		|| form.value.offlineOverride !== settingsData.value.offlineOverride
		|| form.value.targetPlaylist !== settingsData.value.targetPlaylist
		|| form.value.targetPlaylistName !== settingsData.value.targetPlaylistName
		|| form.value.allowModerators !== settingsData.value.allowModerators
		|| form.value.whisperNotifications !== settingsData.value.whisperNotifications
		|| form.value.announceDeleteWebui !== settingsData.value.announceDeleteWebui
		|| form.value.alertQueueLowEnabled !== settingsData.value.alertQueueLowEnabled
		|| form.value.alertQueueEmptyEnabled !== settingsData.value.alertQueueEmptyEnabled
	)
})

const isSaving = ref(false)

async function saveSettings() {
	isSaving.value = true
	try {
		await $fetch('/api/spotify/settings', {
			method: 'PUT',
			body: form.value,
		})
		toast.success('Spotify settings saved successfully.')
		await refreshSettings()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to save Spotify settings.')
	}
	finally {
		isSaving.value = false
	}
}

function discardChanges() {
	if (settingsData.value) {
		form.value = { ...settingsData.value }
		toast.info('Discarded unsaved changes')
	}
}

function clearTargetPlaylist() {
	form.value.targetPlaylist = ''
	form.value.targetPlaylistName = ''
}

type SpotifyPlaylist = Awaited<ReturnType<typeof import('~~/server/api/spotify/playlists.get').default>>[number]

const playlists = ref<SpotifyPlaylist[]>([])
const loadingPlaylists = ref(false)
const playlistSearchQuery = ref('')

async function onPlaylistSelectOpen(isOpen: boolean) {
	if (isOpen) {
		playlistSearchQuery.value = ''
	}
	if (isOpen && playlists.value.length <= 1) {
		loadingPlaylists.value = true
		try {
			const data = await $fetch<SpotifyPlaylist[]>('/api/spotify/playlists')
			playlists.value = data
		}
		catch (err: any) {
			console.error('Failed to load playlists', err)
			toast.error('Failed to fetch Spotify playlists. Make sure you have connected your Spotify account.')
		}
		finally {
			loadingPlaylists.value = false
		}
	}
}

// Add a placeholder item so it displays correctly before the dropdown loads the actual playlists
watch(() => form.value.targetPlaylist, (newVal) => {
	if (newVal && !playlists.value.some(p => p.id === newVal)) {
		playlists.value.push({
			id: newVal,
			name: form.value.targetPlaylistName || `Playlist (${newVal})`,
			image: null,
		})
	}
}, { immediate: true })

// Keep playlist name in sync when user selects a playlist from dropdown
watch(() => form.value.targetPlaylist, (newVal) => {
	if (newVal) {
		const matched = playlists.value.find(p => p.id === newVal)
		if (matched) {
			form.value.targetPlaylistName = matched.name
		}
	}
})

const selectedPlaylist = computed(() => playlists.value.find(p => p.id === form.value.targetPlaylist))

const isInitializingPlaylist = ref(false)

async function handleInitializePlaylist() {
	if (isInitializingPlaylist.value)
		return
	isInitializingPlaylist.value = true
	try {
		await $fetch('/api/spotify/playlist-init', { method: 'POST' })
		toast.success('Spotify queue playlist initialized successfully!')
		await refreshSettings()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to initialize Spotify queue playlist.')
	}
	finally {
		isInitializingPlaylist.value = false
	}
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
	<AppSettingsPage
		heading="Spotify Integration"
		subheading="Manage Spotify authentication, automated queue requests, and saved playlists."
	>
		<template #header-actions>
			<Button variant="ghost" :disabled="pending || status?.rateLimited" @click="handleRefresh">
				<RefreshCcw :class="{ 'animate-spin': pending }" />
				{{ status?.rateLimited ? 'Rate Limited' : '' }}
			</Button>
		</template>
		<!-- Loading State -->
		<div v-if="(pending && !status) || (loadingSettings && !settingsData)" class="flex items-center justify-center p-12">
			<div class="flex flex-col items-center gap-2">
				<Spinner class="size-8" />
				<p class="text-muted-foreground">
					Loading Spotify status...
				</p>
			</div>
		</div>

		<template v-else-if="status">
			<div class="flex w-full flex-col gap-6">
				<!-- Disconnected / Connect Action Card -->
				<div v-if="!status.connected" class="w-full max-w-3xl">
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
									bg-spotify font-semibold text-black shadow-xs
									hover:bg-spotify-hover
								"
							>
								<Link2 data-icon="inline-start" />
								Connect Account
							</Button>
						</ItemActions>
					</Item>
				</div>

				<!-- Connected State Flex Layout -->
				<AppSettingsGrid v-else>
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
									Linked account: {{ status?.profile ? `${status.profile.displayName} (${status.profile.username})` : (user?.displayName || 'unknown username') }}
								</ItemDescription>
							</div>
						</div>
						<ItemActions>
							<Button
								variant="ghostDestructive"
								:disabled="isDisconnecting"
								@click="handleDisconnect"
							>
								<Link2Off data-icon="inline-start" />
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
							<Badge
								v-else-if="status.currentlyPlaying"
								variant="secondary"
								class="
									border-amber-500/10 bg-amber-600/10 text-amber-600
									dark:text-amber-500
								"
							>
								PAUSED
							</Badge>
							<Badge v-else variant="secondary">
								OFFLINE
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
						<SettingsHeading>
							Song Request Settings
						</SettingsHeading>

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
								<Switch v-model:model-value="form.active" :disabled="!settingsData?.playlistId || settingsData?.playlistExists === false" />
							</ItemActions>
						</Item>

						<!-- Dedicated Playlist Initialization Card -->
						<div class="mt-2">
							<Card v-if="!settingsData?.playlistId" class="border-amber-500/20 bg-amber-500/5">
								<CardHeader>
									<CardTitle
										class="
											text-sm font-bold text-amber-600
											dark:text-amber-500
										"
									>
										Song Request Playlist Required
									</CardTitle>
									<CardDescription class="text-xs">
										To enable song requests, the bot needs to create and manage a dedicated Spotify playlist context.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<Button
										size="sm"
										class="
											bg-amber-600 font-semibold text-white
											hover:bg-amber-700
										"
										:disabled="isInitializingPlaylist"
										@click="handleInitializePlaylist"
									>
										<Plus data-icon="inline-start" />
										Create "{{ botName }} Song Requests" Playlist
									</Button>
								</CardContent>
							</Card>
							<div v-else-if="settingsData?.playlistExists === false" class="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-4">
								<div class="flex items-start gap-3">
									<div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
										<AlertTriangle class="size-5" />
									</div>
									<div class="flex flex-col gap-0.5">
										<p
											class="text-sm font-semibold text-destructive"
										>
											Linked Playlist Not Found
										</p>
										<p class="text-xs text-muted-foreground">
											The configured Spotify playlist (<code class="rounded-sm bg-muted px-1.5 py-0.5 text-xs font-semibold select-all">{{ settingsData.playlistId }}</code>) no longer exists on Spotify.
										</p>
									</div>
								</div>
								<Button variant="destructive" size="sm" :disabled="isInitializingPlaylist" @click="handleInitializePlaylist">
									Re-initialize Playlist
								</Button>
							</div>
							<div v-else class="flex items-center justify-between rounded-lg border bg-emerald-500/5 p-4">
								<div class="flex flex-col gap-0.5">
									<p
										class="
											text-sm font-semibold text-emerald-600
											dark:text-emerald-500
										"
									>
										Spotify Queue Playlist Active
									</p>
									<p class="text-xs text-muted-foreground">
										Linked Playlist ID: <code class="rounded-sm bg-muted px-1.5 py-0.5 text-xs font-semibold select-all">{{ settingsData.playlistId }}</code>
									</p>
								</div>
							</div>
						</div>
						<FieldGroup
							class="
								grid grid-cols-1 gap-x-8 gap-y-6
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
								<NumberField id="maxLength" v-model="form.maxLength" :min="0" :default-value="8">
									<NumberFieldContent>
										<NumberFieldDecrement />
										<NumberFieldInput />
										<NumberFieldIncrement />
									</NumberFieldContent>
								</NumberField>
								<FieldDescription>Songs longer than this threshold (in minutes) will be blocked. Set to 0 for unlimited length.</FieldDescription>
							</Field>

							<Field>
								<FieldLabel for="maxQueue">
									Max Active Queue Items
								</FieldLabel>
								<NumberField id="maxQueue" v-model="form.maxQueue" :min="0" :default-value="50">
									<NumberFieldContent>
										<NumberFieldDecrement />
										<NumberFieldInput />
										<NumberFieldIncrement />
									</NumberFieldContent>
								</NumberField>
								<FieldDescription>Caps maximum entries in the queue to prevent overrunning the list. Set to 0 for unlimited size.</FieldDescription>
							</Field>

							<Field>
								<FieldLabel for="maxUserRequests">
									Max Songs Per User
								</FieldLabel>
								<NumberField id="maxUserRequests" v-model="form.maxUserRequests" :min="0" :default-value="0">
									<NumberFieldContent>
										<NumberFieldDecrement />
										<NumberFieldInput />
										<NumberFieldIncrement />
									</NumberFieldContent>
								</NumberField>
								<FieldDescription>Caps active requests a viewer can have in the queue at once. Set to 0 for unlimited.</FieldDescription>
							</Field>
						</FieldGroup>

						<SettingsGroup>
							<SettingsGroupItem>
								<SettingsGroupContent>
									<SettingsGroupLabel>Restrict to Followers Only</SettingsGroupLabel>
									<SettingsGroupDescription>
										Only verified channel followers can issue song requests.
									</SettingsGroupDescription>
								</SettingsGroupContent>
								<SettingsGroupAction>
									<Switch v-model:model-value="form.followersOnly" />
								</SettingsGroupAction>
							</SettingsGroupItem>
							<SettingsGroupItem>
								<SettingsGroupContent>
									<SettingsGroupLabel>Permit Explicit Tracks</SettingsGroupLabel>
									<SettingsGroupDescription>
										Allows tracks containing explicit content flags in results.
									</SettingsGroupDescription>
								</SettingsGroupContent>
								<SettingsGroupAction>
									<Switch v-model:model-value="form.permitExplicit" />
								</SettingsGroupAction>
							</SettingsGroupItem>
							<SettingsGroupItem>
								<SettingsGroupContent>
									<SettingsGroupLabel>Allow Offline Song Requests</SettingsGroupLabel>
									<SettingsGroupDescription>
										Allow viewers to queue songs even when the stream is not live.
									</SettingsGroupDescription>
								</SettingsGroupContent>
								<SettingsGroupAction>
									<Switch v-model:model-value="form.offlineOverride" />
								</SettingsGroupAction>
							</SettingsGroupItem>
							<SettingsGroupItem>
								<SettingsGroupContent>
									<SettingsGroupLabel>Moderators Limit Bypass</SettingsGroupLabel>
									<SettingsGroupDescription>
										Allow moderators and casters to bypass maximum song length and user request limits.
									</SettingsGroupDescription>
								</SettingsGroupContent>
								<SettingsGroupAction>
									<Switch v-model:model-value="form.modsBypassLimits" />
								</SettingsGroupAction>
							</SettingsGroupItem>
							<SettingsGroupItem>
								<SettingsGroupContent>
									<SettingsGroupLabel>Announce Low Queue in Chat</SettingsGroupLabel>
									<SettingsGroupDescription>
										Post a message to chat when there are exactly 5 user-requested songs remaining in the queue.
									</SettingsGroupDescription>
								</SettingsGroupContent>
								<SettingsGroupAction>
									<Switch v-model:model-value="form.alertQueueLowEnabled" />
								</SettingsGroupAction>
							</SettingsGroupItem>
							<SettingsGroupItem>
								<SettingsGroupContent>
									<SettingsGroupLabel>Announce Queue Finished in Chat</SettingsGroupLabel>
									<SettingsGroupDescription>
										Post a message to chat when the last user-requested song in the queue finishes.
									</SettingsGroupDescription>
								</SettingsGroupContent>
								<SettingsGroupAction>
									<Switch v-model:model-value="form.alertQueueEmptyEnabled" />
								</SettingsGroupAction>
							</SettingsGroupItem>
						</SettingsGroup>
					</div>

					<!-- Settings Section 2: Save-to-Playlist Integration -->
					<div class="flex flex-col gap-4">
						<SettingsHeading>
							Save-to-Playlist Integration
						</SettingsHeading>

						<FieldGroup class="grid grid-cols-1 gap-4">
							<Field>
								<FieldLabel for="targetPlaylist">
									Target Spotify Playlist
								</FieldLabel>
								<div class="flex items-center gap-2">
									<Combobox v-model="form.targetPlaylist" v-model:search-term="playlistSearchQuery" class="w-full grow" @update:open="onPlaylistSelectOpen">
										<ComboboxAnchor as-child>
											<ComboboxTrigger as-child>
												<Button
													variant="outline"
													class="w-full justify-between font-normal"
													:disabled="loadingPlaylists"
												>
													<template v-if="form.targetPlaylist">
														<div class="flex items-center gap-2 overflow-hidden">
															<Avatar class="size-5 shrink-0 overflow-hidden rounded-md">
																<AvatarImage v-if="selectedPlaylist?.image" :src="selectedPlaylist.image!" />
																<AvatarFallback class="bg-emerald-500/10 text-[9px] text-emerald-500">
																	{{ selectedPlaylist?.name?.[0]?.toUpperCase() || 'P' }}
																</AvatarFallback>
															</Avatar>
															<span class="truncate">{{ selectedPlaylist?.name || form.targetPlaylistName || 'Selected Playlist' }}</span>
														</div>
													</template>
													<template v-else>
														Select target playlist...
													</template>
													<ChevronsUpDown class="size-4 shrink-0 opacity-50" />
												</Button>
											</ComboboxTrigger>
										</ComboboxAnchor>

										<ComboboxList style="width: var(--reka-combobox-trigger-width)">
											<ComboboxInput :display-value="() => ''" placeholder="Search playlist..." />
											<ComboboxEmpty>No playlist found.</ComboboxEmpty>
											<ComboboxViewport>
												<ComboboxGroup>
													<ComboboxItem
														v-for="pl in playlists"
														:key="pl.id"
														:value="pl.id"
													>
														<Avatar class="size-5 shrink-0 overflow-hidden rounded-md">
															<AvatarImage v-if="pl.image" :src="pl.image" />
															<AvatarFallback class="bg-emerald-500/10 text-[9px] text-emerald-500">
																{{ pl.name?.[0]?.toUpperCase() || 'P' }}
															</AvatarFallback>
														</Avatar>
														<span class="truncate pr-6">{{ pl.name }}</span>
														<ComboboxItemIndicator class="absolute right-2 flex items-center justify-center">
															<Check class="size-4" />
														</ComboboxItemIndicator>
													</ComboboxItem>
												</ComboboxGroup>
											</ComboboxViewport>
										</ComboboxList>
									</Combobox>
									<Button
										v-if="form.targetPlaylist"
										variant="outline"
										size="icon"
										class="shrink-0 animate-in duration-200 fade-in zoom-in"
										title="Clear target playlist"
										@click="clearTargetPlaylist"
									>
										<X class="size-4 text-muted-foreground" />
									</Button>
								</div>
								<FieldDescription>When you or qualified moderators type <code class="rounded-sm bg-muted px-1.5 py-0.5 text-xs font-semibold">!songrequest like</code> in Twitch chat, the currently playing track immediately saves to this playlist.</FieldDescription>
							</Field>
						</FieldGroup>

						<SettingsGroup>
							<SettingsGroupItem>
								<SettingsGroupContent>
									<SettingsGroupLabel>Allow Moderators to Like Songs</SettingsGroupLabel>
									<SettingsGroupDescription>
										Grants like access to active stream mods. If toggled off, only you can trigger saves.
									</SettingsGroupDescription>
								</SettingsGroupContent>
								<SettingsGroupAction>
									<Switch v-model:model-value="form.allowModerators" />
								</SettingsGroupAction>
							</SettingsGroupItem>
							<SettingsGroupItem>
								<SettingsGroupContent>
									<SettingsGroupLabel>Whisper Save Notifications</SettingsGroupLabel>
									<SettingsGroupDescription>
										Quietly whisper users when their song is officially saved to your playlist instead of shouting in chat.
									</SettingsGroupDescription>
								</SettingsGroupContent>
								<SettingsGroupAction>
									<Switch v-model:model-value="form.whisperNotifications" />
								</SettingsGroupAction>
							</SettingsGroupItem>
							<SettingsGroupItem>
								<SettingsGroupContent>
									<SettingsGroupLabel>Announce Web UI Queue Deletions</SettingsGroupLabel>
									<SettingsGroupDescription>
										Post a message to chat when a song is removed from the queue via the web admin panel.
									</SettingsGroupDescription>
								</SettingsGroupContent>
								<SettingsGroupAction>
									<Switch v-model:model-value="form.announceDeleteWebui" />
								</SettingsGroupAction>
							</SettingsGroupItem>
						</SettingsGroup>
					</div>

					<!-- Right Column (Desktop only widget) -->
					<template #sidebar>
						<SpotifyPlayer
							class="
								sticky top-22 hidden h-fit
								xl:flex
							"
							:currently-playing="status.currentlyPlaying"
							:rate-limited="status.rateLimited"
							:active-progress-ms="activeProgressMs"
						/>
					</template>
				</AppSettingsGrid>
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
	</AppSettingsPage>
</template>
