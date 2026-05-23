<script setup lang="ts">
import { AlertCircle, Clock, HelpCircle, Landmark, Loader2, Save, Sparkles } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { NumberField, NumberFieldContent, NumberFieldDecrement, NumberFieldIncrement, NumberFieldInput } from '~/components/ui/number-field'
import { Progress } from '~/components/ui/progress'

interface PointsSettings {
	currencyName: string
	currencyNamePlural: string
	payoutInterval: number
	payoutIntervalOffline: number
	payoutAmount: number
	payoutAmountOffline: number
	activeBonus: number
}

// Fetch active settings
const { data: settingsData, refresh: refreshSettings, pending: loading } = await useFetch<PointsSettings>('/api/points/settings')

const currencyNameVal = ref('point')
const currencyNamePluralVal = ref('points')
const intervalVal = ref(5)
const intervalOfflineVal = ref(10)
const amountVal = ref(5)
const amountOfflineVal = ref(0)
const activeBonusVal = ref(5)
const isSaving = ref(false)

// Synchronize values once loaded
watch(settingsData, (newData) => {
	if (newData) {
		currencyNameVal.value = newData.currencyName
		currencyNamePluralVal.value = newData.currencyNamePlural
		intervalVal.value = newData.payoutInterval
		intervalOfflineVal.value = newData.payoutIntervalOffline
		amountVal.value = newData.payoutAmount
		amountOfflineVal.value = newData.payoutAmountOffline
		activeBonusVal.value = newData.activeBonus
	}
}, { immediate: true })

async function saveSettings() {
	if (!currencyNameVal.value.trim()) {
		toast.error('Currency singular name is required')
		return
	}
	if (!currencyNamePluralVal.value.trim()) {
		toast.error('Currency plural name is required')
		return
	}
	if (intervalVal.value < 1) {
		toast.error('Online payout interval must be at least 1 minute')
		return
	}
	if (intervalOfflineVal.value < 1) {
		toast.error('Offline payout interval must be at least 1 minute')
		return
	}
	if (amountVal.value < 0) {
		toast.error('Online payout amount cannot be negative')
		return
	}
	if (amountOfflineVal.value < 0) {
		toast.error('Offline payout amount cannot be negative')
		return
	}
	if (activeBonusVal.value < 0) {
		toast.error('Active chatter bonus cannot be negative')
		return
	}

	isSaving.value = true
	try {
		await $fetch('/api/points/settings', {
			method: 'PUT',
			body: {
				currencyName: currencyNameVal.value,
				currencyNamePlural: currencyNamePluralVal.value,
				payoutInterval: Number(intervalVal.value),
				payoutIntervalOffline: Number(intervalOfflineVal.value),
				payoutAmount: Number(amountVal.value),
				payoutAmountOffline: Number(amountOfflineVal.value),
				activeBonus: Number(activeBonusVal.value),
			},
		})
		toast.success('Points payout settings saved successfully!')
		await refreshSettings()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to save settings')
	}
	finally {
		isSaving.value = false
	}
}

// Next Payout live monitor state
const { data: nextPayoutData, refresh: refreshNextPayout } = await useFetch('/api/points/next-payout')
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
	isPayoutNowLoading.value = true
	try {
		await $fetch('/api/points/payout-now', { method: 'POST' })
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
	<div class="flex flex-col gap-6">
		<AppPageHeader
			heading="Points Settings"
			subheading="Configure currency customization, online/offline payout cycles, and active chatter bonuses."
		>
			<Button variant="outline" size="sm" :disabled="loading" @click="refreshSettings">
				Refresh
			</Button>
		</AppPageHeader>

		<div
			class="
				grid grid-cols-1 gap-6
				lg:grid-cols-3
			"
		>
			<!-- Settings Editor Panel -->
			<Card class="lg:col-span-2">
				<CardHeader>
					<CardTitle>Points Configuration</CardTitle>
					<CardDescription>Adjust name values, intervals, rewards, and bonuses for your channel's points engine.</CardDescription>
				</CardHeader>
				<CardContent class="flex flex-col gap-6">
					<div v-if="loading" class="py-10 text-center text-muted-foreground">
						Loading active configurations...
					</div>
					<div v-else class="flex flex-col gap-8">
						<!-- Section 1: Currency Configuration -->
						<div class="flex flex-col gap-4">
							<h3 class="flex items-center gap-2 font-semibold">
								<Landmark class="size-4" />
								Currency Customization
							</h3>
							<FieldGroup
								class="
									grid grid-cols-1 gap-4
									sm:grid-cols-2
								"
							>
								<Field>
									<FieldLabel for="currencyName" class="text-xs font-bold text-muted-foreground uppercase">
										Singular Name
									</FieldLabel>
									<Input
										id="currencyName"
										v-model="currencyNameVal"
										type="text"
										placeholder="e.g. coin"
									/>
									<FieldDescription>
										Used for single values (e.g. 1 coin).
									</FieldDescription>
								</Field>
								<Field>
									<FieldLabel for="currencyNamePlural" class="text-xs font-bold text-muted-foreground uppercase">
										Plural Name
									</FieldLabel>
									<Input
										id="currencyNamePlural"
										v-model="currencyNamePluralVal"
										type="text"
										placeholder="e.g. coins"
									/>
									<FieldDescription>
										Used for multi or default values (e.g. 50 coins).
									</FieldDescription>
								</Field>
							</FieldGroup>
						</div>

						<Separator />

						<!-- Section 2: Online Payout Settings -->
						<div class="flex flex-col gap-4">
							<h3 class="flex items-center gap-2 font-semibold">
								<span class="relative flex size-2">
									<span class="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
									<span class="relative inline-flex size-2 rounded-full bg-green-500" />
								</span>
								Online Payout Schedule
							</h3>
							<FieldGroup
								class="
									grid grid-cols-1 gap-4
									sm:grid-cols-3
								"
							>
								<Field>
									<FieldLabel for="payoutInterval" class="text-xs font-bold text-muted-foreground uppercase">
										Interval (Minutes)
									</FieldLabel>
									<NumberField id="payoutInterval" v-model="intervalVal" :min="1" :default-value="1">
										<NumberFieldContent>
											<NumberFieldDecrement />
											<NumberFieldInput />
											<NumberFieldIncrement />
										</NumberFieldContent>
									</NumberField>
									<FieldDescription>
										Time frequency of payout checks when stream is live.
									</FieldDescription>
								</Field>
								<Field>
									<FieldLabel for="payoutAmount" class="text-xs font-bold text-muted-foreground uppercase">
										Base Payout
									</FieldLabel>
									<NumberField id="payoutAmount" v-model="amountVal" :min="0" :default-value="0">
										<NumberFieldContent>
											<NumberFieldDecrement />
											<NumberFieldInput />
											<NumberFieldIncrement />
										</NumberFieldContent>
									</NumberField>
									<FieldDescription>
										Points awarded to all chatters on each cycle.
									</FieldDescription>
								</Field>
								<Field>
									<FieldLabel for="activeBonus" class="text-xs font-bold text-muted-foreground uppercase">
										Active Chat Bonus
									</FieldLabel>
									<NumberField id="activeBonus" v-model="activeBonusVal" :min="0" :default-value="0">
										<NumberFieldContent>
											<NumberFieldDecrement />
											<NumberFieldInput />
											<NumberFieldIncrement />
										</NumberFieldContent>
									</NumberField>
									<FieldDescription>
										Additional bonus points awarded to chatters who sent a message.
									</FieldDescription>
								</Field>
							</FieldGroup>
						</div>

						<Separator />

						<!-- Section 3: Offline Payout Settings -->
						<div class="flex flex-col gap-4">
							<h3 class="flex items-center gap-2 text-base font-semibold">
								<span class="inline-flex size-2 rounded-full bg-muted-foreground" />
								Offline Payout Schedule
							</h3>
							<FieldGroup
								class="
									grid grid-cols-1 gap-4
									sm:grid-cols-2
								"
							>
								<Field>
									<FieldLabel for="payoutIntervalOffline" class="text-xs font-bold text-muted-foreground uppercase">
										Interval (Minutes)
									</FieldLabel>
									<NumberField id="payoutIntervalOffline" v-model="intervalOfflineVal" :min="1" :default-value="1">
										<NumberFieldContent>
											<NumberFieldDecrement />
											<NumberFieldInput />
											<NumberFieldIncrement />
										</NumberFieldContent>
									</NumberField>
									<FieldDescription>
										Time frequency of payout checks when offline.
									</FieldDescription>
								</Field>
								<Field>
									<FieldLabel for="payoutAmountOffline" class="text-xs font-bold text-muted-foreground uppercase">
										Base Payout
									</FieldLabel>
									<NumberField id="payoutAmountOffline" v-model="amountOfflineVal" :default-value="0">
										<NumberFieldContent>
											<NumberFieldDecrement />
											<NumberFieldInput />
											<NumberFieldIncrement />
										</NumberFieldContent>
									</NumberField>
									<FieldDescription>
										Points awarded to all chatters when offline (0 disables).
									</FieldDescription>
								</Field>
							</FieldGroup>
						</div>
					</div>
				</CardContent>
				<CardFooter class="justify-end border-t border-border">
					<Button :disabled="isSaving || loading" @click="saveSettings">
						<Save />
						{{ isSaving ? 'Saving...' : 'Save Settings' }}
					</Button>
				</CardFooter>
			</Card>

			<!-- Help / Mechanics Panel -->
			<div class="flex flex-col gap-6">
				<!-- Live Payout Engine Monitor -->
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<Clock class="size-4" />
							Payout Engine Status
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
							<Sparkles v-if="!isPayoutNowLoading" />
							<Loader2 v-else class="animate-spin" />
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
							The bot runs a background watch-time payout engine that queries the Twitch API to fetch all chatters currently connected to your channel.
						</p>
						<p>
							Every chatter in the list is awarded the base payout amount (online or offline). If a chatter has sent a message during the current interval, they are also awarded the active chatter bonus!
						</p>
						<p>
							If the channel is offline and the offline payout amount is configured to 0, the engine will skip that payout.
						</p>
						<div class="mt-2 flex gap-2 rounded-sm border border-yellow-500/20 bg-yellow-500/10 p-2.5 text-yellow-400">
							<AlertCircle />
							<span>Updates to the payout interval take effect from the next payout run. Updates to the payout amounts will take take effect on the upcoming payout run.</span>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	</div>
</template>
