<script setup lang="ts">
import { RefreshCcw, Shield } from '@lucide/vue'
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

type RolesSettings = Awaited<ReturnType<typeof import('~~/server/api/admin/discord/roles.get').default>>
type GuildRoles = Awaited<ReturnType<typeof import('~~/server/api/admin/discord/guild-roles.get').default>>

// Non-blocking fetch of settings and roles list
const { data: settingsData, refresh: refreshSettings, pending: loading } = useFetch<RolesSettings>('/api/admin/discord/roles')
const { data: guildRolesResponse } = useFetch<GuildRoles>('/api/admin/discord/guild-roles')

const guildRoles = computed(() => guildRolesResponse.value || [])

const form = ref<RolesSettings>({
	discordRolesAutoBestowEnabled: false,
	discordRolesAutoBestowRoles: '',
	isDiscordConnected: false,
})

const isSaving = ref(false)

// Sync values when fetched
watch(settingsData, (newData) => {
	if (newData) {
		form.value = { ...newData }
	}
}, { immediate: true })

const activeRoleIds = computed(() => {
	return form.value.discordRolesAutoBestowRoles
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

const isModified = computed(() => {
	if (!settingsData.value)
		return false
	return (
		form.value.discordRolesAutoBestowEnabled !== settingsData.value.discordRolesAutoBestowEnabled
		|| form.value.discordRolesAutoBestowRoles !== settingsData.value.discordRolesAutoBestowRoles
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
		await $fetch('/api/admin/discord/roles', {
			method: 'PUT',
			body: {
				discordRolesAutoBestowEnabled: form.value.discordRolesAutoBestowEnabled,
				discordRolesAutoBestowRoles: form.value.discordRolesAutoBestowRoles,
			},
		})
		toast.success('Discord role bestow settings updated successfully!')
		await refreshSettings()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to save roles configuration')
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
			heading="Discord Role Bestowing"
			subheading="Automatically assign roles to new users when they join your Discord server."
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

			<!-- Roles Content -->
			<div v-else class="flex flex-col gap-6">
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
						Ensure Discord is enabled and configured correctly in <NuxtLink to="/admin/discord/settings" class="font-semibold underline">
							Settings
						</NuxtLink>.
					</AlertDescription>
				</Alert>

				<!-- Toggle settings group -->
				<SettingsGroup>
					<SettingsGroupItem>
						<SettingsGroupContent>
							<SettingsGroupLabel>Enable Auto-Bestow on Join</SettingsGroupLabel>
							<SettingsGroupDescription>
								Automatically assign configured roles to new users when they join the Discord server.
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<SettingsGroupAction>
							<Switch
								v-model:model-value="form.discordRolesAutoBestowEnabled"
								:disabled="!form.isDiscordConnected"
							/>
						</SettingsGroupAction>
					</SettingsGroupItem>
				</SettingsGroup>

				<!-- Dynamic Roles Select Group -->
				<div v-if="guildRoles.length > 0" class="flex flex-col gap-3">
					<div class="flex items-center gap-2 px-1 text-sm font-semibold text-muted-foreground">
						<Shield class="size-4" />
						<span>Select Roles to Bestow</span>
					</div>
					<SettingsGroup>
						<SettingsGroupItem v-for="role in guildRoles" :key="role.id">
							<SettingsGroupContent>
								<SettingsGroupLabel class="flex items-center gap-2">
									<span
										v-if="role.color"
										class="size-2.5 shrink-0 rounded-full"
										:style="{ backgroundColor: role.color }"
									/>
									<span>{{ role.name }}</span>
									<Badge v-if="!role.isManageable" variant="destructive" class="ml-2 h-4 px-1.5 py-0 text-[10px] font-bold tracking-wider uppercase select-none">
										Locked
									</Badge>
								</SettingsGroupLabel>
							</SettingsGroupContent>
							<SettingsGroupAction>
								<Switch
									:model-value="isRoleSelected(role.id)"
									:disabled="!form.discordRolesAutoBestowEnabled || !form.isDiscordConnected || !role.isManageable"
									@update:model-value="toggleRole(role.id)"
								/>
							</SettingsGroupAction>
						</SettingsGroupItem>
					</SettingsGroup>
				</div>
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
			title="Unsaved Role Settings"
			description="You have modified Discord role bestowing preferences. Save to apply changes."
			save-text="Save Settings"
			saving-text="Saving..."
			discard-text="Discard"
			@save="saveSettings"
			@discard="discardChanges"
		/>
	</AppPageContainer>
</template>
