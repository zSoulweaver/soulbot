<script setup lang="ts">
import { CheckCircle2, Circle } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Spinner } from '~/components/ui/spinner'

definePageMeta({
	layout: 'blank',
})

const { data: status, refresh } = useFetch('/api/bot/status')

const isComplete = computed(() => status.value?.bot && status.value?.streamer)
const isLoading = ref(false)
const isRestarting = ref(false)
const unknownStatus = ref(false)

async function handleBotAction() {
	if (status.value?.isBotRunning) {
		navigateTo('/')
		return
	}

	isLoading.value = true
	try {
		await $fetch('/api/bot/start', { method: 'POST' })
		toast.success('Chat connection established successfully!')
		await refresh()
		// Delay navigation slightly so user sees the success state/toast
		navigateTo('/')
	}
	catch (err: any) {
		console.error('Failed to connect to chat', err)
		const errorMessage = err.data?.statusMessage || 'Failed to connect to chat. Please try again.'
		toast.error(errorMessage)
		isLoading.value = false
	}
}

async function pollBotStatus(maxAttempts = 10, intervalMs = 500) {
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		await new Promise(resolve => setTimeout(resolve, intervalMs))
		await refresh()
		if (status.value?.isBotRunning) {
			return true
		}
	}
	return false
}

async function handleRestart() {
	isRestarting.value = true
	unknownStatus.value = false
	try {
		await $fetch('/api/bot/restart', { method: 'POST' })
		toast.success('Reconnection initiated, waiting to establish chat connection...')

		// Poll status to verify it's successfully re-established connection
		const backOnline = await pollBotStatus()
		if (backOnline) {
			toast.success('Connection re-established successfully!')
		}
		else {
			toast.warning('Reconnection initiated, but chat response is taking longer than expected.')
			unknownStatus.value = true
		}
	}
	catch (err: any) {
		console.error('Failed to reconnect to chat', err)
		const errorMessage = err.data?.statusMessage || 'Failed to reconnect to chat. Please try again.'
		toast.error(errorMessage)
	}
	finally {
		isRestarting.value = false
	}
}

const alertVariant = computed(() => {
	if (unknownStatus.value)
		return 'warning'
	if (status.value?.isBotRunning)
		return 'info'
	if (isRestarting.value)
		return 'info'
	return 'success'
})

const alertTitle = computed(() => {
	if (unknownStatus.value)
		return 'Connection status unknown'
	if (status.value?.isBotRunning)
		return 'Connected to Twitch Chat'
	if (isRestarting.value)
		return 'Reconnecting to Twitch Chat...'
	return 'Ready to Connect!'
})

const alertDescription = computed(() => {
	if (unknownStatus.value) {
		return 'Reconnection initiated, the connection will likely establish soon but it\'s taking longer than expected. Check the debug logs for further details.'
	}
	if (status.value?.isBotRunning)
		return 'Your bot is successfully connected and listening to Twitch chat.'
	if (isRestarting.value)
		return 'Please wait while the bot establishes a secure connection to your Twitch channel.'
	return 'Both accounts are authenticated. You can now connect the bot to chat.'
})
</script>

<template>
	<div class="flex min-h-screen items-center justify-center p-4">
		<Card class="w-full max-w-md">
			<CardHeader>
				<CardTitle>Twitch Connection Onboarding</CardTitle>
				<CardDescription>
					Please authenticate both accounts to connect your bot to chat.
				</CardDescription>
			</CardHeader>
			<CardContent class="flex flex-col gap-6">
				<!-- Streamer Account -->
				<div class="flex items-center justify-between rounded-lg border p-4">
					<div class="flex items-center gap-3">
						<CheckCircle2 v-if="status?.streamer" class="text-green-500" />
						<Circle v-else class="text-muted-foreground" />
						<div>
							<p class="font-medium">
								Streamer Account
							</p>
							<p v-if="status?.streamer" class="text-sm text-muted-foreground">
								Connected as {{ status.streamer.displayName || status.streamer.userName }}
							</p>
							<p v-else class="text-sm text-muted-foreground">
								Not connected
							</p>
						</div>
					</div>
					<Button
						variant="outline"
						size="sm"
						as="a"
						href="/api/bot/auth/twitch?type=streamer"
					>
						{{ status?.streamer ? 'Reconnect' : 'Connect' }}
					</Button>
				</div>

				<!-- Bot Account -->
				<div class="flex items-center justify-between rounded-lg border p-4">
					<div class="flex items-center gap-3">
						<CheckCircle2 v-if="status?.bot" class="text-green-500" />
						<Circle v-else class="text-muted-foreground" />
						<div>
							<p class="font-medium">
								Bot Account
							</p>
							<p v-if="status?.bot" class="text-sm text-muted-foreground">
								Connected as {{ status.bot.displayName || status.bot.userName }}
							</p>
							<p v-else class="text-sm text-muted-foreground">
								Not connected
							</p>
						</div>
					</div>
					<Button
						variant="outline"
						size="sm"
						as="a"
						href="/api/bot/auth/twitch?type=bot"
					>
						{{ status?.bot ? 'Reconnect' : 'Connect' }}
					</Button>
				</div>

				<Alert
					v-if="isComplete"
					:variant="alertVariant"
				>
					<AlertTitle>
						{{ alertTitle }}
					</AlertTitle>
					<AlertDescription>
						{{ alertDescription }}
					</AlertDescription>
				</Alert>
			</CardContent>
			<CardFooter class="flex flex-col gap-3">
				<div v-if="status?.isBotRunning || isRestarting || unknownStatus" class="flex w-full gap-3">
					<Button
						v-if="!unknownStatus"
						variant="destructive"
						class="flex-1"
						:disabled="isRestarting || isLoading"
						@click="handleRestart"
					>
						<Spinner v-if="isRestarting" data-icon="inline-start" />
						Reconnect Bot
					</Button>
					<Button
						class="flex-1"
						:disabled="isRestarting || isLoading"
						@click="handleBotAction"
					>
						Open Dashboard
					</Button>
				</div>
				<Button
					v-else
					class="w-full"
					:disabled="!isComplete || isLoading"
					@click="handleBotAction"
				>
					<Spinner v-if="isLoading" data-icon="inline-start" />
					<template v-if="isLoading">
						Connecting to Chat...
					</template>
					<template v-else>
						{{ isComplete ? 'Connect Bot to Chat' : 'Complete Setup' }}
					</template>
				</Button>
			</CardFooter>
		</Card>
	</div>
</template>
