<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core'

interface BotStatus {
	bot: { displayName: string } | null
	streamer: { displayName: string } | null
	isBotRunning: boolean
}

const { data: status, refresh } = useFetch<BotStatus>('/api/bot/status')

// Refresh status every 30 seconds
useIntervalFn(() => {
	refresh()
}, 30000)

const isConnected = computed(() => status.value?.isBotRunning ?? false)
</script>

<template>
	<TooltipProvider>
		<Tooltip>
			<TooltipTrigger as-child>
				<div class="flex cursor-default items-center gap-2">
					<div class="relative flex size-2">
						<span
							v-if="isConnected"
							class="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75"
						/>
						<span
							class="relative inline-flex size-2 rounded-full"
							:class="isConnected ? 'bg-green-500' : 'bg-destructive'"
						/>
					</div>
					<span class="text-xs font-medium tracking-wider text-muted-foreground uppercase">
						Bot {{ isConnected ? 'Online' : 'Offline' }}
					</span>
				</div>
			</TooltipTrigger>
			<TooltipContent>
				<div class="flex flex-col gap-1 text-xs">
					<p
						v-if="isConnected" class="
							font-semibold text-green-500
							dark:text-green-700
						"
					>
						Connected
					</p>
					<p v-else class="font-semibold text-destructive">
						Disconnected
					</p>
					<p v-if="status?.bot">
						Logged in as: {{ status.bot.displayName }}
					</p>
				</div>
			</TooltipContent>
		</Tooltip>
	</TooltipProvider>
</template>
