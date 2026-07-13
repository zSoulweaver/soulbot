<script setup lang="ts">
import { Bell, BellOff, Hash, HelpCircle, Keyboard } from '@lucide/vue'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { ConfigAccordion } from '~/components/ui/config-accordion'
import {
	SettingsGroup,
	SettingsGroupAction,
	SettingsGroupContent,
	SettingsGroupDescription,
	SettingsGroupItem,
	SettingsGroupLabel,
} from '~/components/ui/settings-group'

const props = defineProps<{
	title: string
	description: string
	variables: string[]
	channels: { id: string, name: string }[]
	disabled?: boolean
}>()

// Bindings
const alertEnabled = defineModel<boolean>('alertEnabled', { required: true })
const alertChannelId = defineModel<string>('alertChannelId', { required: true })
const alertTemplate = defineModel<string>('alertTemplate', { required: true })

const showManualInput = ref(false)
const isExpanded = ref(false)

interface ParsedVariable {
	token: string
	label: string
	description: string
}

const parsedVariables = computed<ParsedVariable[]>(() => {
	return props.variables.map((v) => {
		const match = v.match(/^(\$\([\w.-]+\))\s*\((.+)\)$/)
		if (match && match[1]) {
			const token = match[1]
			const label = match[2] || ''
			return {
				token,
				label,
				description: getVariableDescription(token, label),
			}
		}
		return {
			token: v,
			label: v,
			description: getVariableDescription(v, ''),
		}
	})
})

function getVariableDescription(token: string, label: string): string {
	const lowerToken = token.toLowerCase()
	const lowerLabel = label.toLowerCase()

	if (lowerToken.includes('sender')) {
		if (lowerToken.endsWith('.name)')) {
			return 'The sender\'s Twitch username (lowercase, no spaces, e.g. creatorname).'
		}
		if (lowerToken.endsWith('.id)')) {
			return 'The sender\'s unique Twitch user ID.'
		}
		// Base sender
		if (lowerLabel.includes('follower')) {
			return 'The display name of the user who followed.'
		}
		if (lowerLabel.includes('subscriber')) {
			return 'The display name of the subscriber.'
		}
		if (lowerLabel.includes('gifter')) {
			return 'The display name of the user who gifted the subscription(s).'
		}
		if (lowerLabel.includes('cheerer')) {
			return 'The display name of the user who cheered.'
		}
		if (lowerLabel.includes('raider')) {
			return 'The display name of the raiding broadcaster.'
		}
		if (lowerLabel.includes('broadcaster')) {
			return 'The display name of the broadcaster.'
		}
		return 'The display name of the user who triggered the event.'
	}

	if (lowerToken.includes('points')) {
		return 'The amount of loyalty points awarded for this event.'
	}
	if (lowerToken.includes('channel')) {
		return 'The Twitch channel name where the event occurred.'
	}
	if (lowerToken.includes('subtier')) {
		return 'The subscription tier (Prime, Tier 1, Tier 2, or Tier 3).'
	}
	if (lowerToken.includes('giftcount')) {
		return 'The number of subscriptions gifted in this event.'
	}
	if (lowerToken.includes('bitscount')) {
		return 'The number of bits cheered.'
	}
	if (lowerToken.includes('cheermessage')) {
		return 'The chat message sent with the cheer.'
	}
	if (lowerToken.includes('raidsize')) {
		return 'The number of viewers joining the raid.'
	}
	if (lowerToken.includes('livetitle')) {
		return 'The title of the live stream.'
	}
	if (lowerToken.includes('livegame')) {
		return 'The category or game being streamed.'
	}

	return label || 'Dynamic variable.'
}

// Copies variable to clipboard with quick toast feedback
function copyVariable(token: string) {
	navigator.clipboard.writeText(token)
	toast.success(`Copied ${token} to clipboard!`)
}

function onToggleAlert(val: boolean) {
	isExpanded.value = val
}
</script>

<template>
	<ConfigAccordion
		v-model="isExpanded"
		:title="props.title"
		:description="props.description"
	>
		<template #icon>
			<Bell
				v-if="alertEnabled"
				class="size-5 text-primary transition-colors"
			/>
			<BellOff
				v-else
				class="
					size-5 text-muted-foreground transition-colors
					group-hover:text-primary
				"
			/>
		</template>

		<template #header-action>
			<Switch
				v-model:model-value="alertEnabled"
				:disabled="props.disabled"
				@update:model-value="onToggleAlert"
			/>
		</template>

		<div class="flex flex-col gap-6">
			<!-- Options Group -->
			<SettingsGroup>
				<!-- Target Channel selector -->
				<SettingsGroupItem>
					<SettingsGroupContent>
						<SettingsGroupLabel>Target Channel</SettingsGroupLabel>
						<SettingsGroupDescription>
							Select or enter the text channel where the alert will be posted.
						</SettingsGroupDescription>
					</SettingsGroupContent>
					<SettingsGroupAction>
						<div class="flex w-full flex-col gap-2">
							<div class="flex items-center justify-end">
								<Button
									:disabled="props.channels.length === 0"
									variant="ghost"
									size="sm"
									class="
										px-2 text-xs text-muted-foreground
										hover:text-foreground
									"
									@click="showManualInput = !showManualInput"
								>
									<component :is="showManualInput ? Hash : Keyboard" class="mr-1 size-3" />
									{{ showManualInput ? 'Select from list' : 'Enter ID manually' }}
								</Button>
							</div>

							<!-- Channel Select Selector -->
							<Select
								v-if="props.channels.length > 0 && !showManualInput"
								v-model="alertChannelId"
							>
								<SelectTrigger :id="`${props.title}-channel`" class="w-full">
									<SelectValue placeholder="Select a text channel..." />
								</SelectTrigger>
								<SelectContent>
									<SelectItem
										v-for="ch in props.channels"
										:key="ch.id"
										:value="ch.id"
									>
										#{{ ch.name }} ({{ ch.id }})
									</SelectItem>
								</SelectContent>
							</Select>

							<!-- Manual Text Field Fallback -->
							<div v-else class="flex w-full flex-col gap-1">
								<Input
									:id="`${props.title}-channel`"
									v-model="alertChannelId"
									placeholder="Enter text channel ID (e.g. 123456789...)"
									class="w-full"
								/>
							</div>
						</div>
					</SettingsGroupAction>
				</SettingsGroupItem>
				<slot name="extra-options" />
			</SettingsGroup>

			<!-- Message Template Editor -->
			<div class="flex flex-col gap-3">
				<FieldGroup>
					<Field>
						<FieldLabel :for="`${props.title}-template`">
							Discord Announcement Message
						</FieldLabel>
						<Textarea
							:id="`${props.title}-template`"
							v-model="alertTemplate"
							class="min-h-24 w-full"
							placeholder="Type alert message here..."
						/>

						<!-- Dynamic variables -->
						<div class="flex flex-col gap-2 pt-2">
							<div class="flex items-center gap-1 text-xs text-muted-foreground">
								<HelpCircle class="size-3.5" />
								<span>Available dynamic variables (click to copy):</span>
							</div>
							<div class="flex flex-wrap gap-1.5">
								<TooltipProvider>
									<Tooltip v-for="variable in parsedVariables" :key="variable.token">
										<TooltipTrigger as-child>
											<Badge
												variant="secondary"
												class="
													cursor-pointer font-mono transition-all select-none
													hover:bg-primary hover:text-primary-foreground
												"
												@click="copyVariable(variable.token)"
											>
												{{ variable.token }}
											</Badge>
										</TooltipTrigger>
										<TooltipContent class="max-w-xs px-3 py-2">
											<div class="flex flex-col gap-1 text-left">
												<div class="border-b border-background/10 pb-1 text-xs font-semibold">
													{{ variable.label }}
												</div>
												<div class="text-xs/relaxed opacity-90">
													{{ variable.description }}
												</div>
												<div class="mt-1 border-t border-background/10 pt-1 text-[10px] opacity-70">
													Click to copy <code class="rounded-sm bg-background/10 px-1 py-0.5 font-mono text-[9px]">{{ variable.token }}</code>
												</div>
											</div>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
						</div>
					</Field>
				</FieldGroup>
			</div>
		</div>
	</ConfigAccordion>
</template>
