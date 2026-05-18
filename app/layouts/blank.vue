<script setup lang="ts">
import { useColorMode } from '@vueuse/core'

const mode = useColorMode()

// Disable Dark Reader extension when in dark mode
useHead(() => ({
	meta: mode.value === 'dark'
		? [{ name: 'darkreader-lock', content: 'true' }]
		: [],
}))
</script>

<template>
	<slot />
</template>
