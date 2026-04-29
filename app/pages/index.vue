<script setup lang="ts">
const { data: status } = await useFetch('/api/auth/status')

onMounted(() => {
	if (!status.value?.bot || !status.value?.streamer) {
		navigateTo('/setup')
	}
})
</script>

<template>
	<div class="p-8">
		<h1 class="text-3xl font-bold">
			Dashboard
		</h1>
		<p class="mt-2 text-muted-foreground">
			Bot is active and connected.
		</p>

		<div
			class="
     mt-8 grid gap-4
     md:grid-cols-2
   "
		>
			<div class="rounded-lg border bg-card p-6">
				<h2 class="mb-4 text-xl font-semibold">
					Bot Status
				</h2>
				<div class="flex items-center gap-2">
					<div class="size-3 rounded-full bg-green-500" />
					<span>Connected</span>
				</div>
			</div>
		</div>
	</div>
</template>
