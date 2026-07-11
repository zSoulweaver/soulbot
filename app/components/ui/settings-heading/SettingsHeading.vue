<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '~/lib/utils'

const props = defineProps<{
	class?: HTMLAttributes['class']
}>()
</script>

<template>
	<h3
		:class="cn(`
			border-b border-border/30 pb-3 font-serif text-3xl font-normal text-foreground
			md:text-4xl
		`, props.class)"
	>
		<slot />
	</h3>
</template>
