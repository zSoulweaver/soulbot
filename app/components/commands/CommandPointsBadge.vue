<script setup lang="ts">
import { BadgeDollarSign } from 'lucide-vue-next'

const props = defineProps<{
	cost: number
}>()
</script>

<template>
	<Badge
		v-if="props.cost > 0"
		class="border-amber-500/20 bg-amber-500/10 font-semibold text-amber-500 select-none"
	>
		<BadgeDollarSign class="mr-1 size-3.5" />
		{{ props.cost }} pts
	</Badge>
	<span v-else class="text-muted-foreground select-none">-</span>
</template>
