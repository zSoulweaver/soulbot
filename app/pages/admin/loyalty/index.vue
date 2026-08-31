<script setup lang="ts">
import { Clock, HelpCircle, Sparkles } from '@lucide/vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { NumberField, NumberFieldContent, NumberFieldDecrement, NumberFieldIncrement, NumberFieldInput } from '~/components/ui/number-field'
import { Progress } from '~/components/ui/progress'
import { Spinner } from '~/components/ui/spinner'

interface PointsSettings {
	currencyName: string
	currencyNamePlural: string
	payoutInterval: number
	payoutIntervalOffline: number
	payoutAmount: number
	payoutAmountOffline: number
	activeBonus: number
}

const {
	form,
	initialData: settingsData,
	isModified,
	isSaving,
	loading,
	refresh: refreshSettings,
	discard: discardChanges,
	save: saveSettings,
} = useSettingsForm<PointsSettings>('/api/loyalty/settings', {
	successMessage: 'Points payout settings saved successfully!',
})

useHead({
	title: 'Points Settings',
})

// Next Payout live monitor state
const { data: nextPayoutData, refresh: refreshNextPayout } = useFetch('/api/loyalty/next-payout')
const currentTime = ref(Date.now())
const isPayoutNowLoading = ref(false)
let timeIntervalId: any = null

const isOnline = computed(() => nextPayoutData.value?.isOnline ?? true)

const totalIntervalSeconds = computed(() => {
	const mins = isOnline.value
		? (settingsData.value?.payoutInterval ?? 5)
		: (settingsData.value?.payoutIntervalOffline ?? 10)
	return mins * 60
})

const remainingSeconds = computed(() => {
	if (!nextPayoutData.value?.nextPayoutTime)
		return 0
	return Math.max(0, Math.floor((nextPayoutData.value.nextPayoutTime - currentTime.value) / 1000))
})

const elapsedSeconds = computed(() => {
	return Math.max(0, totalIntervalSeconds.value - remainingSeconds.value)
})

const progressPercent = computed(() => {
	if (totalIntervalSeconds.value <= 0)
		return 100
	return Math.min(100, Math.max(0, (elapsedSeconds.value / totalIntervalSeconds.value) * 100))
})

const formattedCountdown = computed(() => {
	if (!nextPayoutData.value?.nextPayoutTime)
		return '--:--'
	const mins = Math.floor(remainingSeconds.value / 60)
	const secs = remainingSeconds.value % 60
	return `${mins}:${secs.toString().padStart(2, '0')}`
})

async function triggerPayoutNow() {
	if (isPayoutNowLoading.value)
		return
	isPayoutNowLoading.value = true
	try {
		await $fetch('/api/loyalty/payout-now', { method: 'POST' })
		toast.success('Payout triggered successfully!')
		await refreshNextPayout()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to trigger manual payout')
	}
	finally {
		isPayoutNowLoading.value = false
	}
}

onMounted(() => {
	timeIntervalId = setInterval(async () => {
		currentTime.value = Date.now()
		if (nextPayoutData.value?.nextPayoutTime && Date.now() >= nextPayoutData.value.nextPayoutTime) {
			await refreshNextPayout()
		}
	}, 1000)
})

onUnmounted(() => {
	if (timeIntervalId) {
		clearInterval(timeIntervalId)
	}
})
</script>

<template>
	<AppSettingsPage
		heading="Points & Payout Settings"
		subheading="Configure currency customization, online/offline payout cycles, and active chatter bonuses."
	>
		<template #header-actions>
			<AppRefreshButton :loading="loading" @click="refreshSettings" />
		</template>
		<!-- Loading state -->
		<div v-if="loading" class="flex flex-col items-center justify-center gap-2 py-20">
			<Spinner class="size-8 text-primary" />
			<span class="text-sm text-muted-foreground">Loading active configurations...</span>
		</div>

		<AppSettingsGrid v-else>
			<!-- Section 1: Currency Configuration -->
			<AppSettingsSection>
				<SettingsHeading>Currency Customization</SettingsHeading>
				<SettingsGroup>
					<SettingsGroupItem>
						<SettingsGroupContent>
							<SettingsGroupLabel>Singular Name</SettingsGroupLabel>
							<SettingsGroupDescription>
								Used for single values (e.g. 1 coin).
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction>
							<Input
								id="currencyName"
								v-model="form.currencyName"
								type="text"
								placeholder="e.g. coin"
								class="w-full"
							/>
						</SettingsGroupAction>
					</SettingsGroupItem>

					<SettingsGroupItem>
						<SettingsGroupContent>
							<SettingsGroupLabel>Plural Name</SettingsGroupLabel>
							<SettingsGroupDescription>
								Used for multi or default values (e.g. 50 coins).
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction>
							<Input
								id="currencyNamePlural"
								v-model="form.currencyNamePlural"
								type="text"
								placeholder="e.g. coins"
								class="w-full"
							/>
						</SettingsGroupAction>
					</SettingsGroupItem>
				</SettingsGroup>
			</AppSettingsSection>

			<!-- Section 2: Online Payout Settings -->
			<AppSettingsSection>
				<SettingsHeading>Online Payout Schedule</SettingsHeading>
				<SettingsGroup>
					<SettingsGroupItem>
						<SettingsGroupContent>
							<SettingsGroupLabel>Interval (Minutes)</SettingsGroupLabel>
							<SettingsGroupDescription>
								Time frequency of payout checks when stream is live.
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction>
							<NumberField id="payoutInterval" v-model="form.payoutInterval" :min="1" :default-value="1" class="w-full">
								<NumberFieldContent>
									<NumberFieldDecrement />
									<NumberFieldInput />
									<NumberFieldIncrement />
								</NumberFieldContent>
							</NumberField>
						</SettingsGroupAction>
					</SettingsGroupItem>

					<SettingsGroupItem>
						<SettingsGroupContent>
							<SettingsGroupLabel>Base Payout</SettingsGroupLabel>
							<SettingsGroupDescription>
								Points awarded to all chatters on each cycle.
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction>
							<NumberField id="payoutAmount" v-model="form.payoutAmount" :min="0" :default-value="0" class="w-full">
								<NumberFieldContent>
									<NumberFieldDecrement />
									<NumberFieldInput />
									<NumberFieldIncrement />
								</NumberFieldContent>
							</NumberField>
						</SettingsGroupAction>
					</SettingsGroupItem>

					<SettingsGroupItem>
						<SettingsGroupContent>
							<SettingsGroupLabel>Active Chat Bonus</SettingsGroupLabel>
							<SettingsGroupDescription>
								Additional bonus points awarded to chatters who sent a message.
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction>
							<NumberField id="activeBonus" v-model="form.activeBonus" :min="0" :default-value="0" class="w-full">
								<NumberFieldContent>
									<NumberFieldDecrement />
									<NumberFieldInput />
									<NumberFieldIncrement />
								</NumberFieldContent>
							</NumberField>
						</SettingsGroupAction>
					</SettingsGroupItem>
				</SettingsGroup>
			</AppSettingsSection>

			<!-- Section 3: Offline Payout Settings -->
			<AppSettingsSection>
				<SettingsHeading>Offline Payout Schedule</SettingsHeading>
				<SettingsGroup>
					<SettingsGroupItem>
						<SettingsGroupContent>
							<SettingsGroupLabel>Interval (Minutes)</SettingsGroupLabel>
							<SettingsGroupDescription>
								Time frequency of payout checks when offline.
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction>
							<NumberField id="payoutIntervalOffline" v-model="form.payoutIntervalOffline" :min="1" :default-value="1" class="w-full">
								<NumberFieldContent>
									<NumberFieldDecrement />
									<NumberFieldInput />
									<NumberFieldIncrement />
								</NumberFieldContent>
							</NumberField>
						</SettingsGroupAction>
					</SettingsGroupItem>

					<SettingsGroupItem>
						<SettingsGroupContent>
							<SettingsGroupLabel>Base Payout</SettingsGroupLabel>
							<SettingsGroupDescription>
								Points awarded to all chatters when offline (0 disables).
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction>
							<NumberField id="payoutAmountOffline" v-model="form.payoutAmountOffline" :default-value="0" class="w-full">
								<NumberFieldContent>
									<NumberFieldDecrement />
									<NumberFieldInput />
									<NumberFieldIncrement />
								</NumberFieldContent>
							</NumberField>
						</SettingsGroupAction>
					</SettingsGroupItem>
				</SettingsGroup>
			</AppSettingsSection>

			<!-- Help / Mechanics Panel -->
			<template #sidebar>
				<!-- Live Payout Engine Monitor -->
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<Clock class="size-4" />
							Point Payout Engine Status
						</CardTitle>
						<CardDescription>
							Real-time monitoring and manual execution controls.
						</CardDescription>
					</CardHeader>
					<CardContent class="flex flex-col gap-4">
						<div class="flex items-center justify-between text-xs">
							<span class="font-semibold text-muted-foreground uppercase">Stream Status</span>
							<Badge :variant="isOnline ? 'default' : 'secondary'">
								{{ isOnline ? 'Online' : 'Offline' }}
							</Badge>
						</div>

						<Separator />

						<div class="flex flex-col gap-2">
							<div class="flex items-center justify-between text-xs">
								<span class="font-medium text-muted-foreground">Next Payout Cycle</span>
								<span class="font-mono font-bold text-foreground">{{ formattedCountdown }}</span>
							</div>
							<Progress :model-value="progressPercent" />
							<p class="text-xs text-muted-foreground/80">
								Running checks every {{ isOnline ? settingsData?.payoutInterval : settingsData?.payoutIntervalOffline }} minutes.
							</p>
						</div>

						<Button
							size="sm"
							variant="outline"
							:disabled="isPayoutNowLoading"
							@click="triggerPayoutNow"
						>
							<Spinner v-if="isPayoutNowLoading" data-icon="inline-start" />
							<Sparkles v-else data-icon="inline-start" />
							Payout Now
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<HelpCircle class="size-4 text-muted-foreground" />
							How Payouts Work
						</CardTitle>
					</CardHeader>
					<CardContent class="flex flex-col gap-3 text-sm/relaxed text-muted-foreground">
						<p>
							The bot runs a background payout engine that queries the Twitch API to fetch all chatters currently connected to your channel.
						</p>
						<p>
							Every chatter in the list is awarded the base payout amount (online or offline). If a chatter has sent a message during the current interval, they are also awarded the active chatter bonus!
						</p>
						<p>
							If the channel is offline and the offline payout amount is configured to 0, the engine will skip that payout.
						</p>
						<Alert variant="warning">
							<AlertDescription>
								Updates to the payout interval take effect from the next payout run. Updates to the payout amounts will take take effect on the upcoming payout run.
							</AlertDescription>
						</Alert>
					</CardContent>
				</Card>
			</template>
		</AppSettingsGrid>
		<AppFloatingSaveBar
			:show="isModified"
			:is-saving="isSaving"
			title="Unsaved Payout Settings"
			description="You have modified points settings. Save to instantly update the Twitch chat payout schedules."
			save-text="Save Settings"
			saving-text="Saving Settings..."
			discard-text="Discard Changes"
			@save="saveSettings"
			@discard="discardChanges"
		/>
	</AppSettingsPage>
</template>
