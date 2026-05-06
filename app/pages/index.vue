<script setup lang="ts">
import { ref } from 'vue'

const { data: status } = await useFetch('/api/auth/status')

onMounted(() => {
	if (!status.value?.bot || !status.value?.streamer) {
		navigateTo('/setup')
	}
})

const username = ref('')
const amount = ref<number>(0)
const currentPoints = ref<number | null>(null)
const error = ref('')
const loading = ref(false)

async function getPoints() {
	if (!username.value) return
	loading.value = true
	error.value = ''
	try {
		const res = await $fetch<{ points: number }>(`/api/points/${username.value}`)
		currentPoints.value = res.points
	} catch (err: any) {
		error.value = err.data?.statusMessage || 'User not found'
		currentPoints.value = null
	} finally {
		loading.value = false
	}
}

async function updatePoints(mode: 'add' | 'set') {
	if (!username.value) return
	loading.value = true
	error.value = ''
	try {
		const res = await $fetch<{ points: number }>(`/api/points/${username.value}`, {
			method: 'POST',
			body: {
				amount: amount.value,
				mode
			}
		})
		currentPoints.value = res.points
		amount.value = 0
	} catch (err: any) {
		error.value = err.data?.statusMessage || 'Failed to update points'
	} finally {
		loading.value = false
	}
}
</script>

<template>
	<div class="p-8">
		<h1 class="text-3xl font-bold">
			Dashboard
		</h1>
		<p class="mt-2 text-muted-foreground">
			Bot is active and connected.
		</p>

		<div class="mt-8 grid gap-4 md:grid-cols-2">
			<div class="rounded-lg border bg-card p-6">
				<h2 class="mb-4 text-xl font-semibold">
					Bot Status
				</h2>
				<div class="flex items-center gap-2">
					<div class="size-3 rounded-full bg-green-500" />
					<span>Connected</span>
				</div>
			</div>

			<div class="rounded-lg border bg-card p-6">
				<h2 class="mb-4 text-xl font-semibold">
					Manage Points
				</h2>
				<div class="space-y-4">
					<div class="flex gap-2">
						<div class="flex-1 space-y-1">
							<Label for="username">Username</Label>
							<Input id="username" v-model="username" placeholder="Twitch username..." @keyup.enter="getPoints" @input="currentPoints = null" />
						</div>
						<div class="flex items-end">
							<Button :disabled="loading || !username" @click="getPoints">
								Get Points
							</Button>
						</div>
					</div>

					<div v-if="currentPoints !== null" class="rounded-md bg-muted p-3">
						<span class="font-medium">{{ username }}</span> currently has <span class="font-bold text-primary">{{ currentPoints }}</span> points.
					</div>

					<div v-if="error" class="text-sm text-destructive">
						{{ error }}
					</div>

					<div class="flex gap-2 pt-2">
						<div class="flex-1 space-y-1">
							<Label for="amount">Amount</Label>
							<Input id="amount" type="number" v-model="amount" />
						</div>
						<div class="flex items-end gap-2">
							<Button variant="secondary" :disabled="loading || !username" @click="updatePoints('add')">
								Add
							</Button>
							<Button :disabled="loading || !username" @click="updatePoints('set')">
								Set
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
