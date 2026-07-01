<script setup lang="ts">
import { Bell, BellOff, ChevronDown, HelpCircle, MessageSquare, PiggyBank } from '@lucide/vue'
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'

const props = withDefaults(
	defineProps<{
		title: string
		description: string
		variables: string[]
		pointsLabel?: string
		hidePoints?: boolean
	}>(),
	{
		hidePoints: false,
	},
)

// Separate v-models for clean bindings
const alertEnabled = defineModel<boolean>('alertEnabled', { required: true })
const alertTemplate = defineModel<string>('alertTemplate', { required: true })
const pointsEnabled = defineModel<boolean>('pointsEnabled', { default: false })
const pointsReward = defineModel<number>('pointsReward', { default: 0 })

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const isExpanded = ref(false)

// Copies variable to clipboard with quick toast feedback
function copyVariable(variable: string) {
	const token = variable.split(' ')[0] || variable
	navigator.clipboard.writeText(token)
	toast.success(`Copied ${token} to clipboard!`)
}

// Auto-expand/collapse accordion logic based on toggles
watch([alertEnabled, pointsEnabled], ([newAlert, newPoints], [oldAlert, oldPoints]) => {
	// Only auto-expand/collapse if there was a real change (not initial load)
	if (oldAlert !== undefined && oldPoints !== undefined) {
		if (newAlert || newPoints) {
			isExpanded.value = true
		}
		else if (!newAlert && !newPoints) {
			isExpanded.value = false
		}
	}
}, { immediate: false })
</script>

<template>
	<Collapsible v-model:open="isExpanded" class="flex flex-col gap-4">
		<!-- Section Header -->
		<div class="flex items-start justify-between gap-4">
			<CollapsibleTrigger class="group flex flex-1 cursor-pointer items-start gap-2 text-left outline-none select-none">
				<div class="flex flex-col gap-1">
					<h3
						class="
							flex items-center gap-2 text-lg font-semibold transition-colors
							group-hover:text-primary
						"
					>
						<Bell
							v-if="alertEnabled || (!props.hidePoints && pointsEnabled)"
							class="size-5 text-primary transition-colors"
						/>
						<BellOff
							v-else
							class="
								size-5 text-muted-foreground transition-colors
								group-hover:text-primary
							"
						/>
						{{ props.title }}
						<ChevronDown
							class="
								size-4 text-muted-foreground transition-transform duration-200
								group-hover:text-primary
							" :class="[
								isExpanded ? 'rotate-180 text-primary' : '',
							]"
						/>
					</h3>
					<p class="text-sm text-muted-foreground">
						{{ props.description }}
					</p>
				</div>
			</CollapsibleTrigger>

			<!-- Right-aligned Status Badges -->
			<div class="flex items-center gap-2 pt-1 select-none">
				<!-- Points Badge -->
				<template v-if="!props.hidePoints">
					<Badge
						v-if="pointsEnabled"
						variant="secondary"
						class="
							gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-600
							dark:text-emerald-400
						"
					>
						<PiggyBank class="size-3" />
						+{{ pointsReward }} points
					</Badge>
					<Badge
						v-else
						variant="secondary"
						class="gap-1 opacity-40"
					>
						<PiggyBank class="size-3" />
						Points disabled
					</Badge>
				</template>

				<!-- Chat Alert Badge -->
				<Badge
					v-if="alertEnabled"
					variant="secondary"
					class="gap-1 border-primary/20 bg-primary/10 text-primary"
				>
					<MessageSquare class="size-3" />
					Chat alert
				</Badge>
				<Badge
					v-else
					variant="secondary"
					class="gap-1 opacity-40"
				>
					<MessageSquare class="size-3" />
					Chat disabled
				</Badge>
			</div>
		</div>

		<!-- Options Content -->
		<CollapsibleContent
			class="
				grid grid-cols-1 gap-6 overflow-hidden
				data-[state=closed]:animate-collapsible-up
				data-[state=open]:animate-collapsible-down
			" :class="[
				!props.hidePoints ? 'md:grid-cols-2' : '',
			]"
		>
			<!-- Points Reward Settings -->
			<div v-if="!props.hidePoints" class="flex flex-col gap-4">
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

				<div v-if="pointsEnabled" class="flex animate-in flex-col gap-3 duration-200 fade-in slide-in-from-top-2">
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
			<div class="flex flex-col gap-4">
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

				<div v-if="alertEnabled" class="flex animate-in flex-col gap-3 duration-200 fade-in slide-in-from-top-2">
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
					<div class="flex flex-col gap-1.5">
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
		</CollapsibleContent>
	</Collapsible>
</template>
