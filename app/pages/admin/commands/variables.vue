<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import { computed, ref } from 'vue'

interface Variable {
	name: string
	aliases: string[]
	description: string
	examples: { syntax: string, description: string, output?: string }[]
}

const { data: apiVariables, pending: loading } = await useFetch<Variable[]>('/api/commands/variables')

// Hardcoded positional variables definition (core aspect of custom commands)
const positionalVariable: Variable = {
	name: '1...n',
	aliases: [],
	description: 'Positional parameters representing arguments typed after the command.',
	examples: [
		{ syntax: '$(1)', description: 'Resolves to the first argument typed after the command.' },
		{ syntax: '$(2)', description: 'Resolves to the second argument typed after the command.' },
		{ syntax: '$(N)', description: 'Resolves to the N-th argument typed after the command.' },
	],
}

const variables = computed(() => {
	if (!apiVariables.value) {
		return [positionalVariable]
	}
	return [positionalVariable, ...apiVariables.value]
})

// Collapsible state for each variable
const expandedVariables = ref<Record<string, boolean>>({
	'1...n': true, // Keep the positional guide expanded by default for onboarding feel!
})

function toggleVariableExpanded(name: string) {
	expandedVariables.value[name] = !expandedVariables.value[name]
}
</script>

<template>
	<AppPageContainer>
		<AppPageHeader
			heading="Command Variables"
			subheading="Self-documenting reference guide for placeholders, parameters, and database counters supported inside Soulbot custom commands."
		/>

		<!-- Loading state -->
		<div v-if="loading" class="flex items-center justify-center py-20">
			<span class="animate-pulse text-muted-foreground">
				Loading variable documentation registry...
			</span>
		</div>

		<!-- Main Variables Collapsible List -->
		<div v-else class="flex flex-col gap-4">
			<Alert variant="info">
				<AlertTitle>
					Pro Tip: Innermost Expression Parsing
				</AlertTitle>
				<AlertDescription>
					The bot processes nested placeholder variables from the **inside out**.
					For example, if you write <code>$(count $(1) +1)</code> and trigger the command via <code>!score bob</code>,
					the bot will first resolve the positional variable <code>$(1)</code> to <code>bob</code>, resulting in <code>$(count bob +1)</code>,
					and then increment/evaluate the named persistent counter <code>bob</code>.
				</AlertDescription>
			</Alert>

			<Collapsible
				v-for="variable in variables"
				:key="variable.name"
				:open="expandedVariables[variable.name]"
				class="overflow-hidden rounded-lg border bg-card/25 backdrop-blur-xs"
				@update:open="expandedVariables[variable.name] = $event"
			>
				<CollapsibleTrigger as-child>
					<div
						class="
							flex cursor-pointer items-center justify-between p-4 transition-colors select-none
							hover:bg-muted/45
						"
						@click="toggleVariableExpanded(variable.name)"
					>
						<div class="flex items-center gap-3">
							<!-- Chevron Indicator -->
							<ChevronRight
								class="size-4 text-primary transition-transform"
								:class="{ 'rotate-90': expandedVariables[variable.name] }"
							/>

							<div class="flex flex-col gap-0.5">
								<span class="font-mono text-base font-bold text-foreground">
									$({{ variable.name }})
								</span>
								<span
									class="
										line-clamp-1 max-w-sm text-xs text-muted-foreground
										sm:max-w-xl
									"
								>
									{{ variable.description }}
								</span>
							</div>
						</div>

						<!-- Aliases Badges -->
						<div
							v-if="variable.aliases && variable.aliases.length > 0" class="
								ml-4 hidden shrink-0 items-center gap-1.5
								sm:flex
							"
						>
							<span class="text-[10px] font-bold text-muted-foreground uppercase">Aliases:</span>
							<Badge
								v-for="alias in variable.aliases"
								:key="alias"
								variant="secondary"
								class="py-0 font-mono text-[10px]"
							>
								$({{ alias }})
							</Badge>
						</div>
					</div>
				</CollapsibleTrigger>

				<CollapsibleContent class="border-t border-border/40">
					<!-- Mobile Aliases List -->
					<div
						v-if="variable.aliases && variable.aliases.length > 0" class="
							flex items-center gap-1.5 border-b border-border/40 bg-muted/20 p-4
							sm:hidden
						"
					>
						<span class="text-[10px] font-bold text-muted-foreground uppercase">Aliases:</span>
						<div class="flex flex-wrap gap-1.5">
							<Badge
								v-for="alias in variable.aliases"
								:key="alias"
								variant="secondary"
								class="py-0 font-mono text-[10px]"
							>
								$({{ alias }})
							</Badge>
						</div>
					</div>

					<!-- Details examples table -->
					<div class="overflow-x-auto">
						<Table class="w-full">
							<TableHeader class="bg-muted/30">
								<TableRow>
									<TableHead class="w-1/3 px-6 text-xs select-none">
										Syntax Placeholder
									</TableHead>
									<TableHead class="w-2/3 px-6 text-xs select-none">
										Behavior Description
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								<TableRow
									v-for="example in variable.examples"
									:key="example.syntax"
									class="
										border-border/40
										hover:bg-muted/10
									"
								>
									<!-- Syntax Code Block Badge -->
									<TableCell class="px-6 py-3">
										<Badge variant="outline" class="py-0.5 font-mono text-xs font-semibold">
											{{ example.syntax }}
										</Badge>
									</TableCell>

									<!-- Behavior Description -->
									<TableCell class="px-6 py-3 text-xs text-muted-foreground">
										{{ example.description }}
									</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</div>
				</CollapsibleContent>
			</Collapsible>
		</div>
	</AppPageContainer>
</template>
