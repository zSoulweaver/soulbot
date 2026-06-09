<script setup lang="ts">
import { useColorMode } from '@vueuse/core'
import { MoonIcon, SunIcon } from 'lucide-vue-next'
import { ref } from 'vue'

const mode = useColorMode()
const displayedMode = ref(mode.value)

// Disable Dark Reader extension when in dark mode
useHead(() => ({
	meta: mode.value === 'dark'
		? [{ name: 'darkreader-lock', content: 'true' }]
		: [],
}))

function toggleTheme() {
	const nextMode = mode.value === 'dark' ? 'light' : 'dark'

	// Update icon/text immediately
	displayedMode.value = nextMode

	// Delay the global background/theme change
	setTimeout(() => {
		mode.value = nextMode
	}, 250)
}
</script>

<template>
	<ClientOnly>
		<Button
			size="icon"
			variant="ghost"
			class="transition-transform"
			@click="toggleTheme"
		>
			<div
				class="relative flex size-5 items-center justify-center overflow-hidden"
			>
				<transition name="theme-slide">
					<SunIcon
						v-if="displayedMode === 'light'"
						class="absolute size-4 text-amber-500"
					/>
					<MoonIcon
						v-else
						class="absolute size-4 text-blue-400"
					/>
				</transition>
			</div>
		</Button>
	</ClientOnly>
</template>

<style scoped>
.theme-slide-enter-active,
.theme-slide-leave-active {
	transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.theme-slide-enter-from {
	opacity: 0;
	transform: translateY(150%) rotate(45deg) scale(0.5);
}

.theme-slide-leave-to {
	opacity: 0;
	transform: translateY(-150%) rotate(-45deg) scale(0.5);
}
</style>
