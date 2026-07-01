<script setup lang="ts">
import { RefreshCcw } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Spinner } from '~/components/ui/spinner'

type AlertSettings = Awaited<ReturnType<typeof import('~~/server/api/admin/alerts/settings.get').default>>

// Fetch active settings using non-blocking useFetch
const { data: settingsData, refresh: refreshSettings, pending: loading } = useFetch<AlertSettings>('/api/admin/alerts/settings')

const form = ref<AlertSettings>({
	eventsubAlertFollowEnabled: false,
	eventsubAlertFollow: '',
	eventsubPointsFollowEnabled: false,
	eventsubPointsFollow: 0,

	eventsubAlertSubEnabled: false,
	eventsubAlertSub: '',
	eventsubPointsSubEnabled: false,
	eventsubPointsSub: 0,

	eventsubAlertGiftEnabled: false,
	eventsubAlertGift: '',
	eventsubPointsGiftEnabled: false,
	eventsubPointsGift: 0,

	eventsubAlertCheerEnabled: false,
	eventsubAlertCheer: '',
	eventsubPointsCheerEnabled: false,
	eventsubPointsCheer: 0,

	eventsubAlertRaidEnabled: false,
	eventsubAlertRaid: '',

	eventsubAlertLiveEnabled: false,
	eventsubAlertLive: '',

	eventsubAlertOfflineEnabled: false,
	eventsubAlertOffline: '',
})

const isSaving = ref(false)

// Synchronize values once loaded
watch(settingsData, (newData) => {
	if (newData) {
		form.value = { ...newData }
	}
}, { immediate: true })

const isModified = computed(() => {
	if (!settingsData.value)
		return false
	return (
		form.value.eventsubAlertFollowEnabled !== settingsData.value.eventsubAlertFollowEnabled
		|| form.value.eventsubAlertFollow !== settingsData.value.eventsubAlertFollow
		|| form.value.eventsubPointsFollowEnabled !== settingsData.value.eventsubPointsFollowEnabled
		|| form.value.eventsubPointsFollow !== settingsData.value.eventsubPointsFollow

		|| form.value.eventsubAlertSubEnabled !== settingsData.value.eventsubAlertSubEnabled
		|| form.value.eventsubAlertSub !== settingsData.value.eventsubAlertSub
		|| form.value.eventsubPointsSubEnabled !== settingsData.value.eventsubPointsSubEnabled
		|| form.value.eventsubPointsSub !== settingsData.value.eventsubPointsSub

		|| form.value.eventsubAlertGiftEnabled !== settingsData.value.eventsubAlertGiftEnabled
		|| form.value.eventsubAlertGift !== settingsData.value.eventsubAlertGift
		|| form.value.eventsubPointsGiftEnabled !== settingsData.value.eventsubPointsGiftEnabled
		|| form.value.eventsubPointsGift !== settingsData.value.eventsubPointsGift

		|| form.value.eventsubAlertCheerEnabled !== settingsData.value.eventsubAlertCheerEnabled
		|| form.value.eventsubAlertCheer !== settingsData.value.eventsubAlertCheer
		|| form.value.eventsubPointsCheerEnabled !== settingsData.value.eventsubPointsCheerEnabled
		|| form.value.eventsubPointsCheer !== settingsData.value.eventsubPointsCheer

		|| form.value.eventsubAlertRaidEnabled !== settingsData.value.eventsubAlertRaidEnabled
		|| form.value.eventsubAlertRaid !== settingsData.value.eventsubAlertRaid

		|| form.value.eventsubAlertLiveEnabled !== settingsData.value.eventsubAlertLiveEnabled
		|| form.value.eventsubAlertLive !== settingsData.value.eventsubAlertLive

		|| form.value.eventsubAlertOfflineEnabled !== settingsData.value.eventsubAlertOfflineEnabled
		|| form.value.eventsubAlertOffline !== settingsData.value.eventsubAlertOffline
	)
})

function discardChanges() {
	if (settingsData.value) {
		form.value = { ...settingsData.value }
		toast.info('Discarded unsaved changes')
	}
}

// Update settings via PUT API
async function saveAlertSettings() {
	if (isSaving.value)
		return

	isSaving.value = true
	try {
		await $fetch('/api/admin/alerts/settings', {
			method: 'PUT',
			body: {
				eventsubAlertFollowEnabled: form.value.eventsubAlertFollowEnabled,
				eventsubAlertFollow: form.value.eventsubAlertFollow,
				eventsubPointsFollowEnabled: form.value.eventsubPointsFollowEnabled,
				eventsubPointsFollow: Number(form.value.eventsubPointsFollow) || 0,

				eventsubAlertSubEnabled: form.value.eventsubAlertSubEnabled,
				eventsubAlertSub: form.value.eventsubAlertSub,
				eventsubPointsSubEnabled: form.value.eventsubPointsSubEnabled,
				eventsubPointsSub: Number(form.value.eventsubPointsSub) || 0,

				eventsubAlertGiftEnabled: form.value.eventsubAlertGiftEnabled,
				eventsubAlertGift: form.value.eventsubAlertGift,
				eventsubPointsGiftEnabled: form.value.eventsubPointsGiftEnabled,
				eventsubPointsGift: Number(form.value.eventsubPointsGift) || 0,

				eventsubAlertCheerEnabled: form.value.eventsubAlertCheerEnabled,
				eventsubAlertCheer: form.value.eventsubAlertCheer,
				eventsubPointsCheerEnabled: form.value.eventsubPointsCheerEnabled,
				eventsubPointsCheer: Number(form.value.eventsubPointsCheer) || 0,

				eventsubAlertRaidEnabled: form.value.eventsubAlertRaidEnabled,
				eventsubAlertRaid: form.value.eventsubAlertRaid,

				eventsubAlertLiveEnabled: form.value.eventsubAlertLiveEnabled,
				eventsubAlertLive: form.value.eventsubAlertLive,

				eventsubAlertOfflineEnabled: form.value.eventsubAlertOfflineEnabled,
				eventsubAlertOffline: form.value.eventsubAlertOffline,
			},
		})
		toast.success('Alert and reward settings updated successfully!')
		await refreshSettings()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to save configuration settings')
		console.error(err)
	}
	finally {
		isSaving.value = false
	}
}
</script>

<template>
	<AppPageContainer>
		<!-- Header Actions -->
		<AppPageHeader
			heading="Event Alerts & Rewards"
			subheading="Configure chat announcement templates and point rewards triggered by Twitch events."
		>
			<Button variant="ghost" :disabled="loading" @click="refreshSettings">
				<RefreshCcw :class="{ 'animate-spin': loading }" />
			</Button>
		</AppPageHeader>

		<!-- Loading state -->
		<div v-if="loading" class="flex flex-col items-center justify-center gap-2 py-20">
			<Spinner class="size-8 text-primary" />
			<span class="text-sm text-muted-foreground">Loading active configurations...</span>
		</div>

		<!-- Main Settings Grid -->
		<div v-else class="flex flex-col gap-4">
			<!-- Follower Config Card -->
			<AlertConfigCard
				v-model:alert-enabled="form.eventsubAlertFollowEnabled"
				v-model:alert-template="form.eventsubAlertFollow"
				v-model:points-enabled="form.eventsubPointsFollowEnabled"
				v-model:points-reward="form.eventsubPointsFollow"
				title="Follower Alerts"
				description="Triggers in real-time when a Twitch user follows your channel."
				:variables="['$(sender) (Follower Name)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(points) (Points)', '$(channel) (Channel)']"
			/>

			<!-- Subscription Config Card -->
			<AlertConfigCard
				v-model:alert-enabled="form.eventsubAlertSubEnabled"
				v-model:alert-template="form.eventsubAlertSub"
				v-model:points-enabled="form.eventsubPointsSubEnabled"
				v-model:points-reward="form.eventsubPointsSub"
				title="Subscription Alerts"
				description="Triggers when a chatter subscribes, resubscribes, or shares their subscription in chat."
				:variables="['$(sender) (Subscriber Name)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(points) (Points)', '$(subTier) (Tier)', '$(channel) (Channel)']"
			/>

			<!-- Subscription Gift Config Card -->
			<AlertConfigCard
				v-model:alert-enabled="form.eventsubAlertGiftEnabled"
				v-model:alert-template="form.eventsubAlertGift"
				v-model:points-enabled="form.eventsubPointsGiftEnabled"
				v-model:points-reward="form.eventsubPointsGift"
				title="Subscription Gift Alerts"
				description="Triggers when a viewer gifts one or multiple subscriptions to other chatters."
				:variables="['$(sender) (Gifter Name)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(points) (Points)', '$(giftCount) (Gift Count)']"
			/>

			<!-- Cheer Config Card -->
			<AlertConfigCard
				v-model:alert-enabled="form.eventsubAlertCheerEnabled"
				v-model:alert-template="form.eventsubAlertCheer"
				v-model:points-enabled="form.eventsubPointsCheerEnabled"
				v-model:points-reward="form.eventsubPointsCheer"
				title="Cheer Alerts"
				description="Triggers when a chatter cheers bits in your channel."
				points-label="Loyalty Points per 1 Bit Cheered"
				:variables="['$(sender) (Cheerer Name)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(points) (Points)', '$(bitsCount) (Bits)', '$(cheerMessage) (Message)']"
			/>

			<!-- Raid Config Card -->
			<AlertConfigCard
				v-model:alert-enabled="form.eventsubAlertRaidEnabled"
				v-model:alert-template="form.eventsubAlertRaid"
				title="Raid Alerts"
				description="Triggers when another broadcaster raids your channel."
				:variables="['$(sender) (Raider Display Name)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(raidSize) (Viewer Count)', '$(channel) (Channel)']"
				:hide-points="true"
			/>

			<!-- Live Config Card -->
			<AlertConfigCard
				v-model:alert-enabled="form.eventsubAlertLiveEnabled"
				v-model:alert-template="form.eventsubAlertLive"
				title="Stream Live Alerts"
				description="Triggers when your Twitch channel goes live."
				:variables="['$(sender) (Broadcaster Name)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(liveTitle) (Stream Title)', '$(liveGame) (Game Name)', '$(channel) (Channel)']"
				:hide-points="true"
			/>

			<!-- Offline Config Card -->
			<AlertConfigCard
				v-model:alert-enabled="form.eventsubAlertOfflineEnabled"
				v-model:alert-template="form.eventsubAlertOffline"
				title="Stream Offline Alerts"
				description="Triggers when your Twitch channel goes offline."
				:variables="['$(sender) (Broadcaster Name)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(channel) (Channel)']"
				:hide-points="true"
			/>
		</div>

		<AppFloatingSaveBar
			:show="isModified"
			:is-saving="isSaving"
			title="Unsaved Alert Settings"
			description="You have modified event alerts & rewards settings. Save to apply changes."
			save-text="Save Settings"
			saving-text="Saving Settings..."
			discard-text="Discard Changes"
			@save="saveAlertSettings"
			@discard="discardChanges"
		/>
	</AppPageContainer>
</template>
