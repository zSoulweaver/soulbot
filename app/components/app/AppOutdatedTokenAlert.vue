<script setup lang="ts">
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

const showOutdatedAlert = computed(() => isCasterOrBot.value && (status.value?.isStreamerTokenOutdated || status.value?.isBotTokenOutdated))

const alertDescription = computed(() => {
	if (status.value?.isStreamerTokenOutdated && status.value?.isBotTokenOutdated) {
		return `${botName} has updated features that require new permissions for both your streamer and bot accounts. Please re-authenticate them now.`
	}
	if (status.value?.isStreamerTokenOutdated) {
		return `${botName} has updated features that require new permissions for your streamer account. Please re-authenticate now.`
	}
	if (status.value?.isBotTokenOutdated) {
		return `${botName} has updated features that require new permissions for your bot account. Please re-authenticate now.`
	}
	return ''
})
</script>

<template>
	<Alert
		v-if="showOutdatedAlert"
		variant="destructive"
		class="flex animate-in flex-wrap items-center justify-between gap-4 duration-300 fade-in slide-in-from-top"
	>
		<div class="flex flex-1 flex-col gap-0.5">
			<AlertTitle>
				Twitch Permissions Out of Date
			</AlertTitle>
			<AlertDescription>
				{{ alertDescription }}
			</AlertDescription>
		</div>
		<Button
			variant="destructive"
			size="sm"
			as="a"
			href="/setup"
			class="shrink-0 font-semibold"
		>
			Upgrade Permissions
		</Button>
	</Alert>
</template>
