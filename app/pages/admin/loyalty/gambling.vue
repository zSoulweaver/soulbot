<script setup lang="ts">
import { Dices, HelpCircle, Sparkles } from '@lucide/vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { NumberField, NumberFieldContent, NumberFieldDecrement, NumberFieldIncrement, NumberFieldInput } from '~/components/ui/number-field'
import { Slider } from '~/components/ui/slider'

useRequireUserRole(['caster'])

type GamblingSettings = Awaited<ReturnType<typeof import('~~/server/api/loyalty/gambling.get').default>>

const { data: settingsData, refresh: refreshSettings, pending: loading } = useFetch<GamblingSettings>('/api/loyalty/gambling')

useHead({
	title: 'Gambling Settings',
})

const form = ref<GamblingSettings>({
	minBet: 10,
	maxBet: 100000,
	winMinRoll: 50,
	winMultiplier: 1.0,
	bonusDuration: 5,
	bonusWinMultiplier: 2.0,
	bonusWinMinRoll: 50,
	bonusMessage: '',
	bonusEndMessage: '',
	bonusEndTime: 0,
})

const isSaving = ref(false)
const isTriggering = ref(false)
const isCancelling = ref(false)
const timeRemaining = ref(0)
let timerInterval: NodeJS.Timeout | null = null

watch(settingsData, (newData) => {
	if (newData) {
		form.value = { ...newData }
	}
}, { immediate: true })

const isModified = computed(() => {
	if (!settingsData.value)
		return false
	return (
		form.value.minBet !== settingsData.value.minBet
		|| form.value.maxBet !== settingsData.value.maxBet
		|| form.value.winMinRoll !== settingsData.value.winMinRoll
		|| form.value.winMultiplier !== settingsData.value.winMultiplier
		|| form.value.bonusDuration !== settingsData.value.bonusDuration
		|| form.value.bonusWinMultiplier !== settingsData.value.bonusWinMultiplier
		|| form.value.bonusWinMinRoll !== settingsData.value.bonusWinMinRoll
		|| form.value.bonusMessage !== settingsData.value.bonusMessage
		|| form.value.bonusEndMessage !== settingsData.value.bonusEndMessage
	)
})

// Bind slider's array value to form.winMinRoll
const sliderValue = computed({
	get: () => [form.value.winMinRoll],
	set: (val) => {
		if (val && val.length > 0) {
			form.value.winMinRoll = val[0] ?? 50
		}
	},
})

// Bind slider's array value to form.bonusWinMinRoll
const bonusSliderValue = computed({
	get: () => [form.value.bonusWinMinRoll],
	set: (val) => {
		if (val && val.length > 0) {
			form.value.bonusWinMinRoll = val[0] ?? 50
		}
	},
})

const winChancePercent = computed(() => {
	return Math.max(0, Math.min(100, 101 - form.value.winMinRoll))
})

const bonusWinChancePercent = computed(() => {
	return Math.max(0, Math.min(100, 101 - form.value.bonusWinMinRoll))
})

function startCountdown() {
	if (timerInterval)
		clearInterval(timerInterval)

	const update = () => {
		const end = form.value.bonusEndTime || 0
		const diff = end - Date.now()
		timeRemaining.value = Math.max(0, Math.floor(diff / 1000))
		if (timeRemaining.value <= 0 && timerInterval) {
			clearInterval(timerInterval)
			timerInterval = null
		}
	}
	update()
	timerInterval = setInterval(update, 1000)
}

watch(() => form.value.bonusEndTime, (newVal) => {
	if (newVal && newVal > Date.now()) {
		startCountdown()
	}
	else {
		timeRemaining.value = 0
		if (timerInterval) {
			clearInterval(timerInterval)
			timerInterval = null
		}
	}
}, { immediate: true })

onBeforeUnmount(() => {
	if (timerInterval)
		clearInterval(timerInterval)
})

const formattedTimeRemaining = computed(() => {
	const m = Math.floor(timeRemaining.value / 60)
	const s = timeRemaining.value % 60
	return `${m}:${s.toString().padStart(2, '0')}`
})

async function triggerBonusEvent() {
	isTriggering.value = true
	try {
		await $fetch('/api/loyalty/gambling/bonus/trigger', { method: 'POST' })
		toast.success('Gambling bonus event triggered successfully!')
		await refreshSettings()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to trigger bonus event')
	}
	finally {
		isTriggering.value = false
	}
}

async function cancelBonusEvent() {
	isCancelling.value = true
	try {
		await $fetch('/api/loyalty/gambling/bonus/cancel', { method: 'POST' })
		toast.success('Gambling bonus event ended early.')
		await refreshSettings()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to end bonus event')
	}
	finally {
		isCancelling.value = false
	}
}

function discardChanges() {
	if (settingsData.value) {
		form.value = { ...settingsData.value }
		toast.info('Discarded unsaved changes')
	}
}

async function saveSettings() {
	if (form.value.minBet < 1) {
		toast.error('Minimum bet must be at least 1')
		return
	}
	if (form.value.maxBet < form.value.minBet) {
		toast.error('Maximum bet must be greater than or equal to minimum bet')
		return
	}
	if (form.value.winMinRoll < 1 || form.value.winMinRoll > 100) {
		toast.error('Winning roll threshold must be between 1 and 100')
		return
	}
	if (form.value.winMultiplier < 0.1) {
		toast.error('Winning multiplier must be at least 0.1')
		return
	}
	if (form.value.bonusDuration < 1 || form.value.bonusDuration > 30) {
		toast.error('Bonus duration must be between 1 and 30 minutes')
		return
	}
	if (form.value.bonusWinMultiplier < 0.1) {
		toast.error('Bonus win multiplier must be at least 0.1')
		return
	}
	if (form.value.bonusWinMinRoll < 1 || form.value.bonusWinMinRoll > 100) {
		toast.error('Bonus winning roll threshold must be between 1 and 100')
		return
	}
	if (!form.value.bonusMessage.trim()) {
		toast.error('Bonus start message cannot be empty')
		return
	}
	if (!form.value.bonusEndMessage.trim()) {
		toast.error('Bonus end message cannot be empty')
		return
	}

	isSaving.value = true
	try {
		await $fetch('/api/loyalty/gambling', {
			method: 'PUT',
			body: {
				minBet: Number(form.value.minBet),
				maxBet: Number(form.value.maxBet),
				winMinRoll: Number(form.value.winMinRoll),
				winMultiplier: Number(form.value.winMultiplier),
				bonusDuration: Number(form.value.bonusDuration),
				bonusWinMultiplier: Number(form.value.bonusWinMultiplier),
				bonusWinMinRoll: Number(form.value.bonusWinMinRoll),
				bonusMessage: form.value.bonusMessage,
				bonusEndMessage: form.value.bonusEndMessage,
			},
		})
		toast.success('Gambling settings saved successfully!')
		await refreshSettings()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to save settings')
	}
	finally {
		isSaving.value = false
	}
}
</script>

<template>
	<AppSettingsPage
		heading="Gambling Settings"
		subheading="Configure limits, win thresholds, and payout multipliers for the chat !gamble command."
	>
		<template #header-actions>
			<AppRefreshButton :loading="loading" @click="refreshSettings" />
		</template>
		<!-- Loading state -->
		<div v-if="loading" class="flex flex-col items-center justify-center gap-2 py-20">
			<Spinner class="size-8 text-primary" />
			<span class="text-sm text-muted-foreground">Loading gambling configuration...</span>
		</div>

		<AppSettingsGrid v-else>
			<!-- Section 1: Bet Constraints -->
			<AppSettingsSection>
				<SettingsHeading>Bet Limits & Constraints</SettingsHeading>
				<SettingsGroup>
					<SettingsGroupItem>
						<SettingsGroupContent>
							<SettingsGroupLabel>Minimum Bet</SettingsGroupLabel>
							<SettingsGroupDescription>
								The minimum points required to initiate a gamble.
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction>
							<NumberField id="minBet" v-model="form.minBet" :min="1" :default-value="10" class="w-full">
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
							<SettingsGroupLabel>Maximum Bet</SettingsGroupLabel>
							<SettingsGroupDescription>
								The maximum points a user can risk in a single bet.
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction>
							<NumberField id="maxBet" v-model="form.maxBet" :min="1" :default-value="100000" class="w-full">
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

			<!-- Section 2: Chance & Payoffs -->
			<AppSettingsSection>
				<SettingsHeading>Odds & Multipliers</SettingsHeading>
				<SettingsGroup>
					<SettingsGroupItem>
						<SettingsGroupContent>
							<SettingsGroupLabel>Net Win Gain Multiplier</SettingsGroupLabel>
							<SettingsGroupDescription>
								Multiplier for points won. A multiplier of 1.0 means a successful gamble doubles their bet (keeps the bet + wins 100% of it).
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction>
							<NumberField id="winMultiplier" v-model="form.winMultiplier" :min="0.1" :step="0.1" :default-value="1.0" class="w-full">
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
							<SettingsGroupLabel>Winning Roll Threshold</SettingsGroupLabel>
							<SettingsGroupDescription>
								Users roll a random number from 1 to 100. They win if the roll is greater than or equal to this threshold.
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction class="flex-col items-stretch gap-2">
							<div class="flex items-center justify-between text-xs font-semibold text-primary select-none">
								<span>Roll >= {{ form.winMinRoll }}</span>
								<span>{{ winChancePercent }}% Win Chance</span>
							</div>
							<div class="py-2">
								<Slider
									v-model="sliderValue"
									:min="1"
									:max="100"
									:step="1"
								/>
							</div>
						</SettingsGroupAction>
					</SettingsGroupItem>
				</SettingsGroup>
			</AppSettingsSection>

			<!-- Section 3: Gambling Bonus Event Settings -->
			<AppSettingsSection>
				<SettingsHeading>Bonus Event Configurations</SettingsHeading>
				<SettingsGroup>
					<SettingsGroupItem>
						<SettingsGroupContent>
							<SettingsGroupLabel>Bonus Duration</SettingsGroupLabel>
							<SettingsGroupDescription>
								The length of the bonus event in minutes (1 to 30 mins).
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction>
							<NumberField id="bonusDuration" v-model="form.bonusDuration" :min="1" :max="30" :default-value="5" class="w-full">
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
							<SettingsGroupLabel>Bonus Win Multiplier</SettingsGroupLabel>
							<SettingsGroupDescription>
								Multiplier for points won during the bonus event.
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction>
							<NumberField id="bonusWinMultiplier" v-model="form.bonusWinMultiplier" :min="0.1" :step="0.1" :default-value="2.0" class="w-full">
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
							<SettingsGroupLabel>Bonus Win Threshold</SettingsGroupLabel>
							<SettingsGroupDescription>
								Users roll a random number from 1 to 100. During a bonus event, they win if the roll is greater than or equal to this threshold.
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction class="flex-col items-stretch gap-2">
							<div class="flex items-center justify-between text-xs font-semibold text-primary select-none">
								<span>Roll >= {{ form.bonusWinMinRoll }}</span>
								<span>{{ bonusWinChancePercent }}% Win Chance</span>
							</div>
							<div class="py-2">
								<Slider
									v-model="bonusSliderValue"
									:min="1"
									:max="100"
									:step="1"
								/>
							</div>
						</SettingsGroupAction>
					</SettingsGroupItem>

					<SettingsGroupItem class="sm:flex-col sm:items-stretch sm:gap-3">
						<SettingsGroupContent>
							<SettingsGroupLabel>Start Announcement Message</SettingsGroupLabel>
							<SettingsGroupDescription>
								Twitch chat message sent when the bonus event is triggered. Supports $(multiplier), $(threshold), $(duration).
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction
							class="
								w-full max-w-full
								sm:w-full sm:max-w-full
								md:w-full md:max-w-full
							"
						>
							<Textarea id="bonusMessage" v-model="form.bonusMessage" placeholder="Start message..." rows="3" class="w-full" />
						</SettingsGroupAction>
					</SettingsGroupItem>

					<SettingsGroupItem class="sm:flex-col sm:items-stretch sm:gap-3">
						<SettingsGroupContent>
							<SettingsGroupLabel>End Announcement Message</SettingsGroupLabel>
							<SettingsGroupDescription>
								Twitch chat message sent when the bonus event ends. Supports $(multiplier), $(threshold), $(duration).
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction
							class="
								w-full max-w-full
								sm:w-full sm:max-w-full
								md:w-full md:max-w-full
							"
						>
							<Textarea id="bonusEndMessage" v-model="form.bonusEndMessage" placeholder="End message..." rows="3" class="w-full" />
						</SettingsGroupAction>
					</SettingsGroupItem>
				</SettingsGroup>
			</AppSettingsSection>

			<!-- Information / Odds Simulator Column -->
			<template #sidebar>
				<!-- Bonus Event Control Card -->
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<Sparkles class="size-4" />
							Bonus Event Control
						</CardTitle>
						<CardDescription>
							Manually start or end the bonus gambling period.
						</CardDescription>
					</CardHeader>
					<CardContent class="flex flex-col gap-4">
						<div class="flex items-center justify-between">
							<span class="text-xs font-medium text-muted-foreground uppercase">Status</span>
							<Badge
								v-if="timeRemaining > 0"
								variant="outline"
								class="border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-emerald-500"
							>
								Active
							</Badge>
							<Badge
								v-else
								variant="outline"
								class="border-muted-foreground/20 bg-muted px-2.5 py-0.5 text-muted-foreground"
							>
								Inactive
							</Badge>
						</div>

						<div v-if="timeRemaining > 0" class="flex flex-col items-center justify-center rounded-lg border border-border/50 bg-muted/40 py-4">
							<span class="font-mono text-3xl font-bold tracking-wider text-foreground tabular-nums">
								{{ formattedTimeRemaining }}
							</span>
							<span class="mt-1 text-xs text-muted-foreground">Time Remaining</span>
						</div>

						<Separator />

						<div class="flex flex-col gap-2">
							<Button
								v-if="timeRemaining > 0"
								variant="destructive"
								class="w-full"
								:disabled="isCancelling"
								@click="cancelBonusEvent"
							>
								<Spinner v-if="isCancelling" class="mr-2 size-4" />
								End Event Early
							</Button>
							<Button
								v-else
								variant="default"
								class="w-full"
								:disabled="isTriggering"
								@click="triggerBonusEvent"
							>
								<Spinner v-if="isTriggering" class="mr-2 size-4" />
								Trigger Bonus Event
							</Button>
						</div>
					</CardContent>
				</Card>

				<!-- Simulator Card -->
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<Dices class="size-4" />
							Gambling Simulator
						</CardTitle>
						<CardDescription>
							Observe how these settings apply to standard user bets.
						</CardDescription>
					</CardHeader>
					<CardContent class="flex flex-col gap-4">
						<div class="flex flex-col gap-1 text-xs">
							<span class="font-semibold text-muted-foreground uppercase">Bet Amount Example</span>
							<span class="font-mono text-base font-bold text-foreground">100 points</span>
						</div>

						<Separator />

						<div class="grid grid-cols-2 gap-4 text-xs">
							<div class="flex flex-col gap-1">
								<span class="font-medium text-muted-foreground">On Lose</span>
								<span class="font-mono font-bold text-red-500">-100 points</span>
							</div>
							<div class="flex flex-col gap-1">
								<span class="font-medium text-muted-foreground">On Win (Net)</span>
								<span class="font-mono font-bold text-green-500">
									+{{ Math.floor(100 * form.winMultiplier) }} points
								</span>
							</div>
						</div>

						<Separator />

						<div class="flex flex-col gap-2">
							<div class="flex items-center justify-between text-xs">
								<span class="font-medium text-muted-foreground">Win Rate</span>
								<span class="font-bold text-primary">{{ winChancePercent }}%</span>
							</div>
							<div class="flex items-center justify-between text-xs">
								<span class="font-medium text-muted-foreground">Lose Rate</span>
								<span class="font-bold text-muted-foreground">{{ 100 - winChancePercent }}%</span>
							</div>
						</div>
					</CardContent>
				</Card>

				<!-- Help Card -->
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<HelpCircle class="size-4 text-muted-foreground" />
							How It Works
						</CardTitle>
					</CardHeader>
					<CardContent class="flex flex-col gap-3 text-sm/relaxed text-muted-foreground">
						<p>
							The gambling module operates directly on the user's current points balance.
						</p>
						<p>
							Users command `!gamble &lt;amount&gt;` (or `!gamble all` / `!gamble half`) in Twitch chat. The bot validates the bet constraints and rolls a random 100-sided die.
						</p>
						<p>
							If they win, the bet is multiplied by the net gain multiplier and added back. If they lose, the entire bet is subtracted.
						</p>
					</CardContent>
				</Card>
			</template>
		</AppSettingsGrid>

		<AppFloatingSaveBar
			:show="isModified"
			:is-saving="isSaving"
			title="Unsaved Gambling Settings"
			description="You have modified gambling configurations. Save to apply changes to chat commands immediately."
			save-text="Save Settings"
			saving-text="Saving Settings..."
			discard-text="Discard Changes"
			@save="saveSettings"
			@discard="discardChanges"
		/>
	</AppSettingsPage>
</template>
