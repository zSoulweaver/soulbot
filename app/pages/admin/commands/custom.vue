<script setup lang="ts">
import { Plus, Search, Settings, Trash2 } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import CustomCommandEditSheet from '~/components/commands/CustomCommandEditSheet.vue'

// Fetch custom commands
const { data: customCommandsList, refresh: refreshCustomCommands, pending: loading } = await useFetch<any[]>('/api/commands/custom')

// Search & Filter state
const searchFilter = ref('')

const filteredCustomCommands = computed(() => {
	if (!customCommandsList.value)
		return []
	const filter = searchFilter.value.trim().toLowerCase()
	if (!filter)
		return customCommandsList.value

	return customCommandsList.value.filter(cmd =>
		cmd.trigger.toLowerCase().includes(filter)
		|| (cmd.description && cmd.description.toLowerCase().includes(filter))
		|| cmd.response.toLowerCase().includes(filter),
	)
})

// Edit / Add sheet states
const isSheetOpen = ref(false)
const selectedCommand = ref<any | null>(null)

// Delete confirmation dialog states
const isDeleteDialogOpen = ref(false)
const commandToDelete = ref<any | null>(null)

function openCreateSheet() {
	selectedCommand.value = null
	isSheetOpen.value = true
}

function openEditSheet(command: any) {
	selectedCommand.value = command
	isSheetOpen.value = true
}

// Inline toggle enabled switch
async function toggleCommandActive(command: any) {
	try {
		await $fetch('/api/commands/custom/save', {
			method: 'PUT',
			body: {
				id: command.id,
				trigger: command.trigger,
				response: command.response,
				description: command.description,
				enabled: command.enabled,
				cost: command.cost,
				globalCooldown: command.globalCooldown,
				userCooldown: command.userCooldown,
				permission: command.permission,
			},
		})
		toast.success(`Custom command '!${command.trigger}' has been ${command.enabled ? 'enabled' : 'disabled'}!`)
		await refreshCustomCommands()
	}
	catch (error: any) {
		toast.error(error.data?.statusMessage || 'Failed to update custom command state.')
		// Revert checkbox state on error
		command.enabled = !command.enabled
	}
}

// Trigger custom delete confirmation dialog
function deleteCommand(command: any) {
	commandToDelete.value = command
	isDeleteDialogOpen.value = true
}

// Perform active command deletion callback
async function confirmDelete() {
	if (!commandToDelete.value)
		return

	const command = commandToDelete.value
	try {
		await $fetch('/api/commands/custom', {
			method: 'DELETE',
			body: { id: command.id },
		})
		toast.success(`Custom command '!${command.trigger}' deleted successfully.`)
		await refreshCustomCommands()
	}
	catch (error: any) {
		toast.error(error.data?.statusMessage || 'Failed to delete custom command.')
	}
	finally {
		isDeleteDialogOpen.value = false
		commandToDelete.value = null
	}
}
</script>

<template>
	<AppPageContainer>
		<AppPageHeader
			heading="Custom Commands"
			subheading="Construct dynamic chat commands using variables like sender, touser, and database-backed persistent counters."
		>
			<div class="flex items-center gap-2">
				<Button variant="outline" :disabled="loading" @click="refreshCustomCommands">
					Refresh List
				</Button>
				<Button @click="openCreateSheet">
					<Plus data-icon="inline-start" />
					Add Command
				</Button>
			</div>
		</AppPageHeader>

		<!-- Search Bar and Count Row -->
		<div class="mb-2 flex flex-row items-center justify-between gap-4">
			<!-- Search filter group input -->
			<div class="relative w-full max-w-sm">
				<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					v-model="searchFilter"
					placeholder="Search custom commands..."
					class="pl-9"
				/>
			</div>
			<div class="text-xs text-muted-foreground select-none">
				Showing {{ filteredCustomCommands.length }} of {{ customCommandsList?.length || 0 }} custom commands
			</div>
		</div>

		<!-- Custom Commands Table Card -->
		<Card>
			<CardHeader>
				<CardTitle>Custom Commands Directory</CardTitle>
				<CardDescription>Moderator-configured commands evaluated at runtime dynamically by the Twitch bot.</CardDescription>
			</CardHeader>
			<CardContent class="p-0">
				<div class="relative overflow-x-auto">
					<table class="w-full text-left">
						<thead class="border-b border-border bg-muted/50 text-xs text-muted-foreground uppercase select-none">
							<tr>
								<th class="px-6 py-4">
									Command Trigger
								</th>
								<th class="px-6 py-4">
									Response Template
								</th>
								<th class="px-6 py-4">
									Permission
								</th>
								<th class="px-6 py-4">
									Points Cost
								</th>
								<th class="px-6 py-4">
									Cooldowns
								</th>
								<th class="px-6 py-4 text-center">
									Status
								</th>
								<th class="px-6 py-4 text-right">
									Actions
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border">
							<tr v-if="loading" class="text-center">
								<td colspan="7" class="py-10 text-muted-foreground">
									Loading custom commands...
								</td>
							</tr>
							<tr v-else-if="filteredCustomCommands.length === 0" class="text-center">
								<td colspan="7" class="pt-6 text-muted-foreground">
									No custom commands found. Click "Add Command" to create one!
								</td>
							</tr>
							<template v-for="command in filteredCustomCommands" v-else :key="command.id">
								<tr
									class="
										transition-colors
										hover:bg-muted/30
									"
									:class="{ 'opacity-40': !command.enabled }"
								>
									<!-- Trigger Name & Description -->
									<td class="px-6 py-3">
										<div class="flex flex-col gap-0.5">
											<span class="font-bold whitespace-nowrap text-primary">
												!{{ command.trigger }}
											</span>
											<span v-if="command.description" class="line-clamp-1 max-w-50 text-xs text-muted-foreground">
												{{ command.description }}
											</span>
										</div>
									</td>

									<!-- Response Message Template -->
									<td class="px-6 py-3 font-mono text-xs">
										<div class="line-clamp-2 max-w-xs break-all text-muted-foreground" :title="command.response">
											{{ command.response }}
										</div>
									</td>

									<!-- Permission Badge -->
									<td class="px-6 py-4">
										<CommandPermissionBadge :permission="command.permission" />
									</td>

									<!-- Points Cost -->
									<td class="px-6 py-4">
										<CommandPointsBadge :cost="command.cost" />
									</td>

									<!-- Cooldowns -->
									<td class="px-6 py-4">
										<CommandCooldownsDisplay :global="command.globalCooldown" :user="command.userCooldown" />
									</td>

									<!-- Active Status Toggle -->
									<td class="px-6 py-4 text-center">
										<Switch v-model:model-value="command.enabled" @update:model-value="toggleCommandActive(command)" />
									</td>

									<!-- Configure & Delete Actions -->
									<td class="px-6 py-4 text-right">
										<div class="flex items-center justify-end gap-1.5">
											<Button size="sm" variant="outline" @click="openEditSheet(command)">
												<Settings data-icon="inline-start" />
												Config
											</Button>
											<Button size="sm" variant="ghostDestructive" @click="deleteCommand(command)">
												<Trash2 />
												Remove
											</Button>
										</div>
									</td>
								</tr>
							</template>
						</tbody>
					</table>
				</div>
			</CardContent>
		</Card>

		<!-- Custom Command Add/Edit Slide-over Sheet -->
		<CustomCommandEditSheet
			:command="selectedCommand"
			:open="isSheetOpen"
			@update:open="isSheetOpen = $event"
			@saved="refreshCustomCommands"
		/>

		<!-- Deletion confirmation alert dialog -->
		<AlertDialog :open="isDeleteDialogOpen" @update:open="isDeleteDialogOpen = $event">
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
					<AlertDialogDescription>
						This will permanently delete the custom command
						<span class="font-bold text-foreground">!{{ commandToDelete?.trigger }}</span>
						and remove any aliases targeting this command. This action cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel @click="commandToDelete = null">
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction @click="confirmDelete">
						Delete Command
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	</AppPageContainer>
</template>
