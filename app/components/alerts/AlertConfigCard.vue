<script setup lang="ts">
import { Bell, HelpCircle, PiggyBank } from 'lucide-vue-next'
import { ref } from 'vue'
import { toast } from 'vue-sonner'

const props = defineProps<{
	title: string
	description: string
	variables: string[]
	pointsLabel?: string
}>()

// Separate v-models for clean bindings
const alertEnabled = defineModel<boolean>('alertEnabled', { required: true })
const alertTemplate = defineModel<string>('alertTemplate', { required: true })
const pointsEnabled = defineModel<boolean>('pointsEnabled', { required: true })
const pointsReward = defineModel<number>('pointsReward', { required: true })

const textareaRef = ref<HTMLTextAreaElement | null>(null)

// Copies variable to clipboard with quick toast feedback
function copyVariable(variable: string) {
	const token = variable.split(' ')[0] || variable
	navigator.clipboard.writeText(token)
	toast.success(`Copied ${token} to clipboard!`)
}
</script>

<template>
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Bell class="size-4" />
				{{ props.title }}
			</CardTitle>
			<CardDescription>
				{{ props.description }}
			</CardDescription>
		</CardHeader>

		<CardContent
			class="
				grid grid-cols-1 gap-4
				md:grid-cols-2
			"
		>
			<!-- Points Reward Settings -->
			<div class="space-y-4">
				<Item variant="muted">
					<ItemContent>
						<ItemTitle>
							<PiggyBank class="size-4" />
							Reward Points
						</ItemTitle>
						<ItemDescription>
							Reward viewers with loyalty points on this event.
						</ItemDescription>
					</ItemContent>
					<ItemActions>
						<Switch v-model:model-value="pointsEnabled" />
					</ItemActions>
				</Item>

				<div v-if="pointsEnabled" class="animate-in space-y-3 duration-200 fade-in slide-in-from-top-2">
					<Label :for="`${props.title}-points`">
						{{ props.pointsLabel || 'Points Reward Amount' }}
					</Label>
					<NumberField :id="`${props.title}-points`" v-model="pointsReward" :min="0" class="w-full" :default-value="0">
						<NumberFieldContent>
							<NumberFieldDecrement />
							<NumberFieldInput />
							<NumberFieldIncrement />
						</NumberFieldContent>
					</NumberField>
					<p class="text-xs text-muted-foreground">
						Set the number of points to be credited to the chatter's balance.
					</p>
				</div>
			</div>

			<!-- Chat Alert Settings -->
			<div class="space-y-4">
				<Item variant="muted">
					<ItemContent>
						<ItemTitle>
							<Bell class="size-4" />
							Chat Message Alert
						</ItemTitle>
						<ItemDescription>
							Post an announcement in chat when this event triggers.
						</ItemDescription>
					</ItemContent>
					<ItemActions>
						<Switch v-model:model-value="alertEnabled" />
					</ItemActions>
				</Item>

				<div v-if="alertEnabled" class="animate-in space-y-3 duration-200 fade-in slide-in-from-top-2">
					<Label :for="`${props.title}-template`">
						Chat Announcement Message
					</Label>
					<Textarea
						:id="`${props.title}-template`"
						ref="textareaRef"
						v-model="alertTemplate"
						class="min-h-22 w-full"
						placeholder="Type alert message here..."
					/>

					<!-- Help Variables list -->
					<div class="space-y-1.5">
						<div class="flex items-center gap-1 text-xs text-muted-foreground">
							<HelpCircle class="size-3.5" />
							<span>Available dynamic variables (click to copy):</span>
						</div>
						<div class="flex flex-wrap gap-1.5 pt-1">
							<Badge
								v-for="variable in props.variables"
								:key="variable"
								variant="secondary"
								class="
									cursor-pointer font-mono transition-all select-none
									hover:bg-primary hover:text-primary-foreground
								"
								@click="copyVariable(variable)"
							>
								{{ variable }}
							</Badge>
						</div>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>
</template>
