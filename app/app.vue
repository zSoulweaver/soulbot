<script setup lang="ts">
import 'vue-sonner/style.css'
</script>

<template>
	<div class="min-h-screen bg-background font-sans antialiased">
		<NuxtLayout>
			<NuxtPage />
		</NuxtLayout>
		<ClientOnly>
			<Sonner />
		</ClientOnly>
	</div>
</template>
