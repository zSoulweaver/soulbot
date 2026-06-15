<script setup lang="ts">
import { Coins, Dices, HelpCircle, RefreshCcw, Sliders } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { NumberField, NumberFieldContent, NumberFieldDecrement, NumberFieldIncrement, NumberFieldInput } from '~/components/ui/number-field'
import { Slider } from '~/components/ui/slider'

type GamblingSettings = Awaited<ReturnType<typeof import('~~/server/api/loyalty/gambling.get').default>>

const { data: settingsData, refresh: refreshSettings, pending: loading } = useFetch<GamblingSettings>('/api/loyalty/gambling')

const form = ref<GamblingSettings>({
	minBet: 10,
	maxBet: 100000,
	winMinRoll: 50,
	winMultiplier: 1.0,
})

const isSaving = ref(false)

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

const winChancePercent = computed(() => {
	return Math.max(0, Math.min(100, 101 - form.value.winMinRoll))
})

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

	isSaving.value = true
	try {
		await $fetch('/api/loyalty/gambling', {
			method: 'PUT',
			body: {
				minBet: Number(form.value.minBet),
				maxBet: Number(form.value.maxBet),
				winMinRoll: Number(form.value.winMinRoll),
				winMultiplier: Number(form.value.winMultiplier),
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
	<AppPageContainer>
		<AppPageHeader
			heading="Gambling Settings"
			subheading="Configure limits, win thresholds, and payout multipliers for the chat !gamble command."
		>
			<Button variant="ghost" :disabled="loading" @click="refreshSettings">
				<RefreshCcw :class="{ 'animate-spin': loading }" />
			</Button>
		</AppPageHeader>

		<!-- Loading state -->
		<div v-if="loading" class="flex flex-col items-center justify-center gap-2 py-20">
			<Spinner class="size-8 text-primary" />
			<span class="text-sm text-muted-foreground">Loading gambling configuration...</span>
		</div>

		<div
			v-else
			class="
				grid grid-cols-1 gap-6
				lg:grid-cols-3
			"
		>
			<!-- Config Editor Column -->
			<div class="lg:col-span-2">
				<div class="flex flex-col gap-8">
					<!-- Section 1: Bet Constraints -->
					<div class="flex flex-col gap-4">
						<h3 class="flex items-center gap-2 text-lg font-semibold">
							<Coins class="size-5 text-muted-foreground" />
							Bet Limits & Constraints
						</h3>
						<FieldGroup
							class="
								grid grid-cols-1 gap-4
								sm:grid-cols-2
							"
						>
							<Field>
								<FieldLabel for="minBet">
									Minimum Bet
								</FieldLabel>
								<NumberField id="minBet" v-model="form.minBet" :min="1" :default-value="10">
									<NumberFieldContent>
										<NumberFieldDecrement />
										<NumberFieldInput />
										<NumberFieldIncrement />
									</NumberFieldContent>
								</NumberField>
								<FieldDescription>
									The minimum points required to initiate a gamble.
								</FieldDescription>
							</Field>

							<Field>
								<FieldLabel for="maxBet">
									Maximum Bet
								</FieldLabel>
								<NumberField id="maxBet" v-model="form.maxBet" :min="1" :default-value="100000">
									<NumberFieldContent>
										<NumberFieldDecrement />
										<NumberFieldInput />
										<NumberFieldIncrement />
									</NumberFieldContent>
								</NumberField>
								<FieldDescription>
									The maximum points a user can risk in a single bet.
								</FieldDescription>
							</Field>
						</FieldGroup>
					</div>

					<Separator />

					<!-- Section 2: Chance & Payoffs -->
					<div class="flex flex-col gap-4">
						<h3 class="flex items-center gap-2 text-lg font-semibold">
							<Sliders class="size-5 text-muted-foreground" />
							Odds & Multipliers
						</h3>
						<FieldGroup class="flex flex-col gap-6">
							<Field>
								<FieldLabel for="winMultiplier">
									Net Win Gain Multiplier
								</FieldLabel>
								<NumberField id="winMultiplier" v-model="form.winMultiplier" :min="0.1" :step="0.1" :default-value="1.0">
									<NumberFieldContent>
										<NumberFieldDecrement />
										<NumberFieldInput />
										<NumberFieldIncrement />
									</NumberFieldContent>
								</NumberField>
								<FieldDescription>
									Multiplier for points won. A multiplier of 1.0 means a successful gamble doubles their bet (keeps the bet + wins 100% of it).
								</FieldDescription>
							</Field>

							<Field>
								<div class="flex items-center justify-between">
									<FieldLabel>
										Winning Roll Threshold (Roll >= {{ form.winMinRoll }})
									</FieldLabel>
									<span class="text-sm font-semibold text-primary">
										{{ winChancePercent }}% Win Chance
									</span>
								</div>
								<div class="py-4">
									<Slider
										v-model="sliderValue"
										:min="1"
										:max="100"
										:step="1"
									/>
								</div>
								<FieldDescription>
									Users roll a random number from 1 to 100. They win if the roll is greater than or equal to this threshold.
								</FieldDescription>
							</Field>
						</FieldGroup>
					</div>
				</div>
			</div>

			<!-- Information / Odds Simulator Column -->
			<div class="flex flex-col gap-6">
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
			</div>
		</div>

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
	</AppPageContainer>
</template>
