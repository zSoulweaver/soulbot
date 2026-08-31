<script setup lang="ts">
import { SaveIcon } from '@lucide/vue'
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '~/components/ui/item'
import {
	SettingsGroup,
	SettingsGroupAction,
	SettingsGroupContent,
	SettingsGroupDescription,
	SettingsGroupItem,
	SettingsGroupLabel,
} from '~/components/ui/settings-group'

interface User {
	id: string
	username: string
	displayName: string
	points: number
}

const props = defineProps<{
	open: boolean
	user: User | null
}>()

const emit = defineEmits(['update:open', 'saved'])

const amount = ref<number>(0)
const mode = ref<'add' | 'set'>('add')
const isSaving = ref(false)

watch(() => props.open, (isOpen) => {
	if (isOpen) {
		amount.value = 0
		mode.value = 'add'
	}
})

async function saveAdjustment() {
	if (!props.user || isSaving.value)
		return

	isSaving.value = true
	try {
		await $fetch(`/api/loyalty/${props.user.username}`, {
			method: 'POST',
			body: {
				amount: Number(amount.value || 0),
				mode: mode.value,
			},
		})

		const adjustmentMessage = mode.value === 'add'
			? `${amount.value >= 0 ? 'Added' : 'Subtracted'} ${Math.abs(amount.value || 0).toLocaleString()} points`
			: `Set points balance to ${(amount.value || 0).toLocaleString()}`

		toast.success(`Successfully adjusted points for ${props.user.displayName}: ${adjustmentMessage}`)
		emit('saved')
		emit('update:open', false)
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to adjust points')
	}
	finally {
		isSaving.value = false
	}
}
</script>

<template>
	<Sheet :open="props.open" @update:open="emit('update:open', $event)">
		<SheetContent class="sm:max-w-md">
			<SheetHeader class="border-b border-border">
				<SheetTitle>Adjust Points Balance</SheetTitle>
				<SheetDescription>
					Add, subtract, or override point balances for channel chatters.
				</SheetDescription>
			</SheetHeader>

			<div class="flex flex-col gap-6 overflow-y-auto px-4 py-2">
				<!-- Selected User Banner Item (Using built-in Item components) -->
				<Item v-if="props.user" variant="outline" class="w-full border-border/60 bg-muted/40">
					<ItemContent>
						<ItemTitle class="text-sm font-semibold text-foreground">
							{{ props.user.displayName }}
						</ItemTitle>
						<ItemDescription class="text-xs">
							@{{ props.user.username }}
						</ItemDescription>
					</ItemContent>
					<ItemActions class="flex flex-col items-end justify-center gap-0.5 select-none">
						<div class="text-lg font-black tracking-tight text-primary tabular-nums">
							{{ props.user.points.toLocaleString() }}
						</div>
						<span class="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
							Current Balance
						</span>
					</ItemActions>
				</Item>

				<!-- Adjustment -->
				<div class="flex flex-col gap-1">
					<span class="text-xs font-bold tracking-wider text-muted-foreground select-none">Adjustment</span>
					<SettingsGroup>
						<SettingsGroupItem class="sm:flex-col sm:items-stretch sm:gap-3">
							<SettingsGroupContent class="sm:pr-0">
								<SettingsGroupLabel>Adjustment Mode</SettingsGroupLabel>
								<SettingsGroupDescription>Add or subtract relative points, or set an absolute final balance.</SettingsGroupDescription>
							</SettingsGroupContent>
							<SettingsGroupAction
								class="
									w-full
									sm:w-full
									md:w-full
								"
							>
								<Tabs v-model="mode" class="w-full">
									<TabsList class="grid w-full grid-cols-2">
										<TabsTrigger value="add" :disabled="isSaving" class="text-xs">
											Add / Subtract
										</TabsTrigger>
										<TabsTrigger value="set" :disabled="isSaving" class="text-xs">
											Set Absolute
										</TabsTrigger>
									</TabsList>
								</Tabs>
							</SettingsGroupAction>
						</SettingsGroupItem>

						<SettingsGroupItem class="sm:flex-col sm:items-stretch sm:gap-3">
							<SettingsGroupContent class="sm:pr-0">
								<SettingsGroupLabel>Amount</SettingsGroupLabel>
								<SettingsGroupDescription v-if="mode === 'add'">
									Input a <b>positive</b> number to award points, or a <b>negative</b> number to subtract/remove points.
								</SettingsGroupDescription>
								<SettingsGroupDescription v-else>
									Input the <b>exact</b> final points balance this user should have.
								</SettingsGroupDescription>
							</SettingsGroupContent>
							<SettingsGroupAction
								class="
									w-full
									sm:w-full
									md:w-full
								"
							>
								<NumberField
									id="amount"
									v-model="amount"
									:min="mode === 'set' ? 0 : undefined"
									:disabled="isSaving"
									:default-value="0"
									class="w-full"
								>
									<NumberFieldContent>
										<NumberFieldDecrement />
										<NumberFieldInput placeholder="e.g. 500 or -250" />
										<NumberFieldIncrement />
									</NumberFieldContent>
								</NumberField>
							</SettingsGroupAction>
						</SettingsGroupItem>
					</SettingsGroup>
				</div>
			</div>

			<SheetFooter class="flex flex-row items-center justify-end gap-2 border-t">
				<SheetClose as-child>
					<Button variant="outline" :disabled="isSaving">
						Cancel
					</Button>
				</SheetClose>

				<Button :disabled="isSaving || (mode === 'add' && amount === 0) || (mode === 'set' && amount === props.user?.points)" @click="saveAdjustment">
					<Spinner v-if="isSaving" data-icon="inline-start" />
					<SaveIcon v-else data-icon="inline-start" />
					{{ isSaving ? 'Saving...' : 'Save Changes' }}
				</Button>
			</SheetFooter>
		</SheetContent>
	</Sheet>
</template>
