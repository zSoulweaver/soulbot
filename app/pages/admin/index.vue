<script setup lang="ts">
import {
	Clock,
	Radio,
	RefreshCcw,
	Send,
	Users,
} from '@lucide/vue'
import { useIntervalFn } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Field, FieldGroup } from '~/components/ui/field'
import { Pagination, PaginationContent, PaginationFirst, PaginationLast, PaginationNext, PaginationPrevious } from '~/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Separator } from '~/components/ui/separator'
import { Switch } from '~/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Textarea } from '~/components/ui/textarea'

// User session for caster validation
const { user } = useUserSession()

useHead({
	title: 'Dashboard',
})
const isCaster = computed(() => user.value?.role === 'caster' || user.value?.role === 'admin')

// Loading states for service actions
const isServiceActionPending = ref(false)
const isChatSending = ref(false)

// 1. Fetch live stream information
const { data: streamStatus, refresh: refreshStream, pending: loadingStream, error: errorStream } = useFetch<{
	isOnline: boolean
	title: string
	gameName: string
	viewers: number
	uptime: number
	tags: string[]
}>('/api/admin/stream/status', {
	server: false,
})

// Frontend dynamic minutes tracker for stream uptime
const additionalMinutes = ref(0)

// Increment uptime counter by 1 minute every 60 seconds when stream is online
useIntervalFn(() => {
	if (streamStatus.value?.isOnline) {
		additionalMinutes.value++
	}
}, 60000)

watch(() => streamStatus.value?.uptime, () => {
	additionalMinutes.value = 0
})

const formattedUptime = computed(() => {
	if (!streamStatus.value || !streamStatus.value.isOnline) {
		return '0h 0m'
	}
	const initialMs = streamStatus.value.uptime || 0
	const totalMinutes = Math.floor(initialMs / 60000) + additionalMinutes.value
	const hours = Math.floor(totalMinutes / 60)
	const mins = totalMinutes % 60
	return `${hours}h ${mins}m`
})

// 2. Fetch bot connection status
const { data: botStatus, refresh: refreshBotStatus, pending: loadingBotStatus, error: errorBotStatus } = useFetch<{
	bot: { displayName: string } | null
	streamer: { displayName: string } | null
	isBotRunning: boolean
	isStreamerTokenOutdated: boolean
	isBotTokenOutdated: boolean
}>('/api/bot/status', {
	server: false,
})

// 3. Fetch bot configuration settings
const { data: botSettings, refresh: refreshBotSettings, error: errorBotSettings } = useFetch<{
	chatMode: 'normal' | 'action'
	muted: boolean
}>('/api/bot/settings', {
	server: false,
})

// 4. Fetch recent events for client-side filtering and pagination
const { data: eventsResponse, refresh: refreshEvents, pending: loadingEvents, error: errorEvents } = useFetch<{
	data: any[]
	meta: any
}>('/api/admin/events', {
	query: { limit: 100 },
	server: false,
})

const selectedType = ref('all')
const currentPage = ref(1)
const itemsPerPage = ref(10)

const allEvents = computed(() => eventsResponse.value?.data || [])

// Filter events in memory
const filteredEvents = computed(() => {
	if (selectedType.value === 'all') {
		return allEvents.value
	}
	return allEvents.value.filter(e => e.type === selectedType.value)
})

const totalEvents = computed(() => filteredEvents.value.length)

const startIndex = computed(() => {
	if (totalEvents.value === 0)
		return 0
	return (currentPage.value - 1) * itemsPerPage.value + 1
})

const endIndex = computed(() => {
	return Math.min(currentPage.value * itemsPerPage.value, totalEvents.value)
})

// Paginate events in memory
const paginatedEvents = computed(() => {
	const start = (currentPage.value - 1) * itemsPerPage.value
	const end = start + itemsPerPage.value
	return filteredEvents.value.slice(start, end)
})

watch(selectedType, () => {
	currentPage.value = 1
})

// Refresh all dashboard information
async function refreshDashboard() {
	await Promise.all([
		refreshStream(),
		refreshBotStatus(),
		refreshBotSettings(),
		refreshEvents(),
	])

	const errors = [errorStream.value, errorBotStatus.value, errorBotSettings.value, errorEvents.value].filter(Boolean)
	if (errors.length > 0) {
		const isUnauthorized = errors.some(err => err?.statusCode === 401)
		if (isUnauthorized) {
			toast.error('Session expired or unauthorized. Please log in again.')
		}
		else {
			toast.error('Failed to refresh some dashboard data.')
		}
	}
	else {
		toast.success('Dashboard data refreshed.')
	}
}

// Bot Mute Toggle Action
async function toggleMuted(checked: boolean) {
	if (!botSettings.value)
		return
	const originalMuted = botSettings.value.muted
	try {
		botSettings.value.muted = checked
		await $fetch('/api/bot/settings', {
			method: 'PUT',
			body: {
				chatMode: botSettings.value.chatMode,
				muted: checked,
			},
		})
		toast.success(`Bot is now ${checked ? 'muted' : 'unmuted'}.`)
	}
	catch (error: any) {
		botSettings.value.muted = originalMuted
		toast.error(error.data?.statusMessage || 'Failed to update mute settings.')
	}
}

// Bot Chat Mode Select Action
async function updateChatMode(mode: any) {
	if (!botSettings.value)
		return
	if (mode !== 'normal' && mode !== 'action')
		return
	const originalMode = botSettings.value.chatMode
	try {
		botSettings.value.chatMode = mode
		await $fetch('/api/bot/settings', {
			method: 'PUT',
			body: {
				chatMode: mode,
				muted: botSettings.value.muted,
			},
		})
		toast.success(`Chat response mode set to ${mode === 'action' ? 'action (/me)' : 'normal'}.`)
	}
	catch (error: any) {
		botSettings.value.chatMode = originalMode
		toast.error(error.data?.statusMessage || 'Failed to update chat mode.')
	}
}

// Bot Client Service Start
async function startBotClient() {
	if (isServiceActionPending.value)
		return
	isServiceActionPending.value = true
	try {
		await $fetch('/api/bot/start', { method: 'POST' })
		toast.success('Bot client started successfully.')
		await refreshBotStatus()
	}
	catch (error: any) {
		toast.error(error.data?.statusMessage || 'Failed to start bot client.')
	}
	finally {
		isServiceActionPending.value = false
	}
}

// Bot Client Service Stop
async function stopBotClient() {
	if (isServiceActionPending.value)
		return
	isServiceActionPending.value = true
	try {
		await $fetch('/api/bot/stop', { method: 'POST' })
		toast.success('Bot client stopped successfully.')
		await refreshBotStatus()
	}
	catch (error: any) {
		toast.error(error.data?.statusMessage || 'Failed to stop bot client.')
	}
	finally {
		isServiceActionPending.value = false
	}
}

// Bot Client Service Restart
async function restartBotClient() {
	if (isServiceActionPending.value)
		return
	isServiceActionPending.value = true
	try {
		await $fetch('/api/bot/restart', { method: 'POST' })
		toast.success('Bot client restarted successfully.')
		await refreshBotStatus()
	}
	catch (error: any) {
		toast.error(error.data?.statusMessage || 'Failed to restart bot client.')
	}
	finally {
		isServiceActionPending.value = false
	}
}

// Chat Broadcaster Send
const quickChatMessage = ref('')
async function sendBroadcasterMessage() {
	if (isChatSending.value)
		return
	const trimmed = quickChatMessage.value.trim()
	if (!trimmed)
		return
	isChatSending.value = true
	try {
		await $fetch('/api/admin/chat/send', {
			method: 'POST',
			body: { message: trimmed },
		})
		toast.success('Chat message broadcasted successfully.')
		quickChatMessage.value = ''
	}
	catch (error: any) {
		toast.error(error.data?.statusMessage || 'Failed to broadcast chat message.')
	}
	finally {
		isChatSending.value = false
	}
}

// Poll Twitch stream status every 60 seconds
useIntervalFn(() => {
	refreshStream()
}, 60000)

// Format timestamps for the event feed
function formatTime(timestamp: string | number | Date) {
	const date = new Date(timestamp)
	return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// Format event names for display
function formatEventType(type: string) {
	switch (type) {
		case 'all':
			return 'All'
		case 'follow':
			return 'Follow'
		case 'subscription':
			return 'Subscription'
		case 'gift':
			return 'Sub Gift'
		case 'cheer':
			return 'Cheer (Bits)'
		default:
			return type
	}
}
</script>

<template>
	<AppSettingsPage
		heading="Dashboard"
		subheading="Real-time control and overview of the Twitch bot and stream."
	>
		<template #header-actions>
			<AppRefreshButton :loading="loadingStream || loadingBotStatus" @click="refreshDashboard" />
		</template>
		<div class="flex flex-col gap-4">
			<!-- STREAM CONTROLLER PANELS -->
			<div
				class="
					grid grid-cols-1 gap-6
					md:grid-cols-3
				"
			>
				<!-- PANEL 1: BROADCAST INFORMATION -->
				<Card class="flex flex-col justify-between transition-all duration-300">
					<CardHeader class="flex flex-row items-center justify-between space-y-0">
						<CardTitle class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
							Current Broadcast
						</CardTitle>
						<!-- Live Status indicator -->
						<Badge
							:variant="streamStatus?.isOnline ? 'destructive' : 'secondary'"
							class="text-xs font-semibold tracking-wider uppercase select-none"
						>
							<Radio />
							{{ streamStatus?.isOnline ? 'Live' : 'Offline' }}
						</Badge>
					</CardHeader>
					<CardContent class="flex flex-col gap-2">
						<div class="truncate text-base font-semibold text-foreground">
							{{ streamStatus?.title || 'Loading channel status...' }}
						</div>
						<div class="text-xs text-muted-foreground">
							{{ streamStatus?.gameName || 'Twitch Stream' }}
						</div>
						<Badge
							v-for="tag in streamStatus?.tags"
							:key="tag"
							variant="outline"
							class="text-xs text-muted-foreground"
						>
							{{ tag }}
						</Badge>
					</CardContent>
				</Card>

				<!-- PANEL 2: VIEWERS -->
				<Card class="flex flex-col justify-between">
					<CardHeader class="flex flex-row items-center justify-between space-y-0">
						<CardTitle class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
							Live Viewers
						</CardTitle>
						<Users class="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent class="flex flex-col gap-2">
						<div class="font-mono text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
							{{ streamStatus?.isOnline ? streamStatus.viewers.toLocaleString() : '0' }}
						</div>
						<div class="text-xs text-muted-foreground">
							{{ streamStatus?.isOnline ? 'Active viewers watching now' : 'Stream is currently offline' }}
						</div>
					</CardContent>
				</Card>

				<!-- PANEL 3: UPTIME -->
				<Card class="flex flex-col justify-between">
					<CardHeader class="flex flex-row items-center justify-between space-y-0">
						<CardTitle class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
							Uptime
						</CardTitle>
						<Clock class="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent class="flex flex-col gap-1 pt-4">
						<div class="font-mono text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
							{{ formattedUptime }}
						</div>
						<div class="text-xs text-muted-foreground">
							{{ streamStatus?.isOnline ? 'Time elapsed since broadcast start' : 'No active session' }}
						</div>
					</CardContent>
				</Card>
			</div>

			<!-- BESPOKE LAYOUT GRID -->
			<div
				class="
					grid grid-cols-1 gap-6
					lg:grid-cols-3
				"
			>
				<!-- LEFT COLUMN: EVENT LOG & FEED (2/3 width) -->
				<div
					class="
						flex flex-col gap-4
						lg:col-span-2
					"
				>
					<Card class="h-full border">
						<CardHeader>
							<div>
								<CardTitle class="text-lg">
									Activity Feed
								</CardTitle>
								<CardDescription>Twitch follows, subscriptions, and bits cheers events.</CardDescription>
							</div>
						</CardHeader>

						<CardContent class="flex flex-col gap-4">
							<!-- Filter Toolbar -->
							<Tabs v-model="selectedType" class="w-full">
								<TabsList class="grid w-full grid-cols-5">
									<TabsTrigger
										v-for="type in ['all', 'follow', 'subscription', 'gift', 'cheer']"
										:key="type"
										:value="type"
									>
										{{ formatEventType(type) }}
									</TabsTrigger>
								</TabsList>
							</Tabs>

							<!-- Primitive Table with custom row formats -->
							<div class="relative min-h-75 overflow-hidden rounded-lg border">
								<Table>
									<TableHeader class="bg-muted/40">
										<TableRow>
											<TableHead class="w-30">
												Event
											</TableHead>
											<TableHead>Details</TableHead>
											<TableHead class="w-27.5 text-right">
												Time
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										<!-- Loading overlay row -->
										<TableRow v-if="loadingEvents && allEvents.length === 0">
											<TableCell colspan="3" class="py-20 text-center text-muted-foreground">
												<div class="flex flex-col items-center justify-center gap-2">
													<RefreshCcw class="size-6 animate-spin text-muted-foreground" />
													<span>Loading events feed...</span>
												</div>
											</TableCell>
										</TableRow>

										<!-- Empty feed row -->
										<TableRow v-else-if="filteredEvents.length === 0">
											<TableCell colspan="3" class="py-24 text-center text-muted-foreground">
												No Twitch events recorded.
											</TableCell>
										</TableRow>

										<!-- Data rows -->
										<TableRow
											v-for="item in paginatedEvents"
											:key="item.id"
											class="
												transition-colors
												hover:bg-muted/20
											"
										>
											<!-- Event Badge Cell -->
											<TableCell class="py-3">
												<Badge
													variant="outline"
													:class="{
														'border-red-500/20 bg-red-500/10 text-red-500': item.type === 'follow',
														'border-yellow-500/20 bg-yellow-500/10 text-yellow-500': item.type === 'subscription',
														'border-indigo-500/20 bg-indigo-500/10 text-indigo-500': item.type === 'gift',
														'border-orange-500/20 bg-orange-500/10 text-orange-500': item.type === 'cheer',
													}"
												>
													{{ formatEventType(item.type) }}
												</Badge>
											</TableCell>

											<!-- Details Cell -->
											<TableCell class="py-3">
												<div class="flex flex-col gap-0.5">
													<span class="text-sm font-medium text-foreground">
														{{ item.displayName }}
														<span v-if="item.type === 'follow'" class="font-normal text-muted-foreground">
															followed the channel!
														</span>
														<span v-else-if="item.type === 'subscription'" class="font-normal text-muted-foreground">
															subscribed to the channel!
														</span>
														<span v-else-if="item.type === 'gift'" class="font-normal text-muted-foreground">
															gifted <span class="font-semibold text-foreground">{{ item.metadata?.giftCount }}</span> subscriptions!
														</span>
														<span v-else-if="item.type === 'cheer'" class="font-normal text-muted-foreground">
															cheered <span class="font-semibold text-foreground">{{ item.metadata?.bitsCount }}</span> bits!
														</span>
													</span>

													<!-- Sub Tier details -->
													<span
														v-if="item.type === 'subscription' && item.metadata?.tier"
														class="text-xs font-medium text-muted-foreground"
													>
														Tier: {{ item.metadata.tier === '3000' ? 'Tier 3' : item.metadata.tier === '2000' ? 'Tier 2' : 'Tier 1' }}
													</span>

													<!-- Cheer message details -->
													<span
														v-if="item.type === 'cheer' && item.metadata?.cheerMessage"
														class="mt-0.5 line-clamp-1 max-w-md border-l-2 border-orange-500/30 pl-2 text-xs text-muted-foreground italic"
													>
														"{{ item.metadata.cheerMessage }}"
													</span>
												</div>
											</TableCell>

											<!-- Time Cell -->
											<TableCell class="py-3 text-right font-mono text-xs text-muted-foreground">
												<ClientOnly>
													{{ formatTime(item.createdAt) }}
													<template #fallback>
														--:--:--
													</template>
												</ClientOnly>
											</TableCell>
										</TableRow>
									</TableBody>
								</Table>
							</div>

							<!-- Table Pagination -->
							<div
								v-if="totalEvents > 0"
								class="
									mt-2 flex flex-col items-center justify-between gap-4 select-none
									sm:flex-row
								"
							>
								<span class="text-xs text-muted-foreground">
									Showing {{ startIndex }}-{{ endIndex }} of {{ totalEvents }} events
								</span>

								<Pagination
									v-model:page="currentPage"
									:total="totalEvents"
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
						</CardContent>
					</Card>
				</div>

				<!-- RIGHT COLUMN: BOT SERVICE & CONTROLS (1/3 width) -->
				<div class="flex flex-col gap-6">
					<!-- QUICK CHAT -->
					<Card class="border bg-card">
						<CardHeader>
							<CardTitle class="text-lg font-semibold">
								Quick Chat
							</CardTitle>
							<CardDescription>Send a message directly to Twitch chat as the bot.</CardDescription>
						</CardHeader>
						<CardContent>
							<form class="flex flex-col gap-4" @submit.prevent="sendBroadcasterMessage">
								<FieldGroup>
									<Field>
										<Textarea
											id="quick-chat-message"
											v-model="quickChatMessage"
											placeholder="Type a message to send..."
											rows="3"
											class="resize-none"
											maxlength="500"
											:disabled="isChatSending"
										/>
									</Field>
								</FieldGroup>
								<div class="flex items-center justify-between text-xs text-muted-foreground select-none">
									<span>{{ quickChatMessage.length }}/500 chars</span>
									<Button
										type="submit"
										size="sm"
										class="px-4"
										:disabled="isChatSending || !quickChatMessage.trim()"
									>
										<Send data-icon="inline-start" />
										Send
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>

					<!-- BOT SERVICE & OPERATION WIDGETS -->
					<Card class="border bg-card">
						<CardHeader>
							<CardTitle class="text-lg font-semibold">
								Bot Connection Center
							</CardTitle>
							<CardDescription>Manage bot connectivity and chat state.</CardDescription>
						</CardHeader>
						<CardContent class="flex flex-col gap-4">
							<!-- Connection State Badge -->
							<div class="flex items-center justify-between pb-1">
								<div class="flex flex-col gap-0.5">
									<span class="text-xs text-muted-foreground">Chat Client Status</span>
									<span class="font-medium text-foreground">
										{{ botStatus?.bot?.displayName || 'Twitch Bot' }}
									</span>
								</div>

								<div class="flex items-center gap-2">
									<div class="relative flex size-2">
										<span
											v-if="botStatus?.isBotRunning"
											class="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75"
										/>
										<span
											class="relative inline-flex size-2 rounded-full"
											:class="botStatus?.isBotRunning ? 'bg-green-500' : 'bg-destructive'"
										/>
									</div>
									<span class="text-xs font-semibold tracking-wider uppercase">
										{{ botStatus?.isBotRunning ? 'Connected' : 'Offline' }}
									</span>
								</div>
							</div>

							<Separator />

							<!-- Mute & Chat Mode settings switches -->
							<FieldGroup>
								<Field orientation="horizontal" class="items-center justify-between">
									<div class="flex flex-col gap-0.5">
										<span class="text-sm font-medium">Mute Bot Responses</span>
										<span class="text-xs text-muted-foreground">Suppresses all chat outputs</span>
									</div>
									<Switch
										v-if="botSettings"
										:model-value="botSettings.muted"
										@update:model-value="toggleMuted"
									/>
									<span v-else class="text-xs text-muted-foreground">Loading...</span>
								</Field>

								<Field orientation="horizontal" class="items-center justify-between">
									<div class="flex flex-col gap-0.5">
										<span class="text-sm font-medium">Response Mode</span>
										<span class="text-xs text-muted-foreground">Format message styles</span>
									</div>
									<Select
										v-if="botSettings"
										:model-value="botSettings.chatMode"
										@update:model-value="updateChatMode"
									>
										<SelectTrigger class="h-8 w-32 text-xs">
											<SelectValue placeholder="Mode" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="normal">
												Normal text
											</SelectItem>
											<SelectItem value="action">
												Action (/me)
											</SelectItem>
										</SelectContent>
									</Select>
								</Field>
							</FieldGroup>

							<Separator />

							<!-- Broadcaster Service Action Commands -->
							<div class="flex flex-col gap-2">
								<span class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
									Broadcaster Operation Commands
								</span>
								<div class="grid grid-cols-2 gap-2">
									<Button
										v-if="!botStatus?.isBotRunning"
										variant="outline"
										size="sm"
										class="
											col-span-2 border-green-600/30 text-green-600
											hover:bg-green-500/5
										"
										:disabled="isServiceActionPending || !isCaster"
										@click="startBotClient"
									>
										Start Bot
									</Button>
									<Button
										v-else
										variant="outline"
										size="sm"
										class="
											border-destructive/30 text-destructive
											hover:bg-destructive/5
										"
										:disabled="isServiceActionPending || !isCaster"
										@click="stopBotClient"
									>
										Stop Bot
									</Button>

									<Button
										v-if="botStatus?.isBotRunning"
										variant="outline"
										size="sm"
										:disabled="isServiceActionPending || !isCaster"
										@click="restartBotClient"
									>
										Restart Bot
									</Button>
								</div>
								<span v-if="!isCaster" class="text-center text-[10px] text-muted-foreground italic">
									Service operations are restricted to the broadcaster account
								</span>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	</AppSettingsPage>
</template>
