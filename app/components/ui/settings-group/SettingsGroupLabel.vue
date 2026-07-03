<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
	class?: HTMLAttributes['class']
}>()
</script>

<template>
	<label :class="cn('text-sm leading-none font-semibold tracking-tight text-foreground', props.class)">
		<slot />
	</label>
</template>
