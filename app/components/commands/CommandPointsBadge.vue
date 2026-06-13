<script setup lang="ts">
import { BadgeDollarSign } from '@lucide/vue'

const props = defineProps<{
	cost: number
}>()
</script>

<template>
	<Badge
		v-if="props.cost > 0"
		class="
			border border-amber-200 bg-amber-50 font-semibold text-amber-600 select-none
			dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400
		"
	>
		<BadgeDollarSign class="mr-1 size-3.5" />
		{{ props.cost }} pts
	</Badge>
	<span v-else class="text-muted-foreground select-none">-</span>
</template>
