<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = defineProps<{
	class?: string
}>()
</script>

<template>
	<label :class="cn('text-sm leading-none font-semibold tracking-tight text-foreground', props.class)">
		<slot />
	</label>
</template>
