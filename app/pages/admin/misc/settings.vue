<script setup lang="ts">
import { MessageSquare, RefreshCcw } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import {
	SettingsGroup,
	SettingsGroupAction,
	SettingsGroupContent,
	SettingsGroupDescription,
	SettingsGroupItem,
	SettingsGroupLabel,
} from '~/components/ui/settings-group'
import { Spinner } from '~/components/ui/spinner'
import { Switch } from '~/components/ui/switch'

interface BotSettings {
	chatMode: 'normal' | 'action'
	muted: boolean
}

const { data: settingsData, refresh: refreshSettings, pending: loading } = useFetch<BotSettings>('/api/bot/settings')

useHead({
	title: 'Bot Settings',
})

const form = ref<BotSettings>({
	chatMode: 'action',
	muted: false,
})

const isSaving = ref(false)

watch(settingsData, (newData) => {
	if (newData) {
		form.value = { ...newData }
	}
}, { immediate: true })

const isModified = computed(() => {
	if (!settingsData.value)
		return false
	return (
		form.value.chatMode !== settingsData.value.chatMode
		|| form.value.muted !== settingsData.value.muted
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
		await $fetch('/api/bot/settings', {
			method: 'PUT',
			body: {
				chatMode: form.value.chatMode,
				muted: form.value.muted,
			},
		})
		toast.success('Bot settings saved successfully!')
		await refreshSettings()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to save settings')
	}
	finally {
		isSaving.value = false
	}
}
</script>

<template>
	<div>
		<AppPageHeader
			heading="Bot Settings"
			subheading="Configure general Twitch chat behavior, response style, and mute settings."
		>
			<Button variant="ghost" :disabled="loading" @click="refreshSettings">
				<RefreshCcw :class="{ 'animate-spin': loading }" />
			</Button>
		</AppPageHeader>

		<AppPageContainer>
			<!-- Loading state -->
			<div v-if="loading" class="flex flex-col items-center justify-center gap-2 py-20">
				<Spinner class="size-8 text-primary" />
				<span class="text-sm text-muted-foreground">Loading bot configurations...</span>
			</div>

			<div
				v-else
				class="max-w-5xl"
			>
				<!-- Settings Editor Panel -->
				<div class="flex flex-col gap-6">
					<!-- Section 1: Chat Output Style & Mute Side-by-Side -->
					<div class="flex flex-col gap-4">
						<h3 class="flex items-center gap-2 text-lg font-semibold">
							<MessageSquare class="size-5 text-muted-foreground" />
							Chat Output
						</h3>
						<FieldGroup
							class="grid grid-cols-1 gap-6"
						>
							<!-- Right column: Mute Switch in SettingsGroup -->
							<Field>
								<SettingsGroup>
									<SettingsGroupItem class="border-0">
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

									<SettingsGroupItem class="border-0">
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
							</Field>
						</FieldGroup>
					</div>

					<!-- Warning Alert -->
					<Alert v-if="form.muted" variant="warning">
						<AlertDescription>
							Warning: When muted, viewers will not see any confirmation replies or notifications in your channel chat, even if they successfully trigger points or gambling commands.
						</AlertDescription>
					</Alert>
				</div>
			</div>

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
		</AppPageContainer>
	</div>
</template>
