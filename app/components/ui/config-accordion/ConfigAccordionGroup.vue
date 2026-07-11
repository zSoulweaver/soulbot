<script setup lang="ts">
defineProps<{
	constrained?: boolean
}>()
</script>

<template>
	<div
		class="flex w-full flex-col gap-4"
		:class="{ 'max-w-3xl': constrained }"
	>
		<slot />
	</div>
</template>
