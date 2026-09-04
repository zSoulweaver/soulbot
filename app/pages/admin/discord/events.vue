<script setup lang="ts">
import { computed } from 'vue'
import DiscordAlertConfig from '~/components/discord/DiscordAlertConfig.vue'
import { ConfigAccordionGroup } from '~/components/ui/config-accordion'
import {
	SettingsGroupAction,
	SettingsGroupContent,
	SettingsGroupDescription,
	SettingsGroupItem,
	SettingsGroupLabel,
} from '~/components/ui/settings-group'

type EventsSettings = Awaited<ReturnType<typeof import('~~/server/api/admin/discord/events.get').default>>

const {
	form,
	initialData: settingsData,
	isModified,
	isSaving,
	loading,
	refresh: refreshSettings,
	discard: discardChanges,
	save: saveSettings,
} = useSettingsForm<EventsSettings>('/api/admin/discord/events', {
	ignoreKeys: ['isDiscordConnected'],
	successMessage: 'Discord native event settings updated successfully!',
})

const { data: channelsResponse } = useFetch<{ id: string, name: string }[]>('/api/admin/discord/channels')
const { data: guildRolesResponse } = useFetch<{ id: string, name: string, color?: string, isManageable: boolean }[]>('/api/admin/discord/guild-roles')

const channels = computed(() => channelsResponse.value || [])
const guildRoles = computed(() => guildRolesResponse.value || [])

useHead({
	title: 'Discord Native Events',
})

const activeRoleIds = computed(() => {
	return (form.value.discordRolesAutoBestowRoles || '')
		.split(',')
		.map(id => id.trim())
		.filter(id => !!id)
})

function isRoleSelected(roleId: string): boolean {
	return activeRoleIds.value.includes(roleId)
}

function toggleRole(roleId: string) {
	const current = [...activeRoleIds.value]
	const idx = current.indexOf(roleId)
	if (idx > -1) {
		current.splice(idx, 1)
	}
	else {
		current.push(roleId)
	}
	form.value.discordRolesAutoBestowRoles = current.join(',')
}
</script>

<template>
	<AppSettingsPage
		heading="Discord Native Events"
		subheading="Configure automated chat alerts and role assignments triggered by native Discord server events."
	>
		<template #header-actions>
			<AppRefreshButton :loading="loading" @click="refreshSettings" />
		</template>

		<ClientOnly>
			<!-- Full page loader for settings -->
			<div v-if="loading || !settingsData" class="flex flex-col items-center justify-center gap-2 py-20">
				<Spinner class="size-8 text-primary" />
				<span class="text-sm text-muted-foreground">Loading active configurations...</span>
			</div>

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

					<!-- Member Join Event Card -->
					<DiscordAlertConfig
						v-model:alert-enabled="form.discordEventJoinEnabled"
						v-model:alert-channel-id="form.discordEventJoinChannelId"
						v-model:alert-template="form.discordEventJoinTemplate"
						title="Member Join Alert & Auto-Roles"
						description="Trigger welcome messages and automatically assign server roles when a user joins."
						scope="discord.events.join"
						:channels="channels"
						:disabled="!form.isDiscordConnected"
					>
						<template #extra-options>
							<SettingsGroupItem class="sm:flex-col sm:items-start">
								<div class="flex w-full items-center justify-between">
									<SettingsGroupContent>
										<SettingsGroupLabel>Auto-Bestow Roles on Join</SettingsGroupLabel>
										<SettingsGroupDescription>
											Automatically assign selected roles to new members when they join the server.
										</SettingsGroupDescription>
									</SettingsGroupContent>
									<SettingsGroupAction>
										<Switch
											v-model:model-value="form.discordRolesAutoBestowEnabled"
											:disabled="!form.isDiscordConnected"
										/>
									</SettingsGroupAction>
								</div>

								<!-- Role Selection Grid -->
								<div v-if="form.discordRolesAutoBestowEnabled" class="flex w-full flex-col gap-2 pt-2">
									<div class="text-xs font-semibold text-muted-foreground">
										Select roles to bestow automatically:
									</div>
									<div v-if="guildRoles.length > 0" class="flex flex-wrap gap-2">
										<Badge
											v-for="role in guildRoles"
											:key="role.id"
											:variant="isRoleSelected(role.id) ? 'default' : 'outline'"
											class="cursor-pointer px-3 py-1.5 transition-all select-none"
											@click="toggleRole(role.id)"
										>
											<span
												v-if="role.color"
												class="mr-1.5 inline-block size-2 rounded-full"
												:style="{ backgroundColor: role.color }"
											/>
											{{ role.name }}
										</Badge>
									</div>
									<p v-else class="text-xs text-muted-foreground italic">
										No roles found or Discord server not connected.
									</p>
								</div>
							</SettingsGroupItem>
						</template>
					</DiscordAlertConfig>

					<!-- Member Leave Event Card -->
					<DiscordAlertConfig
						v-model:alert-enabled="form.discordEventLeaveEnabled"
						v-model:alert-channel-id="form.discordEventLeaveChannelId"
						v-model:alert-template="form.discordEventLeaveTemplate"
						title="Member Leave Alert"
						description="Send a message to a text channel when a member leaves your Discord server."
						scope="discord.events.leave"
						:channels="channels"
						:disabled="!form.isDiscordConnected"
					/>
				</ConfigAccordionGroup>
			</AppSettingsGrid>
		</ClientOnly>

		<AppFloatingSaveBar
			:show="isModified"
			:loading="isSaving"
			@save="saveSettings"
			@reset="discardChanges"
		/>
	</AppSettingsPage>
</template>
