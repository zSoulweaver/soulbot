<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = defineProps<{
	class?: string
}>()
</script>

<template>
	<div
		:class="cn(`
			flex flex-col justify-between gap-4 px-4 py-3
			sm:flex-row sm:items-center
		`, props.class)"
	>
		<slot />
	</div>
</template>
