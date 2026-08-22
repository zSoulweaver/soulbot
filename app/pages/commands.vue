<script setup lang="ts">
import type { PublicCommand } from '~/types/commands'
import { ChevronRight, CornerDownRight, RefreshCcw, SearchIcon } from '@lucide/vue'
import { computed, ref } from 'vue'

const { user } = useUserSession()
const { data: commandsList, refresh: refreshCommands, pending: loading } = useFetch<PublicCommand[]>('/api/commands/directory')

useHead({
	title: 'Commands Directory',
})

const isPrivileged = computed(() => {
	const role = user.value?.role
	return Boolean(role && ['moderator', 'admin', 'caster'].includes(role))
})

// Expanded subcommands tracking - subcommands expanded by default
const expandedCommands = ref<Record<string, boolean>>({})

function isExpanded(commandId: string): boolean {
	return expandedCommands.value[commandId] !== false
}

function toggleCommandExpanded(commandId: string) {
	expandedCommands.value[commandId] = !isExpanded(commandId)
}

// Search & Filter state
const searchQuery = ref('')

function getFlatSubcommands(subcommandsObject: any): Array<{ name: string, triggerPath: string, detail: any }> {
	if (!subcommandsObject || typeof subcommandsObject !== 'object' || Array.isArray(subcommandsObject))
		return []
	const flatList: Array<{ name: string, triggerPath: string, detail: any }> = []

	function traverse(objectRecord: any, pathPrefix: string, triggerPrefix: string) {
		if (!objectRecord || typeof objectRecord !== 'object' || Array.isArray(objectRecord))
			return
		for (const [name, value] of Object.entries(objectRecord)) {
			if (!value || typeof value !== 'object')
				continue
			const detail = value as any
			const currentPath = pathPrefix ? `${pathPrefix} ${name}` : name
			const currentTriggerPath = triggerPrefix ? `${triggerPrefix} ${detail.activeTrigger}` : detail.activeTrigger
			flatList.push({
				name: currentPath,
				triggerPath: currentTriggerPath,
				detail,
			})
			if (detail.subcommands) {
				traverse(detail.subcommands, currentPath, currentTriggerPath)
			}
		}
	}

	traverse(subcommandsObject, '', '')
	return flatList
}

const filteredCommands = computed(() => {
	if (!commandsList.value)
		return []
	const filter = searchQuery.value.trim().toLowerCase()
	if (!filter)
		return commandsList.value

	return commandsList.value.filter((cmd) => {
		const matchRoot = cmd.activeTrigger.toLowerCase().includes(filter)
			|| cmd.id.toLowerCase().includes(filter)
			|| (cmd.description && cmd.description.toLowerCase().includes(filter))
			|| (cmd.usage && cmd.usage.toLowerCase().includes(filter))
			|| (cmd.aliases && cmd.aliases.some((a: any) => a.trigger.toLowerCase().includes(filter)))

		if (matchRoot)
			return true

		if (cmd.subcommands) {
			const flatSubs = getFlatSubcommands(cmd.subcommands)
			return flatSubs.some(sub =>
				sub.triggerPath.toLowerCase().includes(filter)
				|| (sub.detail.description && sub.detail.description.toLowerCase().includes(filter))
				|| (sub.detail.usage && sub.detail.usage.toLowerCase().includes(filter))
				|| (sub.detail.aliases && sub.detail.aliases.some((a: any) => a.trigger.toLowerCase().includes(filter))),
			)
		}

		return false
	})
})
</script>

<template>
	<div class="flex flex-col">
		<AppPageHeader
			heading="Commands Directory"
			subheading="Explore available chat commands, usage syntax, and point costs for our Twitch stream."
		>
			<Button variant="ghost" :disabled="loading" @click="refreshCommands">
				<RefreshCcw :class="{ 'animate-spin': loading }" />
			</Button>
		</AppPageHeader>

		<AppPageContainer class="flex-1">
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
							<SearchIcon class="text-muted-foreground" />
						</InputGroupAddon>
						<InputGroupInput
							v-model="searchQuery"
							type="search"
							placeholder="Search commands or usage..."
						/>
					</InputGroup>

					<div class="text-xs text-muted-foreground select-none">
						Showing {{ filteredCommands.length }} of {{ commandsList?.length || 0 }} commands
					</div>
				</div>

				<!-- Table Container -->
				<div class="relative overflow-hidden rounded-lg border bg-card/25 backdrop-blur-xs">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>
									Command Trigger
								</TableHead>
								<TableHead>
									Type
								</TableHead>
								<TableHead>
									Description & Usage
								</TableHead>
								<TableHead>
									Points Cost
								</TableHead>
								<TableHead v-if="isPrivileged">
									Permission
								</TableHead>
								<TableHead v-if="isPrivileged" class="text-right">
									Visibility
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody class="divide-y divide-border/60">
							<TableRow v-if="loading" class="text-center">
								<TableCell :colspan="isPrivileged ? 6 : 4" class="py-12 text-muted-foreground">
									Loading bot commands...
								</TableCell>
							</TableRow>
							<TableRow v-else-if="filteredCommands.length === 0" class="text-center">
								<TableCell :colspan="isPrivileged ? 6 : 4" class="py-12 text-muted-foreground">
									No commands found matching your search.
								</TableCell>
							</TableRow>
							<template v-for="command in filteredCommands" v-else :key="command.id">
								<TableRow
									class="
										transition-colors
										hover:bg-muted/40
									"
								>
									<!-- Trigger Name & Aliases -->
									<TableCell class="py-3.5">
										<div class="flex flex-col gap-1.5">
											<div class="flex items-center gap-1.5">
												<button
													v-if="command.subcommands && Object.keys(command.subcommands).length > 0"
													class="
														rounded-sm p-1 text-muted-foreground transition-colors
														hover:bg-muted hover:text-foreground
													"
													title="Toggle nested subcommands"
													@click="toggleCommandExpanded(command.id)"
												>
													<ChevronRight class="size-4 text-primary transition-transform" :class="{ 'rotate-90': isExpanded(command.id) }" />
												</button>

												<div
													class="flex items-baseline gap-2"
													:class="{ 'cursor-pointer': command.subcommands && Object.keys(command.subcommands).length > 0 }"
													@click="command.subcommands && Object.keys(command.subcommands).length > 0 ? toggleCommandExpanded(command.id) : null"
												>
													<span class="font-bold whitespace-nowrap text-foreground">
														!{{ command.activeTrigger }}
													</span>
													<span v-if="command.aliases && command.aliases.length > 0" class="flex items-center gap-1 text-xs text-muted-foreground">
														<span v-for="alias in command.aliases" :key="alias.trigger" class="rounded-sm bg-muted/65 px-1.5 py-0.5 font-mono text-[11px]">
															!{{ alias.trigger }}
														</span>
													</span>
												</div>
											</div>
										</div>
									</TableCell>

									<!-- Type (Core / Custom) -->
									<TableCell>
										<Badge variant="outline" class="capitalize">
											{{ command.type }}
										</Badge>
									</TableCell>

									<!-- Description & Usage -->
									<TableCell class="py-3.5">
										<div class="flex flex-col gap-1">
											<span v-if="command.description" class="text-sm text-foreground">
												{{ command.description }}
											</span>
											<span v-if="command.usage" class="font-mono text-xs text-muted-foreground">
												Usage: {{ command.usage }}
											</span>
											<span v-if="!command.description && !command.usage" class="text-xs text-muted-foreground/60 italic">
												—
											</span>
										</div>
									</TableCell>

									<!-- Points Cost -->
									<TableCell>
										<CommandPointsBadge v-if="command.cost > 0" :cost="command.cost" />
										<span v-else class="text-xs text-muted-foreground">Free</span>
									</TableCell>

									<!-- Permission Badge (for privileged users) -->
									<TableCell v-if="isPrivileged">
										<CommandPermissionBadge :permission="command.permission" />
									</TableCell>

									<!-- Hidden Status (for privileged users) -->
									<TableCell v-if="isPrivileged" class="text-right">
										<Badge v-if="command.hidden" variant="outline" class="border-muted-foreground/30 text-[10px] text-muted-foreground">
											Hidden
										</Badge>
										<span v-else class="text-xs text-muted-foreground">Public</span>
									</TableCell>
								</TableRow>

								<!-- Subcommands Breakdown -->
								<TableRow v-if="command.subcommands && Object.keys(command.subcommands).length > 0 && isExpanded(command.id)" class="bg-muted/10">
									<TableCell :colspan="isPrivileged ? 6 : 4" class="px-6 py-4">
										<div class="ml-5 flex flex-col gap-3 border-l border-border/80 py-2 pr-2 pl-4">
											<div class="flex items-center justify-between select-none">
												<span class="text-xs font-bold tracking-wider text-muted-foreground uppercase">
													Subcommands
												</span>
												<Badge variant="outline" class="uppercase">
													{{ getFlatSubcommands(command.subcommands).length }} Options
												</Badge>
											</div>

											<div class="grid gap-2">
												<div
													v-for="subcommandItem in getFlatSubcommands(command.subcommands)"
													:key="subcommandItem.detail.id"
													class="
														flex flex-col justify-between rounded-lg border border-border/60 bg-card p-3 transition-all
														hover:bg-muted/40
														sm:flex-row sm:items-center
													"
													:style="{
														marginLeft: `${(subcommandItem.name.trim().split(/\s+/).length - 1) * 1.5}rem`,
													}"
												>
													<div class="flex min-w-0 items-center gap-3">
														<CornerDownRight
															v-if="subcommandItem.name.trim().split(/\s+/).length - 1 > 0"
															class="size-3.5 shrink-0 text-muted-foreground/50"
														/>
														<div class="flex min-w-0 flex-col gap-1">
															<div class="flex flex-wrap items-center gap-1.5">
																<span class="font-mono text-xs font-bold text-foreground">
																	!{{ command.activeTrigger }} {{ subcommandItem.triggerPath }}
																</span>
																<span v-if="subcommandItem.detail.aliases && subcommandItem.detail.aliases.length > 0" class="flex items-center gap-1 text-xs text-muted-foreground">
																	<span v-for="alias in subcommandItem.detail.aliases" :key="alias.trigger" class="rounded-sm bg-muted/65 px-1.5 py-0.5 font-mono text-[11px]">
																		!{{ alias.trigger }}
																	</span>
																</span>
																<Badge
																	v-if="subcommandItem.detail.hasHandler === false" variant="outline" class="
																		border-amber-500/20 bg-amber-500/5 px-1 py-0 text-[9px] font-medium text-amber-600
																		dark:text-amber-400
																	"
																>
																	Route Group
																</Badge>
															</div>
															<span v-if="subcommandItem.detail.description" class="text-xs text-muted-foreground">
																{{ subcommandItem.detail.description }}
															</span>
															<span v-if="subcommandItem.detail.usage" class="font-mono text-[11px] text-muted-foreground/80">
																Usage: {{ subcommandItem.detail.usage }}
															</span>
														</div>
													</div>

													<div
														class="
															mt-3 flex shrink-0 items-center gap-2 select-none
															sm:mt-0 sm:justify-end
														"
													>
														<CommandPointsBadge v-if="subcommandItem.detail.cost > 0" :cost="subcommandItem.detail.cost" />
														<template v-if="isPrivileged">
															<CommandPermissionBadge :permission="subcommandItem.detail.permission" />
															<Badge v-if="subcommandItem.detail.hidden" variant="outline" class="border-muted-foreground/30 text-[9px] text-muted-foreground">
																Hidden
															</Badge>
														</template>
													</div>
												</div>
											</div>
										</div>
									</TableCell>
								</TableRow>
							</template>
						</TableBody>
					</Table>
				</div>
			</div>
		</AppPageContainer>
	</div>
</template>
