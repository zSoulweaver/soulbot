<script setup lang="ts">
import { BadgeDollarSign, Clock } from '@lucide/vue'
import {
	SettingsGroupAction,
	SettingsGroupContent,
	SettingsGroupDescription,
	SettingsGroupItem,
	SettingsGroupLabel,
} from '~/components/ui/settings-group'

const props = defineProps<{
	disabled?: boolean
}>()

const cost = defineModel<number>('cost', { default: 0 })
const globalCooldown = defineModel<number>('globalCooldown', { default: 0 })
const userCooldown = defineModel<number>('userCooldown', { default: 0 })
</script>

<template>
	<SettingsGroupItem>
		<SettingsGroupContent>
			<SettingsGroupLabel class="flex items-center gap-1 select-none">
				<BadgeDollarSign class="size-4 text-muted-foreground" />
				Point Cost
			</SettingsGroupLabel>
			<SettingsGroupDescription>Points deducted from the user each time this command runs.</SettingsGroupDescription>
		</SettingsGroupContent>
		<SettingsGroupAction>
			<NumberField id="editCost" v-model="cost" :min="0" :disabled="props.disabled" class="w-full" :default-value="0">
				<NumberFieldContent>
					<NumberFieldDecrement />
					<NumberFieldInput />
					<NumberFieldIncrement />
				</NumberFieldContent>
			</NumberField>
		</SettingsGroupAction>
	</SettingsGroupItem>

	<SettingsGroupItem>
		<SettingsGroupContent>
			<SettingsGroupLabel class="flex items-center gap-1 select-none">
				<Clock class="size-4 text-muted-foreground" />
				Global CD (Sec)
			</SettingsGroupLabel>
			<SettingsGroupDescription>Minimum seconds between uses of this command across all viewers.</SettingsGroupDescription>
		</SettingsGroupContent>
		<SettingsGroupAction>
			<NumberField id="editGlobalCooldown" v-model="globalCooldown" :min="0" :disabled="props.disabled" class="w-full" :default-value="0">
				<NumberFieldContent>
					<NumberFieldDecrement />
					<NumberFieldInput />
					<NumberFieldIncrement />
				</NumberFieldContent>
			</NumberField>
		</SettingsGroupAction>
	</SettingsGroupItem>

	<SettingsGroupItem>
		<SettingsGroupContent>
			<SettingsGroupLabel class="flex items-center gap-1 select-none">
				<Clock class="size-4 text-muted-foreground" />
				User CD (Sec)
			</SettingsGroupLabel>
			<SettingsGroupDescription>Minimum seconds each individual viewer must wait between reuses.</SettingsGroupDescription>
		</SettingsGroupContent>
		<SettingsGroupAction>
			<NumberField id="editUserCooldown" v-model="userCooldown" :min="0" :disabled="props.disabled" class="w-full" :default-value="0">
				<NumberFieldContent>
					<NumberFieldDecrement />
					<NumberFieldInput />
					<NumberFieldIncrement />
				</NumberFieldContent>
			</NumberField>
		</SettingsGroupAction>
	</SettingsGroupItem>
</template>
