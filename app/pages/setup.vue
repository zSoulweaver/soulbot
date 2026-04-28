<script setup lang="ts">
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, Circle } from 'lucide-vue-next'

const { data: status, refresh } = await useFetch('/api/auth/status')

const isComplete = computed(() => status.value?.bot && status.value?.streamer)

const startBot = async () => {
  try {
    await $fetch('/api/bot/start', { method: 'POST' })
    navigateTo('/')
  } catch (err) {
    console.error('Failed to start bot', err)
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-screen p-4">
    <Card class="w-full max-w-md">
      <CardHeader>
        <CardTitle>Bot Onboarding</CardTitle>
        <CardDescription>
          Please authenticate both accounts to get started.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <!-- Streamer Account -->
        <div class="flex items-center justify-between p-4 border rounded-lg">
          <div class="flex items-center gap-3">
            <CheckCircle2 v-if="status?.streamer" class="text-green-500" />
            <Circle v-else class="text-muted-foreground" />
            <div>
              <p class="font-medium">Streamer Account</p>
              <p class="text-sm text-muted-foreground" v-if="status?.streamer">
                Connected (ID: {{ status.streamer.userId }})
              </p>
              <p class="text-sm text-muted-foreground" v-else>
                Not connected
              </p>
            </div>
          </div>
          <Button 
            v-if="!status?.streamer" 
            variant="outline" 
            size="sm"
            as="a"
            href="/api/auth/twitch/login?type=streamer"
          >
            Connect
          </Button>
        </div>

        <!-- Bot Account -->
        <div class="flex items-center justify-between p-4 border rounded-lg">
          <div class="flex items-center gap-3">
            <CheckCircle2 v-if="status?.bot" class="text-green-500" />
            <Circle v-else class="text-muted-foreground" />
            <div>
              <p class="font-medium">Bot Account</p>
              <p class="text-sm text-muted-foreground" v-if="status?.bot">
                Connected (ID: {{ status.bot.userId }})
              </p>
              <p class="text-sm text-muted-foreground" v-else>
                Not connected
              </p>
            </div>
          </div>
          <Button 
            v-if="!status?.bot" 
            variant="outline" 
            size="sm"
            as="a"
            href="/api/auth/twitch/login?type=bot"
          >
            Connect
          </Button>
        </div>

        <Alert v-if="isComplete" variant="default" class="bg-green-50 border-green-200">
          <CheckCircle2 class="h-4 w-4 text-green-600" />
          <AlertTitle class="text-green-800">Ready to go!</AlertTitle>
          <AlertDescription class="text-green-700">
            Both accounts are authenticated. You can now start the bot.
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter>
        <Button 
          class="w-full" 
          :disabled="!isComplete"
          @click="startBot"
        >
          {{ isComplete ? 'Initialize Bot' : 'Complete Setup' }}
        </Button>
      </CardFooter>
    </Card>
  </div>
</template>
