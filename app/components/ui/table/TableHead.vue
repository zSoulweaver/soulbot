<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
	class?: HTMLAttributes['class']
}>()
</script>

<template>
	<th
		data-slot="table-head"
		:class="cn(`
			h-12 px-6 text-left align-middle text-xs font-bold whitespace-nowrap text-muted-foreground uppercase select-none
			[&:has([role=checkbox])]:pr-0
			*:[[role=checkbox]]:translate-y-[2px]
		`, props.class)"
	>
		<slot />
	</th>
</template>
