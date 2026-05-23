<script setup lang="ts">
import { AlertCircle, Clock, Coins, HelpCircle, Save } from 'lucide-vue-next'
import { ref } from 'vue'
import { toast } from 'vue-sonner'

interface PointsSettings {
	interval: number
	amount: number
}

// Fetch active settings
const { data: settingsData, refresh: refreshSettings, pending: loading } = await useFetch<PointsSettings>('/api/points/settings')

const intervalVal = ref(5)
const amountVal = ref(5)
const isSaving = ref(false)

// Synchronize values once loaded
watch(settingsData, (newData) => {
	if (newData) {
		intervalVal.value = newData.interval
		amountVal.value = newData.amount
	}
}, { immediate: true })

async function saveSettings() {
	if (intervalVal.value < 1) {
		toast.error('Payout interval must be at least 1 minute')
		return
	}
	if (amountVal.value < 0) {
		toast.error('Payout amount cannot be negative')
		return
	}

	isSaving.value = true
	try {
		await $fetch('/api/points/settings', {
			method: 'PUT',
			body: {
				interval: intervalVal.value,
				amount: amountVal.value,
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
</script>

<template>
	<div class="flex flex-col gap-6">
		<div class="flex items-center justify-between">
			<div class="flex flex-col gap-1">
				<h1 class="font-sans text-3xl font-bold tracking-tight">
					Points Settings
				</h1>
				<p class="text-sm text-muted-foreground">
					Configure payout frequency and rewarding metrics for active chat users.
				</p>
			</div>
			<Button variant="outline" size="sm" :disabled="loading" @click="refreshSettings">
				Refresh
			</Button>
		</div>

		<div
			class="
				grid grid-cols-1 gap-6
				lg:grid-cols-3
			"
		>
			<!-- Settings Editor Panel -->
			<Card
				class="
					border-border bg-card/50 backdrop-blur-sm
					lg:col-span-2
				"
			>
				<CardHeader>
					<CardTitle>Payout Metrics</CardTitle>
					<CardDescription>Adjust the frequency and points payout allocations for Twitch chatters.</CardDescription>
				</CardHeader>
				<CardContent class="flex flex-col gap-6">
					<div v-if="loading" class="py-10 text-center text-sm text-muted-foreground">
						Loading active configurations...
					</div>
					<div v-else class="flex flex-col gap-6">
						<FieldGroup>
							<!-- Payout Interval -->
							<Field>
								<FieldLabel for="payoutInterval" class="flex items-center gap-1.5 text-sm font-semibold">
									<Clock class="text-primary" />
									Payout Frequency (Minutes)
								</FieldLabel>
								<Input
									id="payoutInterval"
									v-model="intervalVal"
									type="number"
									min="1"
									class="
										border-border font-medium
										focus-visible:ring-primary
									"
								/>
								<FieldDescription>
									The dynamic cycle time for points distribution. Chatters must send a message within this window to count as active.
								</FieldDescription>
							</Field>

							<!-- Payout Amount -->
							<Field>
								<FieldLabel for="payoutAmount" class="flex items-center gap-1.5 text-sm font-semibold">
									<Coins class="text-amber-500" />
									Award Amount (Points)
								</FieldLabel>
								<Input
									id="payoutAmount"
									v-model="amountVal"
									type="number"
									min="0"
									class="
										border-border font-medium
										focus-visible:ring-primary
									"
								/>
								<FieldDescription>
									The points amount added to each active chatter's account upon completion of a frequency cycle.
								</FieldDescription>
							</Field>
						</FieldGroup>
					</div>
				</CardContent>
				<CardFooter class="justify-end border-t border-border bg-muted/20 pt-4">
					<Button :disabled="isSaving || loading" @click="saveSettings">
						<Save data-icon="inline-start" />
						{{ isSaving ? 'Saving...' : 'Save Settings' }}
					</Button>
				</CardFooter>
			</Card>

			<!-- Help / Mechanics Panel -->
			<div class="flex flex-col gap-6">
				<Card class="border-border bg-card/30">
					<CardHeader class="pb-3">
						<CardTitle class="flex items-center gap-2 text-sm font-bold">
							<HelpCircle class="size-4 text-muted-foreground" />
							How Payouts Work
						</CardTitle>
					</CardHeader>
					<CardContent class="flex flex-col gap-3 text-xs/relaxed text-muted-foreground">
						<p>
							The bot runs a background watch-time payout engine in the thread pool that checks for chat active metrics.
						</p>
						<p>
							Any chatter who posts a message is categorized in our in-memory active chatter registry.
						</p>
						<p>
							When a payout cycle fires, the engine awards the configured point amount in a **single, highly-performant SQLite update batch query** to prevent write conflicts or lag spikes.
						</p>
						<div class="mt-2 flex gap-2 rounded-sm border border-yellow-500/20 bg-yellow-500/10 p-2.5 text-yellow-400">
							<AlertCircle class="mt-0.5 size-4 shrink-0" />
							<span>Updates made on this page take effect immediately starting from the next payout check.</span>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	</div>
</template>
