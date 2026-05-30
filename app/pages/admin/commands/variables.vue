<script setup lang="ts">
import { computed } from 'vue'

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

		<!-- Main Variables Grid Layout -->
		<div v-else class="grid gap-4">
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

			<Card
				v-for="variable in variables"
				:key="variable.name"
				class="gap-2"
			>
				<CardHeader>
					<div class="flex items-start justify-between gap-4">
						<div class="flex flex-col gap-1.5">
							<CardTitle class="font-mono text-lg">
								$({{ variable.name }})
							</CardTitle>
							<CardDescription>
								{{ variable.description }}
							</CardDescription>
						</div>

						<!-- Aliases Badges -->
						<div v-if="variable.aliases && variable.aliases.length > 0" class="flex flex-wrap items-center gap-1.5">
							<span class="text-xs font-semibold text-muted-foreground uppercase">Aliases:</span>
							<Badge
								v-for="alias in variable.aliases"
								:key="alias"
								variant="secondary"
								class="font-mono"
							>
								$({{ alias }})
							</Badge>
						</div>
					</div>
				</CardHeader>

				<CardContent class="p-0">
					<div class="overflow-x-auto">
						<Table class="w-full">
							<TableHeader>
								<TableRow>
									<TableHead class="w-1/3 px-6">
										Syntax Placeholder
									</TableHead>
									<TableHead class="w-2/3 px-6">
										Behavior Description
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								<TableRow
									v-for="example in variable.examples"
									:key="example.syntax"
								>
									<!-- Syntax Code Block Badge -->
									<TableCell class="px-6">
										<Badge variant="outline" class="font-mono">
											{{ example.syntax }}
										</Badge>
									</TableCell>

									<!-- Behavior Description -->
									<TableCell class="px-6 text-muted-foreground">
										{{ example.description }}
									</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	</AppPageContainer>
</template>
