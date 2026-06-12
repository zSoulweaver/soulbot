<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = defineProps<{
	class?: string
}>()
</script>

<template>
	<div :class="cn('min-w-0 flex-1 space-y-0.5', props.class)">
		<slot />
	</div>
</template>
