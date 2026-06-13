<script setup lang="ts">
defineProps<{
	heading: string
	subheading: string
}>()
</script>

<template>
	<div class="flex items-start justify-between gap-6">
		<div>
			<h1 class="mb-1.5 text-3xl font-bold tracking-tight">
				{{ heading }}
			</h1>
			<p class="text-sm text-muted-foreground">
				{{ subheading }}
			</p>
		</div>
		<div class="flex gap-2">
			<slot />
		</div>
	</div>
</template>
