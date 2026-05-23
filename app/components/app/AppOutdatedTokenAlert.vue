<script setup lang="ts">
type BotStatusResponse = Awaited<ReturnType<typeof import('~~/server/api/bot/status.get').default>>

const { user } = useUserSession()
const isCaster = computed(() => user.value?.role === 'caster')

// Fetch status only if the user is a caster
const { data: status } = await useFetch<BotStatusResponse>('/api/bot/status', {
	immediate: isCaster.value,
})

const showOutdatedAlert = computed(() => isCaster.value && status.value?.isStreamerTokenOutdated)
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
				Soulbot has new watch-time payout capabilities that require additional broadcaster permissions. Please re-authenticate now.
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
