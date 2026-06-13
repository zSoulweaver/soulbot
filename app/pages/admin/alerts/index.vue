<script setup lang="ts">
import { Save } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Spinner } from '~/components/ui/spinner'

// Reactive config state matching GET/PUT payload
const isLoading = ref(true)
const isSaving = ref(false)

const eventsubAlertFollowEnabled = ref(false)
const eventsubAlertFollow = ref('')
const eventsubPointsFollowEnabled = ref(false)
const eventsubPointsFollow = ref(0)

const eventsubAlertSubEnabled = ref(false)
const eventsubAlertSub = ref('')
const eventsubPointsSubEnabled = ref(false)
const eventsubPointsSub = ref(0)

const eventsubAlertGiftEnabled = ref(false)
const eventsubAlertGift = ref('')
const eventsubPointsGiftEnabled = ref(false)
const eventsubPointsGift = ref(0)

const eventsubAlertCheerEnabled = ref(false)
const eventsubAlertCheer = ref('')
const eventsubPointsCheerEnabled = ref(false)
const eventsubPointsCheer = ref(0)

// Retrieve settings from GET API
async function loadAlertSettings() {
	isLoading.value = true
	try {
		const data = await $fetch('/api/admin/alerts/settings')

		eventsubAlertFollowEnabled.value = data.eventsubAlertFollowEnabled
		eventsubAlertFollow.value = data.eventsubAlertFollow
		eventsubPointsFollowEnabled.value = data.eventsubPointsFollowEnabled
		eventsubPointsFollow.value = data.eventsubPointsFollow

		eventsubAlertSubEnabled.value = data.eventsubAlertSubEnabled
		eventsubAlertSub.value = data.eventsubAlertSub
		eventsubPointsSubEnabled.value = data.eventsubPointsSubEnabled
		eventsubPointsSub.value = data.eventsubPointsSub

		eventsubAlertGiftEnabled.value = data.eventsubAlertGiftEnabled
		eventsubAlertGift.value = data.eventsubAlertGift
		eventsubPointsGiftEnabled.value = data.eventsubPointsGiftEnabled
		eventsubPointsGift.value = data.eventsubPointsGift

		eventsubAlertCheerEnabled.value = data.eventsubAlertCheerEnabled
		eventsubAlertCheer.value = data.eventsubAlertCheer
		eventsubPointsCheerEnabled.value = data.eventsubPointsCheerEnabled
		eventsubPointsCheer.value = data.eventsubPointsCheer
	}
	catch (err: any) {
		toast.error('Failed to load EventSub settings configurations')
		console.error(err)
	}
	finally {
		isLoading.value = false
	}
}

// Update settings via PUT API
async function saveAlertSettings() {
	isSaving.value = true
	try {
		await $fetch('/api/admin/alerts/settings', {
			method: 'PUT',
			body: {
				eventsubAlertFollowEnabled: eventsubAlertFollowEnabled.value,
				eventsubAlertFollow: eventsubAlertFollow.value,
				eventsubPointsFollowEnabled: eventsubPointsFollowEnabled.value,
				eventsubPointsFollow: Number(eventsubPointsFollow.value) || 0,

				eventsubAlertSubEnabled: eventsubAlertSubEnabled.value,
				eventsubAlertSub: eventsubAlertSub.value,
				eventsubPointsSubEnabled: eventsubPointsSubEnabled.value,
				eventsubPointsSub: Number(eventsubPointsSub.value) || 0,

				eventsubAlertGiftEnabled: eventsubAlertGiftEnabled.value,
				eventsubAlertGift: eventsubAlertGift.value,
				eventsubPointsGiftEnabled: eventsubPointsGiftEnabled.value,
				eventsubPointsGift: Number(eventsubPointsGift.value) || 0,

				eventsubAlertCheerEnabled: eventsubAlertCheerEnabled.value,
				eventsubAlertCheer: eventsubAlertCheer.value,
				eventsubPointsCheerEnabled: eventsubPointsCheerEnabled.value,
				eventsubPointsCheer: Number(eventsubPointsCheer.value) || 0,
			},
		})
		toast.success('Alert and reward settings updated successfully!')
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to save configuration settings')
		console.error(err)
	}
	finally {
		isSaving.value = false
	}
}

onMounted(() => {
	loadAlertSettings()
})
</script>

<template>
	<AppPageContainer>
		<!-- Header Actions -->
		<AppPageHeader
			heading="Event Alerts & Rewards"
			subheading="Configure chat announcement templates and point rewards triggered by Twitch events."
		>
			<Button
				:disabled="isLoading || isSaving"
				@click="saveAlertSettings"
			>
				<Spinner v-if="isSaving" data-icon="inline-start" />
				<Save v-else data-icon="inline-start" />
				{{ isSaving ? 'Saving...' : 'Save Settings' }}
			</Button>
		</AppPageHeader>

		<!-- Main Settings Grid -->
		<div v-if="!isLoading" class="flex flex-col gap-4">
			<!-- Follower Config Card -->
			<AlertConfigCard
				v-model:alert-enabled="eventsubAlertFollowEnabled"
				v-model:alert-template="eventsubAlertFollow"
				v-model:points-enabled="eventsubPointsFollowEnabled"
				v-model:points-reward="eventsubPointsFollow"
				title="Follower Alerts"
				description="Triggers in real-time when a Twitch user follows your channel."
				:variables="['$(sender) (Follower Name)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(points) (Points)', '$(channel) (Channel)']"
			/>

			<!-- Subscription Config Card -->
			<AlertConfigCard
				v-model:alert-enabled="eventsubAlertSubEnabled"
				v-model:alert-template="eventsubAlertSub"
				v-model:points-enabled="eventsubPointsSubEnabled"
				v-model:points-reward="eventsubPointsSub"
				title="Subscription Alerts"
				description="Triggers when a chatter subscribes, resubscribes, or shares their subscription in chat."
				:variables="['$(sender) (Subscriber Name)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(points) (Points)', '$(subTier) (Tier)', '$(channel) (Channel)']"
			/>

			<!-- Subscription Gift Config Card -->
			<AlertConfigCard
				v-model:alert-enabled="eventsubAlertGiftEnabled"
				v-model:alert-template="eventsubAlertGift"
				v-model:points-enabled="eventsubPointsGiftEnabled"
				v-model:points-reward="eventsubPointsGift"
				title="Subscription Gift Alerts"
				description="Triggers when a viewer gifts one or multiple subscriptions to other chatters."
				:variables="['$(sender) (Gifter Name)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(points) (Points)', '$(giftCount) (Gift Count)']"
			/>

			<!-- Cheer Config Card -->
			<AlertConfigCard
				v-model:alert-enabled="eventsubAlertCheerEnabled"
				v-model:alert-template="eventsubAlertCheer"
				v-model:points-enabled="eventsubPointsCheerEnabled"
				v-model:points-reward="eventsubPointsCheer"
				title="Cheer Alerts"
				description="Triggers when a chatter cheers bits in your channel."
				points-label="Loyalty Points per 1 Bit Cheered"
				:variables="['$(sender) (Cheerer Name)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(points) (Points)', '$(bitsCount) (Bits)', '$(cheerMessage) (Message)']"
			/>
		</div>

		<!-- Skeleton loading state -->
		<div v-else class="flex flex-col gap-4">
			<Card v-for="i in 3" :key="i" class="space-y-4 p-6">
				<div class="space-y-2">
					<Skeleton class="h-6 w-1/4" />
					<Skeleton class="h-4 w-1/2" />
				</div>
				<Separator />
				<div
					class="
						grid grid-cols-1 gap-4
						md:grid-cols-2
					"
				>
					<div class="space-y-4">
						<Skeleton class="h-14 w-full" />
						<Skeleton class="h-20 w-full" />
					</div>
					<div class="space-y-4">
						<Skeleton class="h-14 w-full" />
						<Skeleton class="h-20 w-full" />
					</div>
				</div>
			</Card>
		</div>
	</AppPageContainer>
</template>
