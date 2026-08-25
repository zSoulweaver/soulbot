<script setup lang="ts">
import 'vue-sonner/style.css'

const route = useRoute()
const { public: { botName } } = useRuntimeConfig()

const isWidgetLayout = computed(() => route.meta.layout === 'widget')

useHead({
	titleTemplate: titleChunk => titleChunk ? `${titleChunk} - ${botName}` : botName,
	meta: [{ name: 'darkreader-lock', content: 'true' }],
})
</script>

<template>
	<div :class="[isWidgetLayout ? 'bg-transparent' : 'min-h-screen bg-background font-sans antialiased']">
		<TooltipProvider :delay-duration="300">
			<NuxtLayout>
				<NuxtPage />
			</NuxtLayout>
		</TooltipProvider>
		<ClientOnly v-if="!isWidgetLayout">
			<Sonner position="top-center" />
		</ClientOnly>
	</div>
</template>
