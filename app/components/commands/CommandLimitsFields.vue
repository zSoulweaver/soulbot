<script setup lang="ts">
import { BadgeDollarSign, Clock } from 'lucide-vue-next'

const props = defineProps<{
	disabled?: boolean
}>()

const cost = defineModel<number>('cost', { default: 0 })
const globalCooldown = defineModel<number>('globalCooldown', { default: 0 })
const userCooldown = defineModel<number>('userCooldown', { default: 0 })
</script>

<template>
	<div class="grid grid-cols-3 gap-4">
		<Field>
			<FieldLabel for="editCost" class="flex items-center gap-1 select-none">
				<BadgeDollarSign class="size-4 text-muted-foreground" />
				Point Cost
			</FieldLabel>
			<NumberField id="editCost" v-model="cost" :min="0" :disabled="props.disabled" class="w-full" :default-value="0">
				<NumberFieldContent>
					<NumberFieldDecrement />
					<NumberFieldInput />
					<NumberFieldIncrement />
				</NumberFieldContent>
			</NumberField>
		</Field>

		<Field>
			<FieldLabel for="editGlobalCooldown" class="flex items-center gap-1 select-none">
				<Clock class="size-4 text-muted-foreground" />
				Global CD (Sec)
			</FieldLabel>
			<NumberField id="editGlobalCooldown" v-model="globalCooldown" :min="0" :disabled="props.disabled" class="w-full" :default-value="0">
				<NumberFieldContent>
					<NumberFieldDecrement />
					<NumberFieldInput />
					<NumberFieldIncrement />
				</NumberFieldContent>
			</NumberField>
		</Field>

		<Field>
			<FieldLabel for="editUserCooldown" class="flex items-center gap-1 select-none">
				<Clock class="size-4 text-muted-foreground" />
				User CD (Sec)
			</FieldLabel>
			<NumberField id="editUserCooldown" v-model="userCooldown" :min="0" :disabled="props.disabled" class="w-full" :default-value="0">
				<NumberFieldContent>
					<NumberFieldDecrement />
					<NumberFieldInput />
					<NumberFieldIncrement />
				</NumberFieldContent>
			</NumberField>
		</Field>
	</div>
</template>
