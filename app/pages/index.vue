<script setup lang="ts">
const { data: status } = await useFetch('/api/auth/status')

onMounted(() => {
  if (!status.value?.bot || !status.value?.streamer) {
    navigateTo('/setup')
  }
})
</script>

<template>
  <div class="p-8">
    <h1 class="text-3xl font-bold">Dashboard</h1>
    <p class="text-muted-foreground mt-2">Bot is active and connected.</p>
    
    <div class="mt-8 grid gap-4 md:grid-cols-2">
      <div class="p-6 border rounded-lg bg-card">
        <h2 class="text-xl font-semibold mb-4">Bot Status</h2>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Connected</span>
        </div>
      </div>
    </div>
  </div>
</template>
