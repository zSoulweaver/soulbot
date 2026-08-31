<script setup lang="ts">
import type { GameDeathRecord } from '~/types/deaths'
import { Gamepad2, PlusIcon, SaveIcon, SearchIcon, Trash2Icon, XIcon } from '@lucide/vue'
import { refDebounced } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '~/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '~/components/ui/input-group'
import { Item } from '~/components/ui/item'
import { NumberField, NumberFieldContent, NumberFieldDecrement, NumberFieldIncrement, NumberFieldInput } from '~/components/ui/number-field'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '~/components/ui/sheet'
import { Spinner } from '~/components/ui/spinner'
import { cn } from '~/lib/utils'

const props = defineProps<{
	open: boolean
	gameRecord: GameDeathRecord | null
}>()

const emit = defineEmits(['update:open', 'saved'])

// Creation / General state
const newCounterName = ref<string>('')
const newCounterDeaths = ref<number>(0)
const isSaving = ref(false)

const isEditMode = computed(() => !!props.gameRecord)

interface GameDeathsDraft {
	gameName: string
	twitchGameId: string | null
	boxArtUrl: string | null
	counters: Array<{ id?: number, name: string, deaths: number, isActive?: boolean }>
}

const {
	draft,
	isModified,
	reset: resetDraft,
} = useFormDraft<GameDeathsDraft>(
	() => {
		if (!props.gameRecord)
			return null
		return {
			gameName: props.gameRecord.gameName,
			twitchGameId: props.gameRecord.twitchGameId || null,
			boxArtUrl: props.gameRecord.boxArtUrl || null,
			counters: (props.gameRecord.counters || []).map(c => ({
				id: c.id,
				name: c.name,
				deaths: c.deaths,
				isActive: c.isActive,
			})),
		}
	},
	() => ({
		gameName: '',
		twitchGameId: null,
		boxArtUrl: null,
		counters: [{ name: 'Default', deaths: 0, isActive: true }],
	}),
)

// Twitch category search state
const searchInput = ref('')
const debouncedSearch = refDebounced(searchInput, 300)
const searchResults = ref<{ id: string, name: string, boxArtUrl: string | null }[]>([])
const isSearching = ref(false)

const computedTotalDeaths = computed(() => {
	return draft.value.counters.reduce((sum, c) => sum + (Number(c.deaths) || 0), 0)
})

watch(debouncedSearch, async (query) => {
	if (!query.trim() || query.trim() === draft.value.gameName) {
		searchResults.value = []
		return
	}
	isSearching.value = true
	try {
		const results = await $fetch<{ id: string, name: string, boxArtUrl: string | null }[]>('/api/admin/deaths/search', {
			query: { q: query.trim() },
		})
		searchResults.value = results
	}
	catch {
		searchResults.value = []
	}
	finally {
		isSearching.value = false
	}
})

watch(() => props.open, (isOpen) => {
	if (isOpen) {
		resetDraft()
		searchInput.value = draft.value.gameName
		newCounterName.value = ''
		newCounterDeaths.value = 0
		searchResults.value = []
	}
})

function clearSearch() {
	searchInput.value = ''
	searchResults.value = []
}

function selectCategory(cat: { id: string, name: string, boxArtUrl: string | null }) {
	draft.value.gameName = cat.name
	draft.value.twitchGameId = cat.id
	draft.value.boxArtUrl = cat.boxArtUrl
	searchInput.value = cat.name
	searchResults.value = []
}

function onInput(e: Event) {
	searchInput.value = (e.target as HTMLInputElement).value
}

function setActiveCounter(counter: { name: string, isActive?: boolean }) {
	draft.value.counters.forEach((c) => {
		c.isActive = c === counter
	})
}

function deleteCounter(index: number) {
	const wasActive = draft.value.counters[index]?.isActive
	draft.value.counters.splice(index, 1)

	// Ensure there is at least one active counter if list is not empty
	if (wasActive && draft.value.counters.length > 0) {
		draft.value.counters[0]!.isActive = true
	}
}

function addPlaythroughCounter() {
	const name = newCounterName.value.trim()
	if (!name)
		return

	draft.value.counters.push({
		name,
		deaths: Number(newCounterDeaths.value || 0),
		isActive: draft.value.counters.length === 0,
	})

	newCounterName.value = ''
	newCounterDeaths.value = 0
}

async function saveAll() {
	if (!draft.value.gameName.trim() || isSaving.value || (isEditMode.value && !isModified.value))
		return

	isSaving.value = true
	try {
		// Ensure at least one counter exists
		const countersPayload = draft.value.counters.length > 0
			? draft.value.counters
			: [{ name: 'Default', deaths: 0, isActive: true }]

		await $fetch('/api/admin/deaths', {
			method: 'POST',
			body: {
				gameName: draft.value.gameName.trim(),
				twitchGameId: draft.value.twitchGameId,
				boxArtUrl: draft.value.boxArtUrl,
				counters: countersPayload,
			},
		})

		toast.success(`Successfully saved death counters for "${draft.value.gameName.trim()}"`)
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
		<SheetContent
			class="
				overflow-y-auto
				sm:max-w-2xl
			"
		>
			<SheetHeader class="border-b border-border">
				<SheetTitle>{{ props.gameRecord ? `Manage Counters: ${props.gameRecord.gameName}` : 'Add New Game Counter' }}</SheetTitle>
				<SheetDescription>
					{{ props.gameRecord ? 'Adjust death counters, counts, and active counter for this game.' : 'Select a Twitch game category and set initial counters.' }}
				</SheetDescription>
			</SheetHeader>

			<div class="flex flex-col gap-6 px-4 py-2">
				<!-- Selected Game Preview Card -->
				<Item v-if="draft.gameName" variant="outline" class="w-full border-border/60 bg-muted/40 p-3">
					<div class="flex w-full items-center justify-between gap-3">
						<div class="flex min-w-0 flex-1 items-center gap-3">
							<div class="relative h-14 w-11 shrink-0 overflow-hidden rounded-sm border border-border/50 bg-muted">
								<img
									v-if="draft.boxArtUrl"
									:src="draft.boxArtUrl"
									:alt="draft.gameName"
									class="size-full object-cover"
								>
								<div v-else class="flex size-full items-center justify-center text-muted-foreground">
									<Gamepad2 class="size-5 opacity-40" />
								</div>
							</div>
							<div class="flex min-w-0 flex-1 flex-col justify-center">
								<span class="text-sm/snug font-semibold wrap-break-word text-foreground">
									{{ draft.gameName }}
								</span>
								<span class="mt-0.5 truncate text-xs text-muted-foreground">
									{{ draft.twitchGameId ? `Twitch Game ID: ${draft.twitchGameId}` : 'Twitch Category' }}
								</span>
							</div>
						</div>

						<div class="h-8 w-px shrink-0 bg-border/60 select-none" />

						<div class="flex min-w-16 shrink-0 flex-col items-end justify-center select-none">
							<div class="text-lg font-black tracking-tight text-primary tabular-nums">
								{{ computedTotalDeaths.toLocaleString() }}
							</div>
							<span class="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
								Total Deaths
							</span>
						</div>
					</div>
				</Item>

				<!-- Creation Flow: Twitch Category Search -->
				<template v-if="!props.gameRecord">
					<FieldGroup>
						<Field>
							<FieldLabel for="twitchCategory" class="text-xs font-bold tracking-wider text-muted-foreground uppercase">
								Twitch Category
							</FieldLabel>
							<InputGroup class="mt-1 w-full">
								<InputGroupAddon>
									<Spinner v-if="isSearching" />
									<SearchIcon v-else class="text-muted-foreground" />
								</InputGroupAddon>
								<InputGroupInput
									id="twitchCategory"
									:model-value="searchInput"
									placeholder="Search Twitch for game category..."
									:disabled="isSaving"
									@input="onInput"
								/>
								<InputGroupButton
									v-if="searchInput"
									type="button"
									variant="ghost"
									size="icon-xs"
									title="Clear search"
									@click="clearSearch"
								>
									<XIcon
										class="
											size-4 text-muted-foreground
											hover:text-foreground
										"
									/>
								</InputGroupButton>
							</InputGroup>

							<!-- Search Results Dropdown List -->
							<div v-if="searchResults.length" class="mt-2 max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
								<div
									v-for="cat in searchResults"
									:key="cat.id"
									class="
										flex cursor-pointer items-center gap-3 p-2 transition-colors
										hover:bg-accent hover:text-accent-foreground
									"
									@click="selectCategory(cat)"
								>
									<img
										v-if="cat.boxArtUrl"
										:src="cat.boxArtUrl"
										:alt="cat.name"
										class="size-8 rounded-sm object-cover"
									>
									<div v-else class="flex size-8 items-center justify-center rounded-sm bg-muted">
										<Gamepad2 class="size-4 text-muted-foreground" />
									</div>
									<span class="text-sm font-medium text-foreground">{{ cat.name }}</span>
								</div>
							</div>
						</Field>
					</FieldGroup>
				</template>

				<!-- Death Counters Management List -->
				<div class="flex flex-col gap-3">
					<div class="flex items-center justify-between">
						<span class="text-xs font-bold tracking-wider text-muted-foreground uppercase">
							Death Counters
						</span>
						<span class="text-xs text-muted-foreground">
							{{ draft.counters.length }} counter(s)
						</span>
					</div>

					<div v-if="draft.counters.length" class="flex flex-col gap-3">
						<div
							v-for="(counter, idx) in draft.counters"
							:key="counter.id || idx"
							:class="cn(
								'flex flex-col gap-3 rounded-xl border bg-card p-3.5 shadow-xs transition-colors',
								counter.isActive ? 'border-primary/60' : 'border-border/60',
							)"
						>
							<div class="flex items-center justify-between gap-2.5">
								<Input
									v-model="counter.name"
									class="flex-1 font-medium"
									placeholder="Counter Name"
								/>

								<Button
									variant="outline"
									class="w-24"
									:disabled="counter.isActive"
									@click="setActiveCounter(counter)"
								>
									{{ counter.isActive ? 'Active' : 'Set Active' }}
								</Button>

								<Button
									v-if="draft.counters.length > 1"
									variant="ghostDestructive"
									size="icon-sm"
									title="Remove counter"
									@click="deleteCounter(idx)"
								>
									<Trash2Icon />
								</Button>
							</div>

							<div class="flex flex-col gap-1.5 border-t border-border/40 pt-2.5">
								<span class="text-xs font-medium text-muted-foreground">Deaths</span>
								<NumberField
									v-model="counter.deaths"
									:min="0"
									class="w-full"
								>
									<NumberFieldContent class="w-full">
										<NumberFieldDecrement />
										<NumberFieldInput class="text-center font-bold" />
										<NumberFieldIncrement />
									</NumberFieldContent>
								</NumberField>
							</div>
						</div>
					</div>
				</div>

				<!-- Inline Add New Counter Panel -->
				<div class="flex flex-col gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 p-3.5">
					<span class="text-xs font-bold tracking-wider text-muted-foreground uppercase">
						Add Death Counter
					</span>
					<div class="grid grid-cols-2 gap-3">
						<Input
							v-model="newCounterName"
							placeholder="e.g. Shadow of the Erdtree"
						/>
						<NumberField v-model="newCounterDeaths" :min="0">
							<NumberFieldContent>
								<NumberFieldDecrement />
								<NumberFieldInput placeholder="Deaths" />
								<NumberFieldIncrement />
							</NumberFieldContent>
						</NumberField>
					</div>
					<Button
						variant="secondary"
						class="w-full"
						:disabled="!newCounterName.trim()"
						@click="addPlaythroughCounter"
					>
						<PlusIcon data-icon="inline-start" />
						Add to List
					</Button>
				</div>
			</div>

			<SheetFooter class="flex flex-row items-center justify-end gap-2 border-t border-border">
				<SheetClose as-child>
					<Button variant="outline" :disabled="isSaving">
						Cancel
					</Button>
				</SheetClose>

				<Button :disabled="isSaving || !draft.gameName.trim() || (isEditMode && !isModified)" @click="saveAll">
					<Spinner v-if="isSaving" data-icon="inline-start" />
					<SaveIcon v-else data-icon="inline-start" />
					{{ isSaving ? 'Saving...' : 'Save Changes' }}
				</Button>
			</SheetFooter>
		</SheetContent>
	</Sheet>
</template>
