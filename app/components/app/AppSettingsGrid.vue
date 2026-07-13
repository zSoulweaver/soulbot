<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '~/lib/utils'

defineProps<{
	class?: HTMLAttributes['class']
}>()
</script>

<template>
	<div
		:class="cn(
			`
				grid grid-cols-1 gap-12
				xl:grid-cols-[minmax(0,48rem)_minmax(0,32rem)]
			`,
			$props.class,
		)"
	>
		<!-- Main Settings Column -->
		<div class="flex w-full flex-col gap-6">
			<slot />
		</div>

		<!-- Right Widget Column -->
		<div v-if="$slots.sidebar" class="flex w-full shrink-0 flex-col gap-6">
			<slot name="sidebar" />
		</div>
	</div>
</template>
