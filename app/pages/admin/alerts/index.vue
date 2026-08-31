<script setup lang="ts">
import { Spinner } from '~/components/ui/spinner'

type AlertSettings = Awaited<ReturnType<typeof import('~~/server/api/admin/alerts/settings.get').default>>

useHead({
	title: 'Event Alerts & Rewards',
})

const {
	form,
	isModified,
	isSaving,
	loading,
	refresh: refreshSettings,
	discard: discardChanges,
	save: saveAlertSettings,
} = useSettingsForm<AlertSettings>('/api/admin/alerts/settings', {
	successMessage: 'Event alert settings updated successfully!',
})
</script>

<template>
	<AppSettingsPage
		heading="Event Alerts & Rewards"
		subheading="Configure chat announcement templates and point rewards triggered by Twitch events."
	>
		<template #header-actions>
			<AppRefreshButton :loading="loading" @click="refreshSettings" />
		</template>
		<!-- Loading state -->
		<div v-if="loading" class="flex flex-col items-center justify-center gap-2 py-20">
			<Spinner class="size-8 text-primary" />
			<span class="text-sm text-muted-foreground">Loading active configurations...</span>
		</div>

		<!-- Main Settings Grid -->
		<ConfigAccordionGroup v-else>
			<!-- Follower Config Card -->
			<AlertConfig
				v-model:alert-enabled="form.eventsubAlertFollowEnabled"
				v-model:alert-template="form.eventsubAlertFollow"
				v-model:points-enabled="form.eventsubPointsFollowEnabled"
				v-model:points-reward="form.eventsubPointsFollow"
				title="Follower Alerts"
				description="Triggers in real-time when a Twitch user follows your channel."
				:variables="['$(sender) (Follower Name)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(points) (Points)', '$(channel) (Channel)']"
			/>

			<!-- Subscription Config Card -->
			<AlertConfig
				v-model:alert-enabled="form.eventsubAlertSubEnabled"
				v-model:alert-template="form.eventsubAlertSub"
				v-model:points-enabled="form.eventsubPointsSubEnabled"
				v-model:points-reward="form.eventsubPointsSub"
				title="Subscription Alerts"
				description="Triggers when a chatter subscribes, resubscribes, or shares their subscription in chat."
				:variables="['$(sender) (Subscriber Name)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(points) (Points)', '$(subTier) (Tier)', '$(channel) (Channel)']"
			/>

			<!-- Subscription Gift Config Card -->
			<AlertConfig
				v-model:alert-enabled="form.eventsubAlertGiftEnabled"
				v-model:alert-template="form.eventsubAlertGift"
				v-model:points-enabled="form.eventsubPointsGiftEnabled"
				v-model:points-reward="form.eventsubPointsGift"
				title="Subscription Gift Alerts"
				description="Triggers when a viewer gifts one or multiple subscriptions to other chatters."
				:variables="['$(sender) (Gifter Name)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(points) (Points)', '$(giftCount) (Gift Count)']"
			/>

			<!-- Cheer Config Card -->
			<AlertConfig
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
			<AlertConfig
				v-model:alert-enabled="form.eventsubAlertRaidEnabled"
				v-model:alert-template="form.eventsubAlertRaid"
				title="Raid Alerts"
				description="Triggers when another broadcaster raids your channel."
				:variables="['$(sender) (Raider Display Name)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(raidSize) (Viewer Count)', '$(channel) (Channel)']"
				:hide-points="true"
			/>

			<!-- Live Config Card -->
			<AlertConfig
				v-model:alert-enabled="form.eventsubAlertLiveEnabled"
				v-model:alert-template="form.eventsubAlertLive"
				title="Stream Live Alerts"
				description="Triggers when your Twitch channel goes live."
				:variables="['$(sender) (Broadcaster Name)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(liveTitle) (Stream Title)', '$(liveGame) (Game Name)', '$(channel) (Channel)']"
				:hide-points="true"
			/>

			<!-- Offline Config Card -->
			<AlertConfig
				v-model:alert-enabled="form.eventsubAlertOfflineEnabled"
				v-model:alert-template="form.eventsubAlertOffline"
				title="Stream Offline Alerts"
				description="Triggers when your Twitch channel goes offline."
				:variables="['$(sender) (Broadcaster Name)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(channel) (Channel)']"
				:hide-points="true"
			/>

			<!-- Ad Break Config Card -->
			<AlertConfig
				v-model:alert-enabled="form.eventsubAlertAdBreakEnabled"
				v-model:alert-template="form.eventsubAlertAdBreak"
				title="Ad Break Start Alerts"
				description="Triggers when an advertisement break starts on your channel."
				:variables="['$(duration) (Ad break duration in seconds)', '$(requester) (User who triggered ad break)']"
				:hide-points="true"
			/>

			<!-- User Ban Config Card -->
			<AlertConfig
				v-model:alert-enabled="form.eventsubAlertBanEnabled"
				v-model:alert-template="form.eventsubAlertBan"
				title="User Ban Alerts"
				description="Triggers when a user is permanently banned from your channel."
				:variables="['$(sender) (Banned User)', '$(sender.name) (Username)', '$(sender.id) (ID)']"
				:hide-points="true"
			/>

			<!-- User Timeout Config Card -->
			<AlertConfig
				v-model:alert-enabled="form.eventsubAlertTimeoutEnabled"
				v-model:alert-template="form.eventsubAlertTimeout"
				title="User Timeout Alerts"
				description="Triggers when a user is timed out in your channel."
				:variables="['$(sender) (Timed-out User)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(duration) (Timeout Duration in Seconds)']"
				:hide-points="true"
			/>

			<!-- User Unban Config Card -->
			<AlertConfig
				v-model:alert-enabled="form.eventsubAlertUnbanEnabled"
				v-model:alert-template="form.eventsubAlertUnban"
				title="User Unban Alerts"
				description="Triggers when a user is unbanned from your channel."
				:variables="['$(sender) (Unbanned User)', '$(sender.name) (Username)', '$(sender.id) (ID)']"
				:hide-points="true"
			/>

			<!-- Message Delete Config Card -->
			<AlertConfig
				v-model:alert-enabled="form.eventsubAlertMessageDeleteEnabled"
				v-model:alert-template="form.eventsubAlertMessageDelete"
				title="Message Delete Alerts"
				description="Triggers when a chat message is deleted by a moderator."
				:variables="['$(sender) (User Name)', '$(sender.name) (Username)', '$(sender.id) (ID)']"
				:hide-points="true"
			/>
		</ConfigAccordionGroup>

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
	</AppSettingsPage>
</template>
