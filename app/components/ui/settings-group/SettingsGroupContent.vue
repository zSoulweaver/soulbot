<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = defineProps<{
	class?: string
}>()
</script>

<template>
	<div :class="cn('flex min-w-0 flex-1 flex-col gap-0.5', props.class)">
		<slot />
	</div>
</template>
