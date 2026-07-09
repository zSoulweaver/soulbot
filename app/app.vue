<script setup lang="ts">
import 'vue-sonner/style.css'

const { public: { botName } } = useRuntimeConfig()

useHead({
	titleTemplate: titleChunk => titleChunk ? `${titleChunk} - ${botName}` : botName,
	meta: [{ name: 'darkreader-lock', content: 'true' }],
})
</script>

<template>
	<div class="min-h-screen bg-background font-sans antialiased">
		<NuxtLayout>
			<NuxtPage />
		</NuxtLayout>
		<ClientOnly>
			<Sonner position="top-center" />
		</ClientOnly>
	</div>
</template>
