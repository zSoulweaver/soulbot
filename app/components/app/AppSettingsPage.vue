<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '~/lib/utils'

defineProps<{
	heading: string
	subheading?: string
	containerClass?: HTMLAttributes['class']
}>()
</script>

<template>
	<div class="flex flex-1 flex-col">
		<AppPageHeader :heading="heading" :subheading="subheading">
			<slot name="header-actions" />
		</AppPageHeader>

		<AppPageContainer :class="cn('flex-1', containerClass)">
			<slot />
		</AppPageContainer>
	</div>
</template>
