<script setup lang="ts">
import { ChevronRight, Search } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { Spinner } from '~/components/ui/spinner'

interface Variable {
	name: string
	aliases: string[]
	description: string
	examples: { syntax: string, description: string, output?: string }[]
}

const { data: apiVariables, pending: loading } = useFetch<Variable[]>('/api/commands/variables')

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

// Search query
const searchQuery = ref('')

// Expandable rows state mapping
const expandedRows = ref<Record<string, boolean>>({
	'1...n': true, // Keep positional guide expanded by default for onboarding feel!
})

// Filtered variables computed property based on search
const filteredVariables = computed(() => {
	const allVars = variables.value
	const query = searchQuery.value.trim().toLowerCase()

	if (!query)
		return allVars

	return allVars.filter((v) => {
		const nameMatch = v.name.toLowerCase().includes(query)
		const descMatch = v.description.toLowerCase().includes(query)
		const aliasMatch = v.aliases?.some(a => a.toLowerCase().includes(query))
		const exampleMatch = v.examples?.some(e =>
			e.syntax.toLowerCase().includes(query)
			|| e.description.toLowerCase().includes(query),
		)
		return nameMatch || descMatch || aliasMatch || exampleMatch
	})
})

// Auto-expand matching rows if search is active
watch(searchQuery, (newQuery) => {
	if (newQuery.trim()) {
		const newExpanded: Record<string, boolean> = {}
		for (const v of filteredVariables.value) {
			newExpanded[v.name] = true
		}
		expandedRows.value = newExpanded
	}
})

function toggleRowExpanded(name: string) {
	expandedRows.value[name] = !expandedRows.value[name]
}
</script>

<template>
	<AppPageContainer>
		<AppPageHeader
			heading="Command Variables"
			subheading="Self-documenting reference guide for placeholders, parameters, and database counters supported inside Soulbot custom commands."
		/>

		<!-- Loading state -->
		<div v-if="loading" class="flex flex-col items-center justify-center gap-2 py-20">
			<Spinner class="size-8" />
			<span class="text-sm text-muted-foreground">
				Loading variable documentation registry...
			</span>
		</div>

		<div v-else class="flex flex-col gap-4">
			<!-- Pro Tip Helper alert box -->
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

			<!-- Search & Filtration Row -->
			<InputGroup class="w-full max-w-sm">
				<InputGroupAddon>
					<Search class="text-muted-foreground" />
				</InputGroupAddon>
				<InputGroupInput
					v-model="searchQuery"
					type="search"
					placeholder="Search variables, aliases or behavior..."
				/>
			</InputGroup>

			<!-- Unified Data Table of Variables -->
			<div class="relative overflow-hidden rounded-xl border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead class="w-10" />
							<TableHead class="w-1/4">
								Variable Trigger
							</TableHead>
							<TableHead class="w-1/6">
								Aliases
							</TableHead>
							<TableHead>
								Description
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<TableRow v-if="filteredVariables.length === 0">
							<TableCell colspan="4" class="py-12 text-center text-muted-foreground">
								No variables found matching your search.
							</TableCell>
						</TableRow>
						<template v-for="variable in filteredVariables" v-else :key="variable.name">
							<!-- Primary Row -->
							<TableRow
								class="cursor-pointer transition-colors"
								:class="{ 'border-b-0': expandedRows[variable.name] }"
								@click="toggleRowExpanded(variable.name)"
							>
								<!-- Expand chevron button -->
								<TableCell class="text-center">
									<div class="flex items-center justify-center">
										<ChevronRight
											class="size-4 text-muted-foreground transition-transform duration-200"
											:class="{ 'rotate-90 text-primary': expandedRows[variable.name] }"
										/>
									</div>
								</TableCell>

								<!-- Variable placeholder tag -->
								<TableCell class="font-mono">
									$({{ variable.name }})
								</TableCell>

								<!-- Alternate aliases -->
								<TableCell>
									<div class="flex flex-wrap gap-1">
										<Badge
											v-for="alias in variable.aliases"
											:key="alias"
											variant="secondary"
											class="font-mono text-xs"
										>
											$({{ alias }})
										</Badge>
										<span v-if="!variable.aliases?.length" class="text-xs text-muted-foreground/40 italic select-none">
											None
										</span>
									</div>
								</TableCell>

								<!-- Primary description -->
								<TableCell class="whitespace-normal text-muted-foreground">
									{{ variable.description }}
								</TableCell>
							</TableRow>

							<!-- Secondary Collapsible Examples Row -->
							<TableRow
								v-if="expandedRows[variable.name]"
							>
								<TableCell
									colspan="4" class="bg-background! p-2"
								>
									<div class="ml-10 flex flex-col gap-2 border-l border-border py-1.5 pl-4">
										<div class="overflow-hidden rounded-lg border">
											<Table class="w-full">
												<TableBody>
													<TableRow
														v-for="example in variable.examples"
														:key="example.syntax"
														class="
															border-border/30
															last:border-none
														"
													>
														<!-- Code syntax badge -->
														<TableCell class="w-1/3 px-4">
															<Badge variant="secondary" class="font-mono text-xs font-bold">
																{{ example.syntax }}
															</Badge>
														</TableCell>

														<!-- Example Description -->
														<TableCell class="w-2/3 px-4 text-xs whitespace-normal text-muted-foreground">
															{{ example.description }}
														</TableCell>
													</TableRow>
												</TableBody>
											</Table>
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
</template>
