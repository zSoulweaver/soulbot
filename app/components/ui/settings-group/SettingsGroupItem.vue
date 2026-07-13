<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
	class?: HTMLAttributes['class']
}>()
</script>

<template>
	<div
		:class="cn(`
			flex flex-row items-center justify-between gap-4 border-b border-border/20 px-0 py-4
			last:border-b-0
		`, props.class)"
	>
		<slot />
	</div>
</template>
