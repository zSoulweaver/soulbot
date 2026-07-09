<script setup lang="ts">
import { RefreshCcw } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import DiscordAlertConfig from '~/components/discord/DiscordAlertConfig.vue'

type AlertsSettings = Awaited<ReturnType<typeof import('~~/server/api/admin/discord/alerts.get').default>>

// Non-blocking fetch of settings and guild text channels
const { data: settingsData, refresh: refreshSettings, pending: loading } = useFetch<AlertsSettings>('/api/admin/discord/alerts')
const { data: channelsResponse } = useFetch<{ id: string, name: string }[]>('/api/admin/discord/channels')

const channels = computed(() => channelsResponse.value || [])

useHead({
	title: 'Discord Event Alerts',
})

const form = ref<AlertsSettings>({
	discordAlertFollowEnabled: false,
	discordAlertFollowChannelId: '',
	discordAlertFollowTemplate: '',

	discordAlertSubEnabled: false,
	discordAlertSubChannelId: '',
	discordAlertSubTemplate: '',

	discordAlertGiftEnabled: false,
	discordAlertGiftChannelId: '',
	discordAlertGiftTemplate: '',

	discordAlertCheerEnabled: false,
	discordAlertCheerChannelId: '',
	discordAlertCheerTemplate: '',

	discordAlertRaidEnabled: false,
	discordAlertRaidChannelId: '',
	discordAlertRaidTemplate: '',

	discordAlertLiveEnabled: false,
	discordAlertLiveChannelId: '',
	discordAlertLiveTemplate: '',
	discordAlertLiveRemoveOffline: false,

	discordAlertOfflineEnabled: false,
	discordAlertOfflineChannelId: '',
	discordAlertOfflineTemplate: '',

	isDiscordConnected: false,
})

const isSaving = ref(false)

// Sync values when fetched
watch(settingsData, (newData) => {
	if (newData) {
		form.value = { ...newData }
	}
}, { immediate: true })

const isModified = computed(() => {
	if (!settingsData.value)
		return false
	return (
		form.value.discordAlertFollowEnabled !== settingsData.value.discordAlertFollowEnabled
		|| form.value.discordAlertFollowChannelId !== settingsData.value.discordAlertFollowChannelId
		|| form.value.discordAlertFollowTemplate !== settingsData.value.discordAlertFollowTemplate

		|| form.value.discordAlertSubEnabled !== settingsData.value.discordAlertSubEnabled
		|| form.value.discordAlertSubChannelId !== settingsData.value.discordAlertSubChannelId
		|| form.value.discordAlertSubTemplate !== settingsData.value.discordAlertSubTemplate

		|| form.value.discordAlertGiftEnabled !== settingsData.value.discordAlertGiftEnabled
		|| form.value.discordAlertGiftChannelId !== settingsData.value.discordAlertGiftChannelId
		|| form.value.discordAlertGiftTemplate !== settingsData.value.discordAlertGiftTemplate

		|| form.value.discordAlertCheerEnabled !== settingsData.value.discordAlertCheerEnabled
		|| form.value.discordAlertCheerChannelId !== settingsData.value.discordAlertCheerChannelId
		|| form.value.discordAlertCheerTemplate !== settingsData.value.discordAlertCheerTemplate

		|| form.value.discordAlertRaidEnabled !== settingsData.value.discordAlertRaidEnabled
		|| form.value.discordAlertRaidChannelId !== settingsData.value.discordAlertRaidChannelId
		|| form.value.discordAlertRaidTemplate !== settingsData.value.discordAlertRaidTemplate

		|| form.value.discordAlertLiveEnabled !== settingsData.value.discordAlertLiveEnabled
		|| form.value.discordAlertLiveChannelId !== settingsData.value.discordAlertLiveChannelId
		|| form.value.discordAlertLiveTemplate !== settingsData.value.discordAlertLiveTemplate
		|| form.value.discordAlertLiveRemoveOffline !== settingsData.value.discordAlertLiveRemoveOffline

		|| form.value.discordAlertOfflineEnabled !== settingsData.value.discordAlertOfflineEnabled
		|| form.value.discordAlertOfflineChannelId !== settingsData.value.discordAlertOfflineChannelId
		|| form.value.discordAlertOfflineTemplate !== settingsData.value.discordAlertOfflineTemplate
	)
})

function discardChanges() {
	if (settingsData.value) {
		form.value = { ...settingsData.value }
		toast.info('Discarded unsaved changes')
	}
}

async function saveSettings() {
	if (isSaving.value)
		return

	isSaving.value = true
	try {
		await $fetch('/api/admin/discord/alerts', {
			method: 'PUT',
			body: {
				discordAlertFollowEnabled: form.value.discordAlertFollowEnabled,
				discordAlertFollowChannelId: form.value.discordAlertFollowChannelId,
				discordAlertFollowTemplate: form.value.discordAlertFollowTemplate,

				discordAlertSubEnabled: form.value.discordAlertSubEnabled,
				discordAlertSubChannelId: form.value.discordAlertSubChannelId,
				discordAlertSubTemplate: form.value.discordAlertSubTemplate,

				discordAlertGiftEnabled: form.value.discordAlertGiftEnabled,
				discordAlertGiftChannelId: form.value.discordAlertGiftChannelId,
				discordAlertGiftTemplate: form.value.discordAlertGiftTemplate,

				discordAlertCheerEnabled: form.value.discordAlertCheerEnabled,
				discordAlertCheerChannelId: form.value.discordAlertCheerChannelId,
				discordAlertCheerTemplate: form.value.discordAlertCheerTemplate,

				discordAlertRaidEnabled: form.value.discordAlertRaidEnabled,
				discordAlertRaidChannelId: form.value.discordAlertRaidChannelId,
				discordAlertRaidTemplate: form.value.discordAlertRaidTemplate,

				discordAlertLiveEnabled: form.value.discordAlertLiveEnabled,
				discordAlertLiveChannelId: form.value.discordAlertLiveChannelId,
				discordAlertLiveTemplate: form.value.discordAlertLiveTemplate,
				discordAlertLiveRemoveOffline: form.value.discordAlertLiveRemoveOffline,

				discordAlertOfflineEnabled: form.value.discordAlertOfflineEnabled,
				discordAlertOfflineChannelId: form.value.discordAlertOfflineChannelId,
				discordAlertOfflineTemplate: form.value.discordAlertOfflineTemplate,
			},
		})
		toast.success('Discord alerts configuration updated successfully!')
		await refreshSettings()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to save alerts configuration')
		console.error(err)
	}
	finally {
		isSaving.value = false
	}
}
</script>

<template>
	<AppPageContainer>
		<AppPageHeader
			heading="Discord Event Alerts"
			subheading="Configure real-time text announcements in specific Discord channels triggered by Twitch events."
		>
			<Button variant="ghost" :disabled="loading" @click="refreshSettings">
				<RefreshCcw :class="{ 'animate-spin': loading }" />
			</Button>
		</AppPageHeader>
		<ClientOnly>
			<!-- Loader -->
			<div v-if="loading" class="flex flex-col items-center justify-center gap-2 py-20">
				<Spinner class="size-8 text-primary" />
				<span class="text-sm text-muted-foreground">Loading active configurations...</span>
			</div>

			<!-- Alerts Content -->
			<div v-else class="flex flex-col gap-8">
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
					:variables="['$(sender) (Follower Name)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(channel) (Channel)']"
					:channels="channels"
					:disabled="!form.isDiscordConnected"
				/>

				<Separator />

				<!-- Subscription Alerts Card -->
				<DiscordAlertConfig
					v-model:alert-enabled="form.discordAlertSubEnabled"
					v-model:alert-channel-id="form.discordAlertSubChannelId"
					v-model:alert-template="form.discordAlertSubTemplate"
					title="Subscription Alerts"
					description="Send a message to a Discord channel when a viewer subscribes or resubscribes."
					:variables="['$(sender) (Subscriber Name)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(subTier) (Tier)', '$(channel) (Channel)']"
					:channels="channels"
					:disabled="!form.isDiscordConnected"
				/>

				<Separator />

				<!-- Subscription Gift Alerts Card -->
				<DiscordAlertConfig
					v-model:alert-enabled="form.discordAlertGiftEnabled"
					v-model:alert-channel-id="form.discordAlertGiftChannelId"
					v-model:alert-template="form.discordAlertGiftTemplate"
					title="Subscription Gift Alerts"
					description="Send a message to a Discord channel when a viewer gifts subs to the community."
					:variables="['$(sender) (Gifter Name)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(giftCount) (Gift Count)', '$(channel) (Channel)']"
					:channels="channels"
					:disabled="!form.isDiscordConnected"
				/>

				<Separator />

				<!-- Cheer Alerts Card -->
				<DiscordAlertConfig
					v-model:alert-enabled="form.discordAlertCheerEnabled"
					v-model:alert-channel-id="form.discordAlertCheerChannelId"
					v-model:alert-template="form.discordAlertCheerTemplate"
					title="Cheer Alerts"
					description="Send a message to a Discord channel when a user cheers bits on your stream."
					:variables="['$(sender) (Cheerer Name)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(bitsCount) (Bits)', '$(cheerMessage) (Message)', '$(channel) (Channel)']"
					:channels="channels"
					:disabled="!form.isDiscordConnected"
				/>

				<Separator />

				<!-- Live Announcement Alerts Card -->
				<DiscordAlertConfig
					v-model:alert-enabled="form.discordAlertLiveEnabled"
					v-model:alert-channel-id="form.discordAlertLiveChannelId"
					v-model:alert-template="form.discordAlertLiveTemplate"
					title="Live Stream Alerts"
					description="Send a rich embed message with Category, Stream Title, and Preview Image to Discord when your stream goes live."
					:variables="['$(sender) (Broadcaster Name)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(channel) (Channel)']"
					:channels="channels"
					:disabled="!form.isDiscordConnected"
				>
					<template #extra-options>
						<SettingsGroupItem v-if="form.discordAlertLiveEnabled && form.isDiscordConnected">
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

				<Separator />

				<!-- Offline Announcement Alerts Card -->
				<DiscordAlertConfig
					v-model:alert-enabled="form.discordAlertOfflineEnabled"
					v-model:alert-channel-id="form.discordAlertOfflineChannelId"
					v-model:alert-template="form.discordAlertOfflineTemplate"
					title="Stream Offline Alerts"
					description="Send an announcement message to Discord when your stream goes offline."
					:variables="['$(sender) (Broadcaster Name)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(channel) (Channel)']"
					:channels="channels"
					:disabled="!form.isDiscordConnected"
				/>

				<Separator />

				<!-- Raid Announcement Alerts Card -->
				<DiscordAlertConfig
					v-model:alert-enabled="form.discordAlertRaidEnabled"
					v-model:alert-channel-id="form.discordAlertRaidChannelId"
					v-model:alert-template="form.discordAlertRaidTemplate"
					title="Raid Alerts"
					description="Send an announcement message to Discord when another channel raids you."
					:variables="['$(sender) (Raider Display Name)', '$(sender.name) (Username)', '$(sender.id) (ID)', '$(raidSize) (Viewer Count)', '$(channel) (Channel)']"
					:channels="channels"
					:disabled="!form.isDiscordConnected"
				/>
			</div>

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
	</AppPageContainer>
</template>
