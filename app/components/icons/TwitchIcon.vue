<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

const props = defineProps<{
	class?: HTMLAttributes['class']
}>()
</script>

<template>
	<svg
		viewBox="0 0 2400 2800"
		xmlns="http://www.w3.org/2000/svg"
		:class="props.class"
	>
		<g>
			<path
				d="M500,0L0,500v1800h600v500l500-500h400l900-900V0H500z M2200,1300l-400,400h-400l-350,350v-350H600V200h1600V1300z"
				fill="currentColor"
			/>
			<rect
				x="1700"
				y="550"
				width="200"
				height="600"
				fill="currentColor"
			/>
			<rect
				x="1150"
				y="550"
				width="200"
				height="600"
				fill="currentColor"
			/>
		</g>
	</svg>
</template>
