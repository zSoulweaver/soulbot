<script setup lang="ts">
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'

type BotStatusResponse = Awaited<ReturnType<typeof import('~~/server/api/bot/status.get').default>>

const { loggedIn, user } = useUserSession()
const { public: { botName } } = useRuntimeConfig()

const { data: status } = useFetch<BotStatusResponse>('/api/bot/status', {
	immediate: loggedIn.value,
})

const isCasterOrBot = computed(() => {
	if (!user.value || !status.value)
		return false
	return user.value.role === 'caster' || user.value.role === 'admin' || (!!status.value.bot?.userId && user.value.id === status.value.bot?.userId)
})

const showModeratorAlert = computed(() => {
	return isCasterOrBot.value && status.value?.isBotRunning && status.value?.isBotModerator === false
})

const isRechecking = ref(false)

async function recheckModStatus() {
	if (isRechecking.value)
		return
	isRechecking.value = true
	try {
		const res = await $fetch<BotStatusResponse>('/api/bot/status?force=true')
		if (status.value) {
			status.value = {
				...status.value,
				isBotModerator: res.isBotModerator,
			}
		}

		if (res.isBotModerator) {
			toast.success(`${botName} moderator permissions confirmed!`)
		}
		else {
			toast.error(`${botName} is still not a moderator. Make sure you typed /mod ${res.bot?.userName} in chat.`)
		}
	}
	catch {
		toast.error('Failed to re-check moderator status.')
	}
	finally {
		isRechecking.value = false
	}
}
</script>

<template>
	<Alert
		v-if="showModeratorAlert"
		variant="warning"
		class="flex animate-in flex-wrap items-center justify-between gap-4 duration-300 fade-in slide-in-from-top"
	>
		<div class="flex flex-1 flex-col gap-0.5">
			<AlertTitle>
				Bot Moderator Permissions Missing
			</AlertTitle>
			<AlertDescription>
				{{ botName }} (<code>{{ status?.bot?.userName }}</code>) is not a moderator in your Twitch channel. Please type <code>/mod {{ status?.bot?.userName }}</code> in your Twitch chat to grant moderator status so that command execution limits and automated moderation features work properly.
			</AlertDescription>
		</div>
		<Button
			variant="outline"
			size="sm"
			:disabled="isRechecking"
			class="
				shrink-0 border-amber-500/20 bg-transparent font-semibold text-amber-800
				hover:bg-amber-500/10 hover:text-amber-900
				dark:text-amber-300
				dark:hover:bg-amber-500/10 dark:hover:text-amber-200
			"
			@click="recheckModStatus"
		>
			{{ isRechecking ? 'Checking...' : 'Re-check Status' }}
		</Button>
	</Alert>
</template>
