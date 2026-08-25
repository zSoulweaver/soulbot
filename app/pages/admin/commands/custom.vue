<script setup lang="ts">
import { Plus, RefreshCcw, Search, Settings, Trash2 } from '@lucide/vue'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import CustomCommandEditSheet from '~/components/commands/CustomCommandEditSheet.vue'

// Fetch custom commands
const { data: customCommandsList, refresh: refreshCustomCommands, pending: loading } = useFetch<any[]>('/api/commands/custom')

useHead({
	title: 'Custom Commands',
})

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
	<AppSettingsPage
		heading="Custom Commands"
		subheading="Construct dynamic chat commands using variables like sender, touser, and database-backed persistent counters."
	>
		<template #header-actions>
			<Button @click="openCreateSheet">
				<Plus data-icon="inline-start" />
				Add Command
			</Button>
			<Button variant="ghost" :disabled="loading" @click="refreshCustomCommands">
				<RefreshCcw :class="{ 'animate-spin': loading }" />
			</Button>
		</template>
		<!-- Custom Commands Dashboard (Card-Free Design) -->
		<div class="flex flex-col gap-4">
			<!-- Search & Count Control Row -->
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
						placeholder="Search custom commands..."
					/>
				</InputGroup>
				<div class="text-xs text-muted-foreground select-none">
					Showing {{ filteredCustomCommands.length }} of {{ customCommandsList?.length || 0 }} custom commands
				</div>
			</div>

			<!-- Custom Commands Table Container -->
			<div class="relative overflow-hidden rounded-lg border bg-card/25 backdrop-blur-xs">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>
								Command Trigger
							</TableHead>
							<TableHead>
								Response Template
							</TableHead>
							<TableHead>
								Permission
							</TableHead>
							<TableHead>
								Points Cost
							</TableHead>
							<TableHead>
								Cooldowns
							</TableHead>
							<TableHead class="text-center">
								Status
							</TableHead>
							<TableHead class="text-right">
								Actions
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody class="divide-y divide-border/60">
						<TableRow v-if="loading" class="text-center">
							<TableCell colspan="7" class="py-12 text-muted-foreground">
								Loading custom commands...
							</TableCell>
						</TableRow>
						<TableRow v-else-if="filteredCustomCommands.length === 0" class="text-center">
							<TableCell colspan="7" class="py-12 text-muted-foreground">
								No custom commands found. Click "Add Command" to create one!
							</TableCell>
						</TableRow>
						<template v-for="command in filteredCustomCommands" v-else :key="command.id">
							<TableRow
								class="
									transition-colors
									hover:bg-muted/40
								"
								:class="{ 'opacity-55': !command.enabled }"
							>
								<!-- Trigger Name & Description -->
								<TableCell class="py-3.5">
									<div class="flex flex-col gap-1">
										<span class="font-bold whitespace-nowrap text-foreground">
											!{{ command.trigger }}
										</span>
										<span v-if="command.description" class="line-clamp-1 max-w-50 text-xs text-muted-foreground">
											{{ command.description }}
										</span>
									</div>
								</TableCell>

								<!-- Response Message Template -->
								<TableCell class="py-3.5 font-mono text-xs">
									<div class="line-clamp-2 max-w-xs break-all text-muted-foreground" :title="command.response">
										{{ command.response }}
									</div>
								</TableCell>

								<!-- Permission Badge -->
								<TableCell>
									<CommandPermissionBadge :permission="command.permission" />
								</TableCell>

								<!-- Points Cost -->
								<TableCell>
									<CommandPointsBadge :cost="command.cost" />
								</TableCell>

								<!-- Cooldowns -->
								<TableCell>
									<CommandCooldownsDisplay :global="command.globalCooldown" :user="command.userCooldown" />
								</TableCell>

								<!-- Active Status Toggle -->
								<TableCell class="text-center">
									<Switch v-model:model-value="command.enabled" @update:model-value="toggleCommandActive(command)" />
								</TableCell>

								<!-- Configure & Delete Actions -->
								<TableCell class="text-right">
									<div class="flex items-center justify-end gap-1.5">
										<Button size="sm" variant="ghostPrimary" @click="openEditSheet(command)">
											<Settings data-icon="inline-start" />
											Config
										</Button>
										<Button size="sm" variant="ghostDestructive" @click="deleteCommand(command)">
											<Trash2 data-icon="inline-start" />
											Remove
										</Button>
									</div>
								</TableCell>
							</TableRow>
						</template>
					</TableBody>
				</Table>
			</div>
		</div>

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
	</AppSettingsPage>
</template>
