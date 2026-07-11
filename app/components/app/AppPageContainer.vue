<script setup lang="ts">
import { cn } from '~/lib/utils'

defineProps<{
	class?: any
}>()
</script>

<template>
	<div :class="cn('flex flex-1 flex-col gap-6 p-8', $props.class)">
		<slot />
	</div>
</template>
