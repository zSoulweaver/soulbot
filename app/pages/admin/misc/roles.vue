<script setup lang="ts">
import { Search } from '@lucide/vue'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { Switch } from '~/components/ui/switch'

useRequireUserRole(['caster'])

useHead({
	title: 'Management Roles',
})

// Fetch moderators list
const { data: mods, refresh, pending: loading } = useFetch<any[]>('/api/admin/roles')

// Search filter state
const searchFilter = ref('')

const filteredMods = computed(() => {
	if (!mods.value)
		return []
	const filter = searchFilter.value.trim().toLowerCase()
	if (!filter)
		return mods.value

	return mods.value.filter(mod =>
		mod.username.toLowerCase().includes(filter)
		|| mod.displayName.toLowerCase().includes(filter),
	)
})

// Toggle Admin dialog states
const isConfirmOpen = ref(false)
const targetUser = ref<any | null>(null)
const targetAdminState = ref(false)
const saving = ref(false)

function toggleAdmin(mod: any) {
	targetUser.value = mod
	targetAdminState.value = !mod.isAdmin
	isConfirmOpen.value = true
}

function cancelToggle() {
	isConfirmOpen.value = false
	targetUser.value = null
}

async function confirmToggle() {
	if (!targetUser.value)
		return

	saving.value = true
	try {
		await $fetch('/api/admin/roles', {
			method: 'PUT',
			body: {
				userId: targetUser.value.id,
				username: targetUser.value.username,
				displayName: targetUser.value.displayName,
				isAdmin: targetAdminState.value,
			},
		})

		const action = targetAdminState.value ? 'granted' : 'revoked'
		toast.success(`Administrator permissions ${action} for @${targetUser.value.displayName}!`)
		await refresh()
	}
	catch (error: any) {
		toast.error(error.data?.statusMessage || 'Failed to update administrator role.')
	}
	finally {
		saving.value = false
		isConfirmOpen.value = false
		targetUser.value = null
	}
}
</script>

<template>
	<AppSettingsPage
		heading="Management Roles"
		subheading="Delegate administrative permissions to trusted moderators. Admin users hold full bot access but cannot manage other roles."
	>
		<template #header-actions>
			<AppRefreshButton :loading="loading" @click="refresh" />
		</template>

		<div class="flex flex-col gap-4">
			<!-- Search and count row -->
			<div
				class="
					flex flex-col gap-4
					sm:flex-row sm:items-center sm:justify-between
				"
			>
				<InputGroup class="w-full max-w-sm">
					<InputGroupAddon>
						<Search class="text-muted-foreground" />
					</InputGroupAddon>
					<InputGroupInput
						v-model="searchFilter"
						type="search"
						placeholder="Search moderators..."
					/>
				</InputGroup>
				<div class="text-xs text-muted-foreground select-none">
					Showing {{ filteredMods.length }} of {{ mods?.length || 0 }} moderators
				</div>
			</div>

			<!-- Moderator list table -->
			<div class="relative overflow-hidden rounded-lg border bg-card/25 backdrop-blur-xs">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>User</TableHead>
							<TableHead>Panel Role</TableHead>
							<TableHead class="text-center">
								Admin Privilege
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody class="divide-y divide-border/60">
						<TableRow v-if="loading" class="text-center">
							<TableCell colspan="3" class="py-12 text-muted-foreground">
								Loading moderators...
							</TableCell>
						</TableRow>
						<TableRow v-else-if="filteredMods.length === 0" class="text-center">
							<TableCell colspan="3" class="py-12 text-muted-foreground">
								No moderators found.
							</TableCell>
						</TableRow>
						<template v-for="mod in filteredMods" v-else :key="mod.id">
							<TableRow
								class="
									transition-colors
									hover:bg-muted/40
								"
							>
								<TableCell class="py-3">
									<div class="flex items-center gap-3">
										<Avatar class="size-8">
											<AvatarImage :src="mod.image || ''" :alt="mod.displayName" />
											<AvatarFallback>{{ mod.displayName.charAt(0).toUpperCase() }}</AvatarFallback>
										</Avatar>
										<div class="flex flex-col gap-0.5">
											<span class="text-sm font-medium text-foreground">{{ mod.displayName }}</span>
											<span class="text-xs text-muted-foreground">@{{ mod.username }}</span>
										</div>
									</div>
								</TableCell>
								<TableCell>
									<Badge
										v-if="mod.isAdmin" variant="default" class="
											bg-purple-600 px-1.5 py-0 text-[10px] font-bold tracking-wider uppercase select-none
											hover:bg-purple-700
										"
									>
										Administrator
									</Badge>
									<Badge
										v-else variant="default" class="
											bg-green-600 px-1.5 py-0 text-[10px] font-bold tracking-wider uppercase select-none
											hover:bg-green-700
										"
									>
										Moderator
									</Badge>
								</TableCell>
								<TableCell class="text-center">
									<Switch
										:model-value="mod.isAdmin"
										:disabled="saving"
										@update:model-value="toggleAdmin(mod)"
									/>
								</TableCell>
							</TableRow>
						</template>
					</TableBody>
				</Table>
			</div>
		</div>

		<!-- Dialog for granting/revoking admin privilege -->
		<AlertDialog :open="isConfirmOpen" @update:open="isConfirmOpen = $event">
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle v-if="targetAdminState">
						Grant Administrator Permissions?
					</AlertDialogTitle>
					<AlertDialogTitle v-else>
						Revoke Administrator Permissions?
					</AlertDialogTitle>
					<AlertDialogDescription>
						<template v-if="targetAdminState">
							Are you sure you want to grant administrator permissions to
							<span class="font-bold text-foreground">@{{ targetUser?.displayName }}</span>?
							This user will have the exact same control over the bot settings, integrations, and database as the caster.
							<div
								class="
									mt-3 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive
									dark:bg-destructive/15
								"
							>
								<strong>Warning:</strong> Only grant this role to your most trusted moderators. They will be able to modify all bot settings and control integrations.
							</div>
						</template>
						<template v-else>
							Are you sure you want to revoke administrator permissions for
							<span class="font-bold text-foreground">@{{ targetUser?.displayName }}</span>?
							They will return to a standard moderator role.
						</template>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel @click="cancelToggle">
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction
						@click="confirmToggle"
					>
						{{ targetAdminState ? 'Grant Permissions' : 'Revoke Permissions' }}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	</AppSettingsPage>
</template>
