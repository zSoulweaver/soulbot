<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import {
	SettingsGroup,
	SettingsGroupAction,
	SettingsGroupContent,
	SettingsGroupDescription,
	SettingsGroupItem,
	SettingsGroupLabel,
} from '~/components/ui/settings-group'
import { SettingsHeading } from '~/components/ui/settings-heading'
import { Spinner } from '~/components/ui/spinner'
import { Switch } from '~/components/ui/switch'

interface BotSettings {
	chatMode: 'normal' | 'action'
	muted: boolean
}

useHead({
	title: 'Bot Settings',
})

const {
	form,
	isModified,
	isSaving,
	loading,
	refresh: refreshSettings,
	discard: discardChanges,
	save: saveSettings,
} = useSettingsForm<BotSettings>('/api/bot/settings', {
	successMessage: 'Bot settings saved successfully!',
})
</script>

<template>
	<AppSettingsPage
		heading="Bot Settings"
		subheading="Configure general Twitch chat behavior, response style, and mute settings."
	>
		<template #header-actions>
			<AppRefreshButton :loading="loading" @click="refreshSettings" />
		</template>
		<!-- Loading state -->
		<div v-if="loading" class="flex flex-col items-center justify-center gap-2 py-20">
			<Spinner class="size-8 text-primary" />
			<span class="text-sm text-muted-foreground">Loading bot configurations...</span>
		</div>

		<AppSettingsGrid v-else>
			<!-- Settings Editor Panel -->
			<div class="flex flex-col gap-6">
				<!-- Section 1: Chat Output Style & Mute Side-by-Side -->
				<AppSettingsSection>
					<SettingsHeading>
						Chat Output
					</SettingsHeading>

					<SettingsGroup>
						<SettingsGroupItem>
							<SettingsGroupContent>
								<SettingsGroupLabel>Twitch Chat Mode</SettingsGroupLabel>
								<SettingsGroupDescription>
									Action Mode formats all bot responses in italics using Twitch's /me IRC action format.
								</SettingsGroupDescription>
							</SettingsGroupContent>
							<SettingsGroupAction>
								<Select id="chatMode" v-model="form.chatMode">
									<SelectTrigger class="w-full">
										<SelectValue placeholder="Select chat mode" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="action">
											Action Mode (/me)
										</SelectItem>
										<SelectItem value="normal">
											Normal Chat Mode
										</SelectItem>
									</SelectContent>
								</Select>
							</SettingsGroupAction>
						</SettingsGroupItem>

						<SettingsGroupItem>
							<SettingsGroupContent>
								<SettingsGroupLabel>Mute Twitch Chat Messages</SettingsGroupLabel>
								<SettingsGroupDescription>
									Suppress all outbound Twitch chat replies. The bot will still run actions in the background.
								</SettingsGroupDescription>
							</SettingsGroupContent>
							<SettingsGroupAction>
								<Switch v-model:model-value="form.muted" />
							</SettingsGroupAction>
						</SettingsGroupItem>
					</SettingsGroup>
				</AppSettingsSection>

				<!-- Warning Alert -->
				<Alert v-if="form.muted" variant="warning">
					<AlertDescription>
						Warning: When muted, viewers will not see any confirmation replies or notifications in your channel chat, even if they successfully trigger points or gambling commands.
					</AlertDescription>
				</Alert>
			</div>
		</AppSettingsGrid>

		<AppFloatingSaveBar
			:show="isModified"
			:is-saving="isSaving"
			title="Unsaved Bot Settings"
			description="You have modified general bot configurations. Save to apply changes immediately."
			save-text="Save Settings"
			saving-text="Saving Settings..."
			discard-text="Discard Changes"
			@save="saveSettings"
			@discard="discardChanges"
		/>
	</AppSettingsPage>
</template>
