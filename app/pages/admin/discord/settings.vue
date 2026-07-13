<script setup lang="ts">
import { RefreshCcw } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import {
	SettingsGroup,
	SettingsGroupAction,
	SettingsGroupContent,
	SettingsGroupDescription,
	SettingsGroupItem,
	SettingsGroupLabel,
} from '~/components/ui/settings-group'
import { SettingsHeading } from '~/components/ui/settings-heading'

type DiscordSettings = Awaited<ReturnType<typeof import('~~/server/api/admin/discord/settings.get').default>>

const { data: settingsData, refresh: refreshSettings, pending: loading } = useFetch<DiscordSettings>('/api/admin/discord/settings')
const { data: guildsResponse, refresh: refreshGuilds } = useFetch<{ id: string, name: string }[]>('/api/admin/discord/guilds')

const guilds = computed(() => guildsResponse.value || [])

useHead({
	title: 'Discord Settings',
})

const form = ref<DiscordSettings>({
	discordEnabled: false,
	discordGuildId: '',
	isTokenConfigured: false,
	isDiscordConnected: false,
})

const isSaving = ref(false)

// Sync form values on fetch
watch(settingsData, (newData) => {
	if (newData) {
		form.value = { ...newData }
	}
}, { immediate: true })

const isModified = computed(() => {
	if (!settingsData.value)
		return false
	return (
		form.value.discordEnabled !== settingsData.value.discordEnabled
		|| form.value.discordGuildId !== settingsData.value.discordGuildId
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
		await $fetch('/api/admin/discord/settings', {
			method: 'PUT',
			body: {
				discordEnabled: form.value.discordEnabled,
				discordGuildId: form.value.discordGuildId,
			},
		})
		toast.success('Discord settings updated successfully!')
		await refreshSettings()
		await refreshGuilds()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to save settings')
		console.error(err)
	}
	finally {
		isSaving.value = false
	}
}

async function refreshAll() {
	await Promise.all([
		refreshSettings(),
		refreshGuilds(),
	])
}
</script>

<template>
	<AppSettingsPage
		heading="Discord Settings"
		subheading="Configure Discord bot client credentials and toggle integration status."
	>
		<template #header-actions>
			<Button variant="ghost" :disabled="loading" @click="refreshAll">
				<RefreshCcw :class="{ 'animate-spin': loading }" />
			</Button>
		</template>

		<ClientOnly>
			<!-- Loader -->
			<div v-if="loading" class="flex flex-col items-center justify-center gap-2 py-20">
				<Spinner class="size-8 text-primary" />
				<span class="text-sm text-muted-foreground">Loading active configurations...</span>
			</div>

			<!-- Settings Content -->
			<AppSettingsGrid v-else>
				<!-- Warning Alert if Bot Token is not configured in environment -->
				<Alert v-if="!form.isTokenConfigured" variant="destructive" class="border-destructive/50 bg-destructive/10">
					<AlertTitle class="font-bold">
						DISCORD_BOT_TOKEN Missing
					</AlertTitle>
					<AlertDescription class="text-sm/relaxed">
						The <code>DISCORD_BOT_TOKEN</code> environment variable is not defined in your <code>.env</code> file.
						Please configure this secret on your host environment and restart the server to edit settings.
					</AlertDescription>
				</Alert>

				<!-- Warning Alert if Bot is connected but not in any servers -->
				<Alert v-else-if="form.isDiscordConnected && guilds.length === 0" variant="warning" class="border-amber-500/50 bg-amber-500/10">
					<AlertTitle
						class="
							font-bold text-amber-600
							dark:text-amber-400
						"
					>
						No Servers Found
					</AlertTitle>
					<AlertDescription
						class="
							text-sm/relaxed text-amber-600/90
							dark:text-amber-400/90
						"
					>
						The bot is connected to Discord but has not been invited to any servers (guilds).
						Please use your Discord Bot OAuth2 invite link to add the bot to a server, then click refresh.
					</AlertDescription>
				</Alert>

				<SettingsHeading>
					Server Configuration
				</SettingsHeading>

				<SettingsGroup>
					<!-- Target Discord Server Selection -->
					<SettingsGroupItem>
						<SettingsGroupContent>
							<SettingsGroupLabel>Target Discord Server</SettingsGroupLabel>
							<SettingsGroupDescription>
								Select the server (guild) the bot will mirror alerts to and manage roles in.
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction>
							<Select
								v-if="form.isDiscordConnected && guilds.length > 0"
								v-model="form.discordGuildId"
								:disabled="!form.isTokenConfigured"
							>
								<SelectTrigger id="discord-guild-id" class="w-full">
									<SelectValue placeholder="Select a Discord Server..." />
								</SelectTrigger>
								<SelectContent>
									<SelectItem
										v-for="g in guilds"
										:key="g.id"
										:value="g.id"
									>
										{{ g.name }} ({{ g.id }})
									</SelectItem>
								</SelectContent>
							</Select>

							<!-- Empty State / Non-Connected Fallback -->
							<div v-else class="w-full">
								<Select disabled>
									<SelectTrigger class="w-full">
										<SelectValue placeholder="No servers available (Bot offline or not invited)" />
									</SelectTrigger>
								</Select>
							</div>
						</SettingsGroupAction>
					</SettingsGroupItem>

					<!-- Discord Enabled Toggle -->
					<SettingsGroupItem>
						<SettingsGroupContent>
							<SettingsGroupLabel>Enable Discord Integration</SettingsGroupLabel>
							<SettingsGroupDescription>
								Connect to Discord and enable text alerts and auto-bestowing roles.
								<i>Requires a server to be selected above.</i>
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction>
							<Switch
								v-model:model-value="form.discordEnabled"
								:disabled="!form.isTokenConfigured || !form.discordGuildId"
							/>
						</SettingsGroupAction>
					</SettingsGroupItem>
				</SettingsGroup>
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
			title="Unsaved Discord Settings"
			description="You have modified Discord credentials. Save to apply changes."
			save-text="Save Settings"
			saving-text="Saving..."
			discard-text="Discard"
			@save="saveSettings"
			@discard="discardChanges"
		/>
	</AppSettingsPage>
</template>
