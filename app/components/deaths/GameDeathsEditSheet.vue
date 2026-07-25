<script setup lang="ts">
import type { GameDeathRecord } from '~/types/deaths'
import { SaveIcon } from '@lucide/vue'
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '~/components/ui/item'
import { NumberField, NumberFieldContent, NumberFieldDecrement, NumberFieldIncrement, NumberFieldInput } from '~/components/ui/number-field'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '~/components/ui/sheet'
import { Spinner } from '~/components/ui/spinner'

const props = defineProps<{
	open: boolean
	gameRecord: GameDeathRecord | null
}>()

const emit = defineEmits(['update:open', 'saved'])

const gameName = ref<string>('')
const deaths = ref<number>(0)
const isSaving = ref(false)

watch(() => props.open, (isOpen) => {
	if (isOpen) {
		if (props.gameRecord) {
			gameName.value = props.gameRecord.gameName
			deaths.value = props.gameRecord.deaths
		}
		else {
			gameName.value = ''
			deaths.value = 0
		}
	}
})

async function saveRecord() {
	if (!gameName.value.trim() || isSaving.value)
		return

	isSaving.value = true
	try {
		await $fetch('/api/admin/deaths', {
			method: 'POST',
			body: {
				id: props.gameRecord?.id,
				gameName: gameName.value.trim(),
				deaths: Number(deaths.value || 0),
			},
		})

		toast.success(`Successfully saved death counter for "${gameName.value.trim()}"`)
		emit('saved')
		emit('update:open', false)
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to save death record')
	}
	finally {
		isSaving.value = false
	}
}
</script>

<template>
	<Sheet :open="props.open" @update:open="emit('update:open', $event)">
		<SheetContent>
			<SheetHeader class="border-b border-border pb-4">
				<SheetTitle>{{ props.gameRecord ? 'Edit Death Counter' : 'Add New Game Counter' }}</SheetTitle>
				<SheetDescription>
					Adjust or set the total death count for a specific game.
				</SheetDescription>
			</SheetHeader>

			<div class="flex flex-col gap-6 px-4 py-6">
				<!-- Selected Game Banner Item if editing -->
				<Item v-if="props.gameRecord" variant="outline" class="w-full border-border/60 bg-muted/40">
					<ItemContent>
						<ItemTitle class="text-sm font-semibold text-foreground">
							{{ props.gameRecord.gameName }}
						</ItemTitle>
						<ItemDescription class="text-xs text-muted-foreground">
							Tracked Game
						</ItemDescription>
					</ItemContent>
					<ItemActions class="flex flex-col items-end justify-center gap-0.5 select-none">
						<div class="text-lg font-black tracking-tight text-primary tabular-nums">
							{{ props.gameRecord.deaths.toLocaleString() }}
						</div>
						<span class="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
							Current Deaths
						</span>
					</ItemActions>
				</Item>

				<!-- Game Name Input -->
				<FieldGroup>
					<Field>
						<FieldLabel for="gameName" class="text-xs font-bold tracking-wider text-muted-foreground uppercase">
							Game Name
						</FieldLabel>
						<Input
							id="gameName"
							v-model="gameName"
							placeholder="e.g. Elden Ring"
							:disabled="isSaving"
							class="mt-1 w-full"
						/>
						<FieldDescription class="mt-1 text-xs text-muted-foreground">
							Must match the category name used on Twitch.
						</FieldDescription>
					</Field>
				</FieldGroup>

				<!-- Death Count Input Field -->
				<FieldGroup>
					<Field>
						<FieldLabel for="deaths" class="text-xs font-bold tracking-wider text-muted-foreground uppercase">
							Death Count
						</FieldLabel>
						<NumberField
							id="deaths"
							v-model="deaths"
							:min="0"
							:disabled="isSaving"
							:default-value="0"
							class="mt-1 w-full"
						>
							<NumberFieldContent>
								<NumberFieldDecrement />
								<NumberFieldInput placeholder="e.g. 15" />
								<NumberFieldIncrement />
							</NumberFieldContent>
						</NumberField>
						<FieldDescription class="mt-1.5 text-xs text-muted-foreground">
							Set the absolute number of deaths for this game.
						</FieldDescription>
					</Field>
				</FieldGroup>
			</div>

			<SheetFooter class="flex flex-row items-center justify-end gap-2 border-t border-border pt-4">
				<SheetClose as-child>
					<Button variant="outline" :disabled="isSaving">
						Cancel
					</Button>
				</SheetClose>

				<Button :disabled="isSaving || !gameName.trim()" @click="saveRecord">
					<Spinner v-if="isSaving" data-icon="inline-start" />
					<SaveIcon v-else data-icon="inline-start" />
					{{ isSaving ? 'Saving...' : 'Save Deaths' }}
				</Button>
			</SheetFooter>
		</SheetContent>
	</Sheet>
</template>
