<script setup lang="ts">
import { useColorMode } from '@vueuse/core'

const mode = useColorMode()

useHead(() => ({
	meta: mode.value === 'dark'
		? [{ name: 'darkreader-lock', content: 'true' }]
		: [],
}))
</script>

<template>
	<div class="min-h-screen w-full overflow-hidden bg-transparent antialiased">
		<slot />
	</div>
</template>
