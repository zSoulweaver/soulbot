<script setup lang="ts">
import type { GameDeathRecord } from '~/types/deaths'
import { Gamepad2, SaveIcon, SearchIcon, XIcon } from '@lucide/vue'
import { refDebounced } from '@vueuse/core'
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '~/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '~/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '~/components/ui/input-group'
import { Item } from '~/components/ui/item'
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
const twitchGameId = ref<string | null>(null)
const boxArtUrl = ref<string | null>(null)
const isSaving = ref(false)

// Twitch category search state
const searchInput = ref('')
const debouncedSearch = refDebounced(searchInput, 300)
const searchResults = ref<{ id: string, name: string, boxArtUrl: string | null }[]>([])
const isSearching = ref(false)

watch(debouncedSearch, async (query) => {
	if (!query.trim() || query.trim() === gameName.value) {
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
		if (props.gameRecord) {
			gameName.value = props.gameRecord.gameName
			deaths.value = props.gameRecord.deaths
			twitchGameId.value = props.gameRecord.twitchGameId || null
			boxArtUrl.value = props.gameRecord.boxArtUrl || null
			searchInput.value = props.gameRecord.gameName
		}
		else {
			gameName.value = ''
			deaths.value = 0
			twitchGameId.value = null
			boxArtUrl.value = null
			searchInput.value = ''
		}
		searchResults.value = []
	}
})

function clearSearch() {
	searchInput.value = ''
	searchResults.value = []
}

function selectCategory(cat: { id: string, name: string, boxArtUrl: string | null }) {
	gameName.value = cat.name
	twitchGameId.value = cat.id
	boxArtUrl.value = cat.boxArtUrl
	searchInput.value = cat.name
	searchResults.value = []
}

function onInput(e: Event) {
	searchInput.value = (e.target as HTMLInputElement).value
}

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
				twitchGameId: twitchGameId.value,
				boxArtUrl: boxArtUrl.value,
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
		<SheetContent class="sm:max-w-md">
			<SheetHeader class="border-b border-border pb-4">
				<SheetTitle>{{ props.gameRecord ? 'Edit Death Counter' : 'Add New Game Counter' }}</SheetTitle>
				<SheetDescription>
					Select a Twitch game category and set the total death count.
				</SheetDescription>
			</SheetHeader>

			<div class="flex flex-col gap-6 px-4 py-6">
				<!-- Selected Game Preview Card -->
				<Item v-if="gameName" variant="outline" class="w-full border-border/60 bg-muted/40 p-3">
					<div class="flex w-full items-center justify-between gap-3">
						<!-- Left: Thumbnail + Title & Game ID -->
						<div class="flex min-w-0 flex-1 items-center gap-3">
							<div class="relative h-14 w-11 shrink-0 overflow-hidden rounded-sm border border-border/50 bg-muted">
								<img
									v-if="boxArtUrl"
									:src="boxArtUrl"
									:alt="gameName"
									class="size-full object-cover"
								>
								<div v-else class="flex size-full items-center justify-center text-muted-foreground">
									<Gamepad2 class="size-5 opacity-40" />
								</div>
							</div>
							<div class="flex min-w-0 flex-1 flex-col justify-center">
								<span class="text-sm/snug font-semibold wrap-break-word text-foreground">
									{{ gameName }}
								</span>
								<span class="mt-0.5 truncate text-xs text-muted-foreground">
									{{ twitchGameId ? `Twitch Game ID: ${twitchGameId}` : 'Twitch Category' }}
								</span>
							</div>
						</div>

						<!-- Vertical Separator -->
						<div class="h-8 w-px shrink-0 bg-border/60 select-none" />

						<!-- Right: Deaths Count -->
						<div class="flex min-w-16 shrink-0 flex-col items-end justify-center select-none">
							<div class="text-lg font-black tracking-tight text-primary tabular-nums">
								{{ Number(deaths || 0).toLocaleString() }}
							</div>
							<span class="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
								Deaths
							</span>
						</div>
					</div>
				</Item>

				<!-- Single Searchable Twitch Category Field -->
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

						<FieldDescription class="mt-1.5 text-xs text-muted-foreground">
							Search and select an official Twitch category.
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
							Set the absolute number of deaths for this game. Setting to 0 removes the record.
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
