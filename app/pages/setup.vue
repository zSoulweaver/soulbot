<script setup lang="ts">
import { CheckCircle2, Circle, Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

const { data: status, refresh } = await useFetch('/api/auth/status')

const isComplete = computed(() => status.value?.bot && status.value?.streamer)
const isLoading = ref(false)

async function handleBotAction() {
	if (status.value?.isBotRunning) {
		navigateTo('/')
		return
	}

	isLoading.value = true
	try {
		await $fetch('/api/bot/start', { method: 'POST' })
		toast.success('Bot started successfully!')
		await refresh()
		// Delay navigation slightly so user sees the success state/toast
		setTimeout(() => {
			navigateTo('/')
		}, 1500)
	}
	catch (err: any) {
		console.error('Failed to start bot', err)
		const errorMessage = err.data?.statusMessage || 'Failed to start bot. Please try again.'
		toast.error(errorMessage)
		isLoading.value = false
	}
}
</script>

<template>
	<div class="flex min-h-screen items-center justify-center p-4">
		<Card class="w-full max-w-md">
			<CardHeader>
				<CardTitle>Bot Onboarding</CardTitle>
				<CardDescription>
					Please authenticate both accounts to get started.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-6">
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
						v-if="!status?.streamer"
						variant="outline"
						size="sm"
						as="a"
						href="/api/auth/twitch/login?type=streamer"
					>
						Connect
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
						v-if="!status?.bot"
						variant="outline"
						size="sm"
						as="a"
						href="/api/auth/twitch/login?type=bot"
					>
						Connect
					</Button>
				</div>

				<Alert
					v-if="isComplete" variant="default" :class="status?.isBotRunning ? `
       border-blue-200 bg-blue-50
     ` : `border-green-200 bg-green-50`"
				>
					<CheckCircle2
						class="size-4" :class="status?.isBotRunning ? `text-blue-600` : `
        text-green-600
      `"
					/>
					<AlertTitle
						:class="status?.isBotRunning ? 'text-blue-800' : `text-green-800`"
					>
						{{ status?.isBotRunning ? 'Bot is running' : 'Ready to go!' }}
					</AlertTitle>
					<AlertDescription
						:class="status?.isBotRunning ? 'text-blue-700' : `text-green-700`"
					>
						{{ status?.isBotRunning ? 'Your bot is online and active.' : 'Both accounts are authenticated. You can now start the bot.' }}
					</AlertDescription>
				</Alert>
			</CardContent>
			<CardFooter>
				<Button
					class="w-full"
					:disabled="!isComplete || isLoading"
					@click="handleBotAction"
				>
					<Loader2 v-if="isLoading" class="mr-2 size-4 animate-spin" />
					<template v-if="status?.isBotRunning">
						Open Dashboard
					</template>
					<template v-else-if="isLoading">
						Starting Bot...
					</template>
					<template v-else>
						{{ isComplete ? 'Initialize Bot' : 'Complete Setup' }}
					</template>
				</Button>
			</CardFooter>
		</Card>
	</div>
</template>
