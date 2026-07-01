<script setup lang="ts">
import { Bell, BellOff, ChevronDown, Hash, HelpCircle, Keyboard } from '@lucide/vue'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
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

function copyVariable(variable: string) {
	const token = variable.split(' ')[0] || variable
	navigator.clipboard.writeText(token)
	toast.success(`Copied ${token} to clipboard!`)
}

function onToggleAlert(val: boolean) {
	isExpanded.value = val
}
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

			<Switch
				v-model:model-value="alertEnabled"
				:disabled="props.disabled"
				size="lg"
				@update:model-value="onToggleAlert"
			/>
		</div>

		<!-- Options Content -->
		<CollapsibleContent
			class="
				flex flex-col gap-4 overflow-hidden
				data-[state=closed]:animate-collapsible-up
				data-[state=open]:animate-collapsible-down
			"
		>
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
					<SettingsGroupAction
						class="
							w-full
							sm:w-80
						"
					>
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
					</Field>
				</FieldGroup>
			</div>
		</CollapsibleContent>
	</Collapsible>
</template>
