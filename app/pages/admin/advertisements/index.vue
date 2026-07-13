<script setup lang="ts">
import { AlertCircle, Megaphone, Play, RefreshCcw, Timer } from '@lucide/vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Spinner } from '~/components/ui/spinner'

type AdSettings = Awaited<ReturnType<typeof import('~~/server/api/admin/advertisements/settings.get').default>>
type AdSchedule = Awaited<ReturnType<typeof import('~~/server/api/admin/advertisements/schedule.get').default>>

// Fetch alert settings and schedule via non-blocking useFetch
const { data: settingsData, refresh: refreshSettings, pending: settingsLoading } = useFetch<AdSettings>('/api/admin/advertisements/settings')
const { data: scheduleData, refresh: refreshSchedule, pending: scheduleLoading } = useFetch<AdSchedule>('/api/admin/advertisements/schedule')

const loading = computed(() => settingsLoading.value || scheduleLoading.value)

useHead({
	title: 'Advertisements Management',
})

const form = ref<AdSettings>({
	adsAlertsEnabled: false,
	adsAlert5mEnabled: false,
	adsAlert3mEnabled: false,
	adsAlert1mEnabled: false,
	adsAlertTemplate: '',
})

const isSaving = ref(false)
const isMutating = ref(false)
const commercialLength = ref<string>('30')

// Synchronize form settings once loaded
watch(settingsData, (newData) => {
	if (newData) {
		form.value = { ...newData }
	}
}, { immediate: true })

const isModified = computed(() => {
	if (!settingsData.value)
		return false
	return (
		form.value.adsAlertsEnabled !== settingsData.value.adsAlertsEnabled
		|| form.value.adsAlert5mEnabled !== settingsData.value.adsAlert5mEnabled
		|| form.value.adsAlert3mEnabled !== settingsData.value.adsAlert3mEnabled
		|| form.value.adsAlert1mEnabled !== settingsData.value.adsAlert1mEnabled
		|| form.value.adsAlertTemplate !== settingsData.value.adsAlertTemplate
	)
})

function discardChanges() {
	if (settingsData.value) {
		form.value = { ...settingsData.value }
		toast.info('Discarded unsaved changes')
	}
}

async function saveAdSettings() {
	if (isSaving.value)
		return

	isSaving.value = true
	try {
		await $fetch('/api/admin/advertisements/settings', {
			method: 'PUT',
			body: {
				adsAlertsEnabled: form.value.adsAlertsEnabled,
				adsAlert5mEnabled: form.value.adsAlert5mEnabled,
				adsAlert3mEnabled: form.value.adsAlert3mEnabled,
				adsAlert1mEnabled: form.value.adsAlert1mEnabled,
				adsAlertTemplate: form.value.adsAlertTemplate,
			},
		})
		toast.success('Ad alert settings updated successfully!')
		await refreshSettings()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to save ad settings')
		console.error(err)
	}
	finally {
		isSaving.value = false
	}
}

async function triggerCommercial() {
	if (isMutating.value)
		return

	isMutating.value = true
	try {
		await $fetch('/api/admin/advertisements/commercial', {
			method: 'POST',
			body: {
				length: Number(commercialLength.value),
			},
		})
		toast.success(`Successfully triggered a ${commercialLength.value}s commercial break!`)
		await refreshSchedule()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to trigger commercial break')
		console.error(err)
	}
	finally {
		isMutating.value = false
	}
}

async function snoozeAd() {
	if (isMutating.value)
		return

	isMutating.value = true
	try {
		const res = await $fetch<{ success: boolean, snoozeCount: number }>('/api/admin/advertisements/snooze', {
			method: 'POST',
		})
		toast.success(`Successfully snoozed upcoming ad! Snoozes remaining: ${res.snoozeCount}`)
		await refreshSchedule()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to snooze ad break')
		console.error(err)
	}
	finally {
		isMutating.value = false
	}
}

// Live timer ticking for countdowns
const currentTime = ref(Date.now())
let timerId: any = null

onMounted(() => {
	timerId = setInterval(() => {
		currentTime.value = Date.now()
	}, 1000)
})

onUnmounted(() => {
	if (timerId) {
		clearInterval(timerId)
	}
})

const remainingSeconds = computed(() => {
	if (!scheduleData.value?.nextAdAt)
		return 0
	return Math.max(0, Math.floor((new Date(scheduleData.value.nextAdAt).getTime() - currentTime.value) / 1000))
})

const formattedCountdown = computed(() => {
	if (!scheduleData.value?.nextAdAt)
		return '--:--'
	const totalSecs = remainingSeconds.value
	if (totalSecs <= 0)
		return '00:00'
	const mins = Math.floor(totalSecs / 60)
	const secs = totalSecs % 60
	return `${mins}:${secs.toString().padStart(2, '0')}`
})

function formatSeconds(totalSeconds: number): string {
	if (!totalSeconds)
		return 'None'
	const mins = Math.floor(totalSeconds / 60)
	const secs = totalSeconds % 60
	const parts: string[] = []
	if (mins > 0)
		parts.push(`${mins}m`)
	if (secs > 0)
		parts.push(`${secs}s`)
	return parts.join(' ')
}

function formatDate(dateStr: string | null): string {
	if (!dateStr)
		return 'N/A'
	const d = new Date(dateStr)
	return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatSnoozeRefresh(dateStr: string | null): string {
	if (!dateStr)
		return 'N/A'
	const ms = new Date(dateStr).getTime() - currentTime.value
	if (ms <= 0)
		return 'Ready'
	const totalSeconds = Math.floor(ms / 1000)
	const hours = Math.floor(totalSeconds / 3600)
	const mins = Math.floor((totalSeconds % 3600) / 60)
	const secs = totalSeconds % 60
	const parts: string[] = []
	if (hours > 0)
		parts.push(`${hours}h`)
	if (mins > 0)
		parts.push(`${mins}m`)
	parts.push(`${secs}s`)
	return parts.join(' ')
}

async function refreshAll() {
	await Promise.all([refreshSettings(), refreshSchedule()])
}
</script>

<template>
	<AppSettingsPage
		heading="Advertisements Management"
		subheading="Monitor the upcoming commercial schedule, configure chat warning alerts, and trigger manual ad breaks."
	>
		<template #header-actions>
			<Button variant="ghost" :disabled="loading" @click="refreshAll">
				<RefreshCcw :class="{ 'animate-spin': loading }" />
			</Button>
		</template>
		<!-- Full Page Loader -->
		<div v-if="loading && !settingsData" class="flex flex-col items-center justify-center gap-2 py-20">
			<Spinner class="size-8 text-primary" />
			<span class="text-sm text-muted-foreground">Retrieving channel ad schedule configurations...</span>
		</div>

		<AppSettingsGrid v-else>
			<!-- Left Column: Settings Controls -->
			<SettingsGroup>
				<SettingsGroupItem>
					<SettingsGroupContent>
						<SettingsGroupLabel>Enable Chat Alerts</SettingsGroupLabel>
						<SettingsGroupDescription>
							Enable or disable warning alerts for scheduled ads.
						</SettingsGroupDescription>
					</SettingsGroupContent>
					<SettingsGroupAction>
						<Switch v-model="form.adsAlertsEnabled" />
					</SettingsGroupAction>
				</SettingsGroupItem>

				<!-- Milestone 5m -->
				<SettingsGroupItem :class="{ 'opacity-50': !form.adsAlertsEnabled }">
					<SettingsGroupContent>
						<SettingsGroupLabel>5 Minutes Warning Milestone</SettingsGroupLabel>
						<SettingsGroupDescription>
							Post warning alert 5 minutes before scheduled ad breaks.
						</SettingsGroupDescription>
					</SettingsGroupContent>
					<SettingsGroupAction>
						<Switch v-model="form.adsAlert5mEnabled" :disabled="!form.adsAlertsEnabled" />
					</SettingsGroupAction>
				</SettingsGroupItem>

				<!-- Milestone 3m -->
				<SettingsGroupItem :class="{ 'opacity-50': !form.adsAlertsEnabled }">
					<SettingsGroupContent>
						<SettingsGroupLabel>3 Minutes Warning Milestone</SettingsGroupLabel>
						<SettingsGroupDescription>
							Post warning alert 3 minutes before scheduled ad breaks.
						</SettingsGroupDescription>
					</SettingsGroupContent>
					<SettingsGroupAction>
						<Switch v-model="form.adsAlert3mEnabled" :disabled="!form.adsAlertsEnabled" />
					</SettingsGroupAction>
				</SettingsGroupItem>

				<!-- Milestone 1m -->
				<SettingsGroupItem :class="{ 'opacity-50': !form.adsAlertsEnabled }">
					<SettingsGroupContent>
						<SettingsGroupLabel>1 Minute Warning Milestone</SettingsGroupLabel>
						<SettingsGroupDescription>
							Post warning alert 1 minute before scheduled ad breaks.
						</SettingsGroupDescription>
					</SettingsGroupContent>
					<SettingsGroupAction>
						<Switch v-model="form.adsAlert1mEnabled" :disabled="!form.adsAlertsEnabled" />
					</SettingsGroupAction>
				</SettingsGroupItem>

				<!-- Info note about ad start event -->
				<div class="px-0 py-2 text-xs text-muted-foreground" :class="{ 'opacity-50': !form.adsAlertsEnabled }">
					Note: The final alert shown when the commercial break officially starts is managed on the
					<NuxtLink
						to="/admin/alerts" class="
							font-medium text-primary
							hover:underline
						"
						:class="{ 'pointer-events-none': !form.adsAlertsEnabled }"
					>
						Alerts & Events
					</NuxtLink>
					page.
				</div>
			</SettingsGroup>

			<FieldGroup class="flex flex-col gap-4" :class="{ 'opacity-50': !form.adsAlertsEnabled }">
				<Field>
					<FieldLabel for="adsAlertTemplate">
						Warning Message Template
					</FieldLabel>
					<Textarea
						id="adsAlertTemplate"
						v-model="form.adsAlertTemplate"
						:disabled="!form.adsAlertsEnabled"
						placeholder="e.g. Ad break of $(duration) seconds is starting in $(time)!"
						rows="3"
						class="w-full"
					/>
					<FieldDescription>
						Customize the text posted to chat when an ad warning is triggered.
					</FieldDescription>
					<div class="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground select-none">
						<span>Variables:</span>
						<code class="rounded-sm bg-muted px-1.5 py-0.5 font-mono">$(time)</code>
						<span>(Milestone time e.g. "5 minutes")</span>
						<code class="rounded-sm bg-muted px-1.5 py-0.5 font-mono">$(duration)</code>
						<span>(Break length in seconds)</span>
					</div>
				</Field>
			</FieldGroup>
			<!-- Right Column: Status & Widget Panel -->
			<template #sidebar>
				<!-- Live Schedule Status Card -->
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<Megaphone class="size-4" />
							Ad Schedule Status
						</CardTitle>
						<CardDescription>
							Real-time countdown and Twitch ad slots monitor.
						</CardDescription>
					</CardHeader>
					<CardContent class="flex flex-col gap-4">
						<div class="flex items-center justify-between text-xs">
							<span class="font-semibold text-muted-foreground uppercase">Stream Status</span>
							<Badge :variant="scheduleData?.isOnline ? 'default' : 'secondary'">
								{{ scheduleData?.isOnline ? 'Online' : 'Offline' }}
							</Badge>
						</div>

						<Separator />

						<!-- Countdown block -->
						<div class="flex flex-col gap-2">
							<div class="flex items-center justify-between text-xs">
								<span class="font-medium text-muted-foreground">Next Scheduled Ad break</span>
								<span class="font-mono font-bold text-foreground">
									{{ scheduleData?.nextAdAt ? formattedCountdown : '--:--' }}
								</span>
							</div>
							<Progress :model-value="scheduleData?.nextAdAt ? Math.min(100, Math.max(0, (remainingSeconds / 1800) * 100)) : 0" class="rotate-180" />
							<p class="text-xs text-muted-foreground/80">
								{{ scheduleData?.nextAdAt ? `Scheduled at ${formatDate(scheduleData.nextAdAt)}` : 'No upcoming ad scheduled or stream is offline.' }}
							</p>
						</div>

						<Separator />

						<!-- Schedule statistics -->
						<div class="grid grid-cols-2 gap-4 text-sm">
							<div class="flex flex-col gap-1 border-r pr-2">
								<span class="text-xs text-muted-foreground">Last Ad Break</span>
								<span class="truncate font-semibold text-foreground">
									{{ scheduleData?.lastAdAt ? formatDate(scheduleData.lastAdAt) : 'None' }}
								</span>
							</div>
							<div class="flex flex-col gap-1 pl-2">
								<span class="text-xs text-muted-foreground">Pre-roll Free Time</span>
								<span class="truncate font-semibold text-foreground">
									{{ scheduleData?.prerollFreeTime ? formatSeconds(scheduleData.prerollFreeTime) : 'None' }}
								</span>
							</div>
						</div>

						<Separator />

						<div class="flex flex-col gap-3">
							<div class="flex items-center justify-between text-xs">
								<span class="font-medium text-muted-foreground">Snoozes Available</span>
								<Badge variant="outline" class="font-mono font-semibold">
									{{ scheduleData?.snoozeCount ?? 0 }}
								</Badge>
							</div>
							<div class="flex items-center justify-between text-xs">
								<span class="font-medium text-muted-foreground">Snooze Refresh At</span>
								<span class="font-mono text-muted-foreground">
									{{ scheduleData?.snoozeRefreshAt ? formatSnoozeRefresh(scheduleData.snoozeRefreshAt) : 'Ready' }}
								</span>
							</div>
						</div>

						<Button
							size="sm"
							variant="outline"
							:disabled="isMutating || !scheduleData?.isOnline || !scheduleData?.nextAdAt || !scheduleData?.snoozeCount"
							class="mt-2"
							@click="snoozeAd"
						>
							<Spinner v-if="isMutating" data-icon="inline-start" />
							<Timer v-else class="size-4" data-icon="inline-start" />
							Snooze Next Ad
						</Button>
					</CardContent>
				</Card>

				<!-- Manual Commercial Trigger Card -->
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<Play class="size-5 text-muted-foreground" />
							Trigger Commercial
						</CardTitle>
						<CardDescription>
							Manually start an ad break on your channel.
						</CardDescription>
					</CardHeader>
					<CardContent class="flex flex-col gap-4">
						<p class="text-sm text-muted-foreground">
							Manually running a commercial break will disable pre-roll advertisements on your stream. The length must be selected in seconds.
						</p>
						<div
							class="
								flex flex-col gap-4
								sm:flex-row sm:items-center
							"
						>
							<div class="w-full">
								<Select v-model="commercialLength">
									<SelectTrigger class="w-full">
										<SelectValue placeholder="Duration" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="30">
											30 seconds
										</SelectItem>
										<SelectItem value="60">
											60 seconds
										</SelectItem>
										<SelectItem value="90">
											90 seconds
										</SelectItem>
										<SelectItem value="120">
											120 seconds
										</SelectItem>
										<SelectItem value="150">
											150 seconds
										</SelectItem>
										<SelectItem value="180">
											180 seconds
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<Button
								:disabled="isMutating || !scheduleData?.isOnline"
								variant="default"
								class="
									w-full
									sm:w-auto
								"
								@click="triggerCommercial"
							>
								<Spinner v-if="isMutating" data-icon="inline-start" />
								<Play v-else class="size-4" data-icon="inline-start" />
								Trigger Ad Break
							</Button>
						</div>
						<div v-if="scheduleData && !scheduleData.isOnline" class="flex items-center gap-2 text-xs text-amber-500">
							<AlertCircle class="size-4" />
							Stream must be live to trigger manual commercials.
						</div>
					</CardContent>
				</Card>
			</template>
		</AppSettingsGrid>

		<!-- Save bar -->
		<AppFloatingSaveBar
			:show="isModified"
			:is-saving="isSaving"
			title="Unsaved Advertisement Settings"
			description="You have modified warning chat alerts. Save to instantly update the bot alerts."
			save-text="Save Settings"
			saving-text="Saving Settings..."
			discard-text="Discard Changes"
			@save="saveAdSettings"
			@discard="discardChanges"
		/>
	</AppSettingsPage>
</template>
