<script setup lang="ts">
import { HelpCircle, Shield, Sparkles } from '@lucide/vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import TemplateEditor from '~/components/templates/TemplateEditor.vue'
import { NumberField, NumberFieldContent, NumberFieldDecrement, NumberFieldIncrement, NumberFieldInput } from '~/components/ui/number-field'
import { Slider } from '~/components/ui/slider'
import { Switch } from '~/components/ui/switch'

useRequireUserRole(['caster'])

type VaultSettings = Awaited<ReturnType<typeof import('~~/server/api/loyalty/vault.get').default>>

const {
	form,
	isModified,
	isSaving,
	loading,
	refresh: refreshSettings,
	discard: discardChanges,
	save: saveSettings,
} = useSettingsForm<VaultSettings>('/api/loyalty/vault', {
	ignoreKeys: ['endTime', 'vaultState'],
	successMessage: 'Vault settings saved successfully!',
})

useHead({
	title: 'Vault Game Settings',
})

const isTriggering = ref(false)
const isCancelling = ref(false)
const timeRemaining = ref(0)
let timerInterval: NodeJS.Timeout | null = null

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

function startCountdown() {
	if (timerInterval)
		clearInterval(timerInterval)

	const update = () => {
		const end = form.value.endTime || 0
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

watch(() => form.value.endTime, (newVal) => {
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

async function triggerVaultRaid() {
	isTriggering.value = true
	try {
		await $fetch('/api/loyalty/vault/trigger', { method: 'POST' })
		toast.success('Vault Raid started successfully!')
		await refreshSettings()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to trigger Vault Raid')
	}
	finally {
		isTriggering.value = false
	}
}

async function cancelVaultRaid() {
	isCancelling.value = true
	try {
		await $fetch('/api/loyalty/vault/cancel', { method: 'POST' })
		toast.success('Vault Raid cancelled and bets refunded.')
		await refreshSettings()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to cancel Vault Raid')
	}
	finally {
		isCancelling.value = false
	}
}
</script>

<template>
	<AppSettingsPage
		heading="Vault Game Settings"
		subheading="Configure limits, win thresholds, payout multipliers, and announcements for the chat !vault communal raid game."
	>
		<template #header-actions>
			<AppRefreshButton :loading="loading" @click="refreshSettings" />
		</template>

		<!-- Loading state -->
		<div v-if="loading" class="flex flex-col items-center justify-center gap-2 py-20">
			<Spinner class="size-8 text-primary" />
			<span class="text-sm text-muted-foreground">Loading vault configuration...</span>
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
								The minimum points required for a viewer to enter the Vault Raid.
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
								The maximum points a single viewer can risk on a Vault Raid.
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

			<!-- Section 2: Odds & Payoffs -->
			<AppSettingsSection>
				<SettingsHeading>Odds & Multipliers</SettingsHeading>
				<SettingsGroup>
					<SettingsGroupItem>
						<SettingsGroupContent>
							<SettingsGroupLabel>Net Win Gain Multiplier</SettingsGroupLabel>
							<SettingsGroupDescription>
								Multiplier for points won if the raid succeeds. A multiplier of 2.0 means winning raiders keep their bet and gain +200% of their bet in profit.
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction>
							<NumberField id="winMultiplier" v-model="form.winMultiplier" :min="0.1" :step="0.1" :default-value="2.0" class="w-full">
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
								A single communal die is rolled from 1 to 100. The raid succeeds if the roll is greater than or equal to this threshold.
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

			<!-- Section 3: Timing & Warning -->
			<AppSettingsSection>
				<SettingsHeading>Timing & Warning Configurations</SettingsHeading>
				<SettingsGroup>
					<SettingsGroupItem>
						<SettingsGroupContent>
							<SettingsGroupLabel>Raid Duration (Seconds)</SettingsGroupLabel>
							<SettingsGroupDescription>
								The betting window length before the vault showdown occurs (15 to 300 seconds).
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction>
							<NumberField id="duration" v-model="form.duration" :min="15" :max="300" :default-value="90" class="w-full">
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
							<SettingsGroupLabel>15-Second Warning Alert</SettingsGroupLabel>
							<SettingsGroupDescription>
								Send a chat announcement when 15 seconds remain in the betting window.
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction>
							<Switch id="warningEnabled" v-model="form.warningEnabled" />
						</SettingsGroupAction>
					</SettingsGroupItem>
				</SettingsGroup>
			</AppSettingsSection>

			<!-- Section 4: Chat Announcements -->
			<AppSettingsSection>
				<SettingsHeading>Customizable Chat Announcements</SettingsHeading>
				<SettingsGroup>
					<SettingsGroupItem class="sm:flex-col sm:items-stretch sm:gap-3">
						<SettingsGroupContent>
							<SettingsGroupLabel>Start Announcement Message</SettingsGroupLabel>
							<SettingsGroupDescription>
								Sent when the raid is triggered.
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction
							class="
								w-full max-w-full
								sm:w-full sm:max-w-full
								md:w-full md:max-w-full
							"
						>
							<TemplateEditor
								id="startMessage"
								v-model="form.startMessage"
								scope="vault.start"
								placeholder="Start message..."
							/>
						</SettingsGroupAction>
					</SettingsGroupItem>

					<SettingsGroupItem class="sm:flex-col sm:items-stretch sm:gap-3">
						<SettingsGroupContent>
							<SettingsGroupLabel>15-Second Warning Message</SettingsGroupLabel>
							<SettingsGroupDescription>
								Sent when 15 seconds remain.
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction
							class="
								w-full max-w-full
								sm:w-full sm:max-w-full
								md:w-full md:max-w-full
							"
						>
							<TemplateEditor
								id="warningMessage"
								v-model="form.warningMessage"
								scope="vault.warning"
								placeholder="Warning message..."
							/>
						</SettingsGroupAction>
					</SettingsGroupItem>

					<SettingsGroupItem class="sm:flex-col sm:items-stretch sm:gap-3">
						<SettingsGroupContent>
							<SettingsGroupLabel>Win Announcement Message</SettingsGroupLabel>
							<SettingsGroupDescription>
								Sent when the raid succeeds.
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction
							class="
								w-full max-w-full
								sm:w-full sm:max-w-full
								md:w-full md:max-w-full
							"
						>
							<TemplateEditor
								id="endWinMessage"
								v-model="form.endWinMessage"
								scope="vault.win"
								placeholder="Win message..."
							/>
						</SettingsGroupAction>
					</SettingsGroupItem>

					<SettingsGroupItem class="sm:flex-col sm:items-stretch sm:gap-3">
						<SettingsGroupContent>
							<SettingsGroupLabel>Lose Announcement Message</SettingsGroupLabel>
							<SettingsGroupDescription>
								Sent when the raid fails.
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction
							class="
								w-full max-w-full
								sm:w-full sm:max-w-full
								md:w-full md:max-w-full
							"
						>
							<TemplateEditor
								id="endLoseMessage"
								v-model="form.endLoseMessage"
								scope="vault.lose"
								placeholder="Lose message..."
							/>
						</SettingsGroupAction>
					</SettingsGroupItem>
				</SettingsGroup>
			</AppSettingsSection>

			<!-- Information / Odds Simulator Column -->
			<template #sidebar>
				<!-- Vault Event Control Card -->
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<Sparkles class="size-4" />
							Vault Event Control
						</CardTitle>
						<CardDescription>
							Manually start or cancel the communal Vault Raid.
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
								@click="cancelVaultRaid"
							>
								<Spinner v-if="isCancelling" class="mr-2 size-4" />
								Cancel Raid & Refund
							</Button>
							<Button
								v-else
								variant="default"
								class="w-full"
								:disabled="isTriggering"
								@click="triggerVaultRaid"
							>
								<Spinner v-if="isTriggering" class="mr-2 size-4" />
								Trigger Vault Raid
							</Button>
						</div>
					</CardContent>
				</Card>

				<!-- Simulator Card -->
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<Shield class="size-4" />
							Raid Simulator
						</CardTitle>
						<CardDescription>
							Observe how these settings apply to raider bets.
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
							The Vault Game is a communal raid mini-game for Twitch chat.
						</p>
						<p>
							When active, viewers enter with `!vault &lt;amount&gt;` (or `!vault all` / `!vault half`). They can change their bet or opt out with `!vault 0` before time expires.
						</p>
						<p>
							When the countdown completes, a single roll resolves the raid: all entered raiders win or lose together!
						</p>
					</CardContent>
				</Card>
			</template>
		</AppSettingsGrid>

		<AppFloatingSaveBar
			:show="isModified"
			:is-saving="isSaving"
			title="Unsaved Vault Settings"
			description="You have modified vault configurations. Save to apply changes to chat commands immediately."
			save-text="Save Settings"
			saving-text="Saving Settings..."
			discard-text="Discard Changes"
			@save="saveSettings"
			@discard="discardChanges"
		/>
	</AppSettingsPage>
</template>
