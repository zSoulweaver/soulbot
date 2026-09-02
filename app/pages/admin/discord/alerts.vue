<script setup lang="ts">
import { computed } from 'vue'
import DiscordAlertConfig from '~/components/discord/DiscordAlertConfig.vue'

type AlertsSettings = Awaited<ReturnType<typeof import('~~/server/api/admin/discord/alerts.get').default>>

const {
	form,
	isModified,
	isSaving,
	loading,
	refresh: refreshSettings,
	discard: discardChanges,
	save: saveSettings,
} = useSettingsForm<AlertsSettings>('/api/admin/discord/alerts', {
	ignoreKeys: ['isDiscordConnected'],
	successMessage: 'Discord alert settings updated successfully!',
})

const { data: channelsResponse } = useFetch<{ id: string, name: string }[]>('/api/admin/discord/channels')
const channels = computed(() => channelsResponse.value || [])

useHead({
	title: 'Twitch Event Alerts',
})
</script>

<template>
	<AppSettingsPage
		heading="Twitch Event Alerts"
		subheading="Configure real-time text announcements in specific Discord channels triggered by Twitch events."
	>
		<template #header-actions>
			<AppRefreshButton :loading="loading" @click="refreshSettings" />
		</template>

		<ClientOnly>
			<!-- Loader -->
			<div v-if="loading" class="flex flex-col items-center justify-center gap-2 py-20">
				<Spinner class="size-8 text-primary" />
				<span class="text-sm text-muted-foreground">Loading active configurations...</span>
			</div>

			<!-- Alerts Content -->
			<AppSettingsGrid v-else>
				<ConfigAccordionGroup>
					<!-- Alert banner if Discord Bot is not connected -->
					<Alert v-if="!form.isDiscordConnected" variant="warning" class="border-amber-500/50 bg-amber-500/10">
						<AlertTitle
							class="
								font-bold text-amber-600
								dark:text-amber-400
							"
						>
							Discord Bot Offline
						</AlertTitle>
						<AlertDescription
							class="
								text-sm/relaxed text-amber-600/90
								dark:text-amber-400/90
							"
						>
							The Discord bot integration is currently disabled or disconnected.
							You can still modify and save message templates, but sending alerts is inactive and toggles are locked.
							Ensure Discord is enabled and configured correctly in <NuxtLink to="/admin/discord/settings" class="font-semibold underline">
								Settings
							</NuxtLink>.
						</AlertDescription>
					</Alert>

					<!-- Follower Alerts Card -->
					<DiscordAlertConfig
						v-model:alert-enabled="form.discordAlertFollowEnabled"
						v-model:alert-channel-id="form.discordAlertFollowChannelId"
						v-model:alert-template="form.discordAlertFollowTemplate"
						title="Follower Alerts"
						description="Send a message to a Discord channel when a user follows your Twitch stream."
						scope="discord.alert.follow"
						:channels="channels"
						:disabled="!form.isDiscordConnected"
					/>

					<!-- Subscription Alerts Card -->
					<DiscordAlertConfig
						v-model:alert-enabled="form.discordAlertSubEnabled"
						v-model:alert-channel-id="form.discordAlertSubChannelId"
						v-model:alert-template="form.discordAlertSubTemplate"
						title="Subscription Alerts"
						description="Send a message to a Discord channel when a viewer subscribes or resubscribes."
						scope="discord.alert.sub"
						:channels="channels"
						:disabled="!form.isDiscordConnected"
					/>

					<!-- Subscription Gift Alerts Card -->
					<DiscordAlertConfig
						v-model:alert-enabled="form.discordAlertGiftEnabled"
						v-model:alert-channel-id="form.discordAlertGiftChannelId"
						v-model:alert-template="form.discordAlertGiftTemplate"
						title="Subscription Gift Alerts"
						description="Send a message to a Discord channel when a viewer gifts subs to the community."
						scope="discord.alert.gift"
						:channels="channels"
						:disabled="!form.isDiscordConnected"
					/>

					<!-- Cheer Alerts Card -->
					<DiscordAlertConfig
						v-model:alert-enabled="form.discordAlertCheerEnabled"
						v-model:alert-channel-id="form.discordAlertCheerChannelId"
						v-model:alert-template="form.discordAlertCheerTemplate"
						title="Cheer Alerts"
						description="Send a message to a Discord channel when a user cheers bits on your stream."
						scope="discord.alert.cheer"
						:channels="channels"
						:disabled="!form.isDiscordConnected"
					/>

					<!-- Live Announcement Alerts Card -->
					<DiscordAlertConfig
						v-model:alert-enabled="form.discordAlertLiveEnabled"
						v-model:alert-channel-id="form.discordAlertLiveChannelId"
						v-model:alert-template="form.discordAlertLiveTemplate"
						title="Live Stream Alerts"
						description="Send a rich embed message with Category, Stream Title, and Preview Image to Discord when your stream goes live."
						scope="discord.alert.live"
						:channels="channels"
						:disabled="!form.isDiscordConnected"
					>
						<template #extra-options>
							<SettingsGroupItem
								v-if="form.discordAlertLiveEnabled && form.isDiscordConnected"
							>
								<SettingsGroupContent>
									<SettingsGroupLabel>Remove Post Once Offline</SettingsGroupLabel>
									<SettingsGroupDescription>
										Delete the Discord live announcement message automatically when the stream goes offline.
									</SettingsGroupDescription>
								</SettingsGroupContent>
								<SettingsGroupAction>
									<Switch
										v-model:model-value="form.discordAlertLiveRemoveOffline"
									/>
								</SettingsGroupAction>
							</SettingsGroupItem>
						</template>
					</DiscordAlertConfig>

					<!-- Offline Announcement Alerts Card -->
					<DiscordAlertConfig
						v-model:alert-enabled="form.discordAlertOfflineEnabled"
						v-model:alert-channel-id="form.discordAlertOfflineChannelId"
						v-model:alert-template="form.discordAlertOfflineTemplate"
						title="Stream Offline Alerts"
						description="Send an announcement message to Discord when your stream goes offline."
						scope="discord.alert.offline"
						:channels="channels"
						:disabled="!form.isDiscordConnected"
					/>

					<!-- Raid Announcement Alerts Card -->
					<DiscordAlertConfig
						v-model:alert-enabled="form.discordAlertRaidEnabled"
						v-model:alert-channel-id="form.discordAlertRaidChannelId"
						v-model:alert-template="form.discordAlertRaidTemplate"
						title="Raid Alerts"
						description="Send an announcement message to Discord when another channel raids you."
						scope="discord.alert.raid"
						:channels="channels"
						:disabled="!form.isDiscordConnected"
					/>

					<!-- User Ban Alert Card -->
					<DiscordAlertConfig
						v-model:alert-enabled="form.discordAlertBanEnabled"
						v-model:alert-channel-id="form.discordAlertBanChannelId"
						v-model:alert-template="form.discordAlertBanTemplate"
						title="User Ban Alerts"
						description="Send a message to Discord when a user is permanently banned from your stream."
						scope="discord.alert.ban"
						:channels="channels"
						:disabled="!form.isDiscordConnected"
					/>

					<!-- User Timeout Alert Card -->
					<DiscordAlertConfig
						v-model:alert-enabled="form.discordAlertTimeoutEnabled"
						v-model:alert-channel-id="form.discordAlertTimeoutChannelId"
						v-model:alert-template="form.discordAlertTimeoutTemplate"
						title="User Timeout Alerts"
						description="Send a message to Discord when a user is timed out in your stream."
						scope="discord.alert.timeout"
						:channels="channels"
						:disabled="!form.isDiscordConnected"
					/>

					<!-- User Unban Alert Card -->
					<DiscordAlertConfig
						v-model:alert-enabled="form.discordAlertUnbanEnabled"
						v-model:alert-channel-id="form.discordAlertUnbanChannelId"
						v-model:alert-template="form.discordAlertUnbanTemplate"
						title="User Unban Alerts"
						description="Send a message to Discord when a user is unbanned from your stream."
						scope="discord.alert.unban"
						:channels="channels"
						:disabled="!form.isDiscordConnected"
					/>

					<!-- Message Delete Alert Card -->
					<DiscordAlertConfig
						v-model:alert-enabled="form.discordAlertMessageDeleteEnabled"
						v-model:alert-channel-id="form.discordAlertMessageDeleteChannelId"
						v-model:alert-template="form.discordAlertMessageDeleteTemplate"
						title="Message Delete Alerts"
						description="Send a message to Discord when a chat message is deleted by a moderator."
						scope="discord.alert.message_delete"
						:channels="channels"
						:disabled="!form.isDiscordConnected"
					/>
				</ConfigAccordionGroup>
			</AppSettingsGrid>

			<template #fallback>
				<div class="flex flex-col items-center justify-center gap-2 py-20">
					<Spinner class="size-8 text-primary" />
					<span class="text-sm text-muted-foreground">Loading active configurations...</span>
				</div>
			</template>
		</ClientOnly>

		<!-- Floating save bar -->
		<AppFloatingSaveBar
			:show="isModified"
			:is-saving="isSaving"
			title="Unsaved Discord Alerts"
			description="You have modified Discord alert rules. Save to apply changes."
			save-text="Save Settings"
			saving-text="Saving..."
			discard-text="Discard"
			@save="saveSettings"
			@discard="discardChanges"
		/>
	</AppSettingsPage>
</template>
