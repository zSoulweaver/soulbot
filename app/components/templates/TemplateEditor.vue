<script setup lang="ts">
import type { TemplateVariableMeta } from '~/composables/useTemplateCatalog'
import {
	Eye,
	EyeOff,
	Plus,
	Search,
} from '@lucide/vue'
import Mention from '@tiptap/extension-mention'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { onClickOutside } from '@vueuse/core'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Button } from '~/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { useTemplateCatalog } from '~/composables/useTemplateCatalog'
import TemplatePreview from './TemplatePreview.vue'

const props = withDefaults(
	defineProps<{
		scope?: string
		customVariables?: TemplateVariableMeta[]
		includeGlobal?: boolean
		placeholder?: string
		previewMode?: 'twitch' | 'discord'
		disabled?: boolean
		showQuickChips?: boolean
		defaultShowPreview?: boolean
		replyTo?: boolean | string
	}>(),
	{
		includeGlobal: true,
		placeholder: 'Enter message template...',
		previewMode: 'twitch',
		disabled: false,
		showQuickChips: true,
		defaultShowPreview: true,
		replyTo: undefined,
	},
)

const modelValue = defineModel<string>({ default: '' })

const { getVariablesForScope, renderPreview } = useTemplateCatalog()

const showPreview = ref(props.defaultShowPreview)
const isPopoverOpen = ref(false)
const varSearch = ref('')
const popupRef = ref<HTMLElement | null>(null)
const activeSuggestionEl = ref<HTMLElement | null>(null)
const scrollListRef = ref<HTMLElement | null>(null)

// Suggestion state for inline popup
const suggestionState = ref<{
	active: boolean
	query: string
	range: { from: number, to: number } | null
	clientRect: (() => DOMRect | null) | null
	selectedIndex: number
}>({
	active: false,
	query: '',
	range: null,
	clientRect: null,
	selectedIndex: 0,
})

const popupPosition = ref({ top: 0, left: 0 })

// Close suggestion popup when clicking outside
onClickOutside(popupRef, () => {
	suggestionState.value.active = false
})

// Close suggestion popup if Popover is opened
watch(isPopoverOpen, (open) => {
	if (open) {
		suggestionState.value.active = false
	}
})

// Compute available variables
const variableGroups = computed(() => {
	return getVariablesForScope(props.scope, props.customVariables, props.includeGlobal)
})

const filteredScopedVars = computed(() => {
	const search = varSearch.value.trim().toLowerCase()
	if (!search)
		return variableGroups.value.scoped
	return variableGroups.value.scoped.filter(v =>
		v.name.toLowerCase().includes(search)
		|| v.label.toLowerCase().includes(search)
		|| v.description.toLowerCase().includes(search),
	)
})

const filteredGlobalVars = computed(() => {
	const search = varSearch.value.trim().toLowerCase()
	if (!search)
		return variableGroups.value.global
	return variableGroups.value.global.filter(v =>
		v.name.toLowerCase().includes(search)
		|| v.label.toLowerCase().includes(search)
		|| v.description.toLowerCase().includes(search),
	)
})

const suggestionItems = computed(() => {
	const query = suggestionState.value.query.toLowerCase()
	return variableGroups.value.all.filter(v =>
		v.name.toLowerCase().includes(query)
		|| v.label.toLowerCase().includes(query),
	)
})

// Scroll selected item into view smoothly when navigating with keyboard
watch(() => suggestionState.value.selectedIndex, (newIndex) => {
	nextTick(() => {
		if (newIndex === 0 && scrollListRef.value) {
			scrollListRef.value.scrollTop = 0
		}
		else if (newIndex === suggestionItems.value.length - 1 && scrollListRef.value) {
			scrollListRef.value.scrollTop = scrollListRef.value.scrollHeight
		}
		else if (activeSuggestionEl.value) {
			activeSuggestionEl.value.scrollIntoView({ block: 'nearest' })
		}
	})
})

// Helper to convert plain string to TipTap HTML with mention nodes
function stringToHtml(text: string): string {
	if (!text)
		return '<p></p>'
	// Replace $(varName) with mention span
	const converted = text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/\$\(([^()]+)\)/g, (_match, varName) => {
			const cleanName = varName.trim()
			return `<span data-type="mention" data-id="${cleanName}">$(${cleanName})<span class="mention-delete-btn">×</span></span>`
		})
	return `<p>${converted}</p>`
}

// Helper to convert TipTap editor document/HTML back to raw template string
function editorToString(editorInstance: any): string {
	if (!editorInstance)
		return ''
	let result = ''
	const doc = editorInstance.state.doc

	doc.descendants((node: any) => {
		if (node.type.name === 'mention') {
			result += `$(${node.attrs.id || node.attrs.label})`
			return false
		}
		if (node.isText) {
			result += node.text
		}
		if (node.type.name === 'hardBreak') {
			result += '\n'
		}
		return true
	})

	return result
}

function updatePopupCoords(clientRect?: (() => DOMRect | null) | null) {
	if (clientRect) {
		const rect = clientRect()
		if (rect) {
			popupPosition.value = {
				top: rect.bottom + window.scrollY + 4,
				left: rect.left + window.scrollX,
			}
		}
	}
}

// Custom Variable Mention Extension
const CustomVariableMention = Mention.extend({
	name: 'mention',
	renderHTML({ node }) {
		return [
			'span',
			{
				'data-type': 'mention',
				'data-id': node.attrs.id,
				'class': 'group relative inline-flex items-center overflow-hidden rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 mx-0.5 text-xs font-mono font-bold text-primary select-none align-baseline cursor-pointer transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive',
			},
			`$(${node.attrs.id || node.attrs.label})`,
			[
				'span',
				{
					class: 'mention-delete-btn pointer-events-none absolute inset-y-0 right-0 flex items-center justify-end bg-gradient-to-r from-transparent via-background/90 to-background pl-4 pr-1 font-sans text-xs font-bold leading-none text-destructive opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 dark:via-[#1c0f12] dark:to-[#291014]',
				},
				'×',
			],
		]
	},
	renderText({ node }) {
		return `$(${node.attrs.id || node.attrs.label})`
	},
}).configure({
	HTMLAttributes: {
		class: 'mention',
	},
	deleteTriggerWithBackspace: true,
	suggestion: {
		char: '$',
		allowSpaces: false,
		items: ({ query }) => {
			return variableGroups.value.all.filter(v =>
				v.name.toLowerCase().includes(query.toLowerCase())
				|| v.label.toLowerCase().includes(query.toLowerCase()),
			)
		},
		render: () => {
			let suggestionCommand: ((attrs: any) => void) | null = null
			return {
				onStart: (props) => {
					suggestionCommand = props.command
					suggestionState.value = {
						active: true,
						query: props.query,
						range: props.range,
						clientRect: props.clientRect as any,
						selectedIndex: 0,
					}
					updatePopupCoords(props.clientRect)
				},
				onUpdate: (props) => {
					suggestionCommand = props.command
					suggestionState.value.query = props.query
					suggestionState.value.range = props.range
					suggestionState.value.clientRect = props.clientRect as any
					updatePopupCoords(props.clientRect)
				},
				onKeyDown: (props) => {
					if (!suggestionState.value.active)
						return false

					if (props.event.key === 'ArrowDown') {
						const items = suggestionItems.value
						if (items.length === 0)
							return false
						suggestionState.value.selectedIndex = (suggestionState.value.selectedIndex + 1) % items.length
						return true
					}

					if (props.event.key === 'ArrowUp') {
						const items = suggestionItems.value
						if (items.length === 0)
							return false
						suggestionState.value.selectedIndex = (suggestionState.value.selectedIndex + items.length - 1) % items.length
						return true
					}

					if (props.event.key === 'Enter' || props.event.key === 'Tab') {
						const items = suggestionItems.value
						const selected = items[suggestionState.value.selectedIndex]
						if (selected && suggestionCommand) {
							suggestionCommand({ id: selected.name, label: selected.name })
							suggestionState.value.active = false
							return true
						}
						return false
					}

					if (props.event.key === 'Escape') {
						suggestionState.value.active = false
						return true
					}

					return false
				},
				onExit: () => {
					suggestionCommand = null
					suggestionState.value.active = false
				},
			}
		},
	},
})

// Initialize TipTap
const editor = useEditor({
	content: stringToHtml(modelValue.value),
	editable: !props.disabled,
	extensions: [
		StarterKit.configure({
			heading: false,
			blockquote: false,
			codeBlock: false,
			horizontalRule: false,
			listItem: false,
			orderedList: false,
			bulletList: false,
		}),
		CustomVariableMention,
	],
	editorProps: {
		attributes: {
			class: 'min-h-[72px] w-full rounded-md bg-transparent px-3 py-2 text-sm leading-relaxed outline-none focus:outline-none placeholder:text-muted-foreground',
		},
		handleClickOn: (view, _pos, node, nodePos, event) => {
			if (node.type.name === 'mention') {
				const target = event.target as HTMLElement
				if (target.closest('.mention-delete-btn') || target.closest('[data-type="mention"]')) {
					view.dispatch(view.state.tr.delete(nodePos, nodePos + node.nodeSize))
					return true
				}
			}
			return false
		},
	},
	onUpdate: () => {
		const newStr = editorToString(editor.value)
		if (newStr !== modelValue.value) {
			modelValue.value = newStr
		}
	},
})

// Sync external modelValue changes into TipTap
watch(modelValue, (newVal) => {
	if (!editor.value)
		return
	const currentStr = editorToString(editor.value)
	if (newVal !== currentStr) {
		editor.value.commands.setContent(stringToHtml(newVal), { emitUpdate: false })
	}
})

// Watch disabled state
watch(() => props.disabled, (isDisabled) => {
	if (editor.value) {
		editor.value.setEditable(!isDisabled)
	}
})

function insertVariable(varName: string) {
	if (!editor.value)
		return
	editor.value
		.chain()
		.focus()
		.insertContent({
			type: 'mention',
			attrs: { id: varName, label: varName },
		})
		.insertContent(' ')
		.run()

	isPopoverOpen.value = false
}

function selectSuggestionItem(item: TemplateVariableMeta) {
	if (!editor.value || !suggestionState.value.range)
		return
	editor.value
		.chain()
		.focus()
		.deleteRange(suggestionState.value.range)
		.insertContent({
			type: 'mention',
			attrs: { id: item.name, label: item.name },
		})
		.insertContent(' ')
		.run()

	suggestionState.value.active = false
}

// Live preview text computation
const livePreviewText = computed(() => {
	return renderPreview(modelValue.value || '', props.scope, props.customVariables)
})

onBeforeUnmount(() => {
	editor.value?.destroy()
})
</script>

<template>
	<div class="flex flex-col gap-2">
		<!-- Main Editor Frame -->
		<div
			class="
				flex flex-col rounded-lg border border-input bg-background transition-all
				focus-within:border-ring focus-within:ring-1 focus-within:ring-ring
			"
			:class="{ 'pointer-events-none bg-muted/30 opacity-60': props.disabled }"
		>
			<!-- Top Toolbar -->
			<div class="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-muted/20 px-2.5 py-2">
				<div class="flex flex-wrap items-center gap-1.5">
					<!-- Insert Variable Dropdown / Popover -->
					<Popover v-model:open="isPopoverOpen">
						<PopoverTrigger as-child>
							<Button
								variant="outline"
								size="sm"
								class="h-7 gap-1.5 rounded-md px-2.5 text-xs font-medium"
								:disabled="props.disabled"
							>
								<Plus class="size-3.5 text-primary" />
								<span>Insert Variable</span>
							</Button>
						</PopoverTrigger>
						<PopoverContent class="w-84 p-0 shadow-lg" align="start">
							<div class="flex flex-col">
								<!-- Search bar in popover with transparent, borderless input -->
								<div class="flex items-center border-b border-border/60 bg-transparent px-3 py-2">
									<Search class="mr-2 size-3.5 shrink-0 text-muted-foreground" />
									<input
										v-model="varSearch"
										placeholder="Search available variables..."
										class="
											h-6 w-full border-0 bg-transparent p-0 text-xs text-foreground shadow-none outline-none
											placeholder:text-muted-foreground
											focus:ring-0 focus:outline-none
											focus-visible:ring-0
										"
									>
								</div>

								<!-- Variable list categories -->
								<div class="max-h-64 overflow-y-auto p-1.5">
									<!-- Scoped / Context Variables -->
									<div v-if="filteredScopedVars.length > 0">
										<div class="px-2 py-1 text-[10px] font-bold tracking-wider text-primary uppercase select-none">
											Event Variables
										</div>
										<button
											v-for="v in filteredScopedVars"
											:key="v.name"
											type="button"
											class="
												flex w-full flex-col gap-0.5 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors
												hover:bg-accent hover:text-accent-foreground
											"
											@click="insertVariable(v.name)"
										>
											<div class="flex items-center justify-between gap-2">
												<span class="font-mono font-bold text-foreground">{{ `$(${v.name})` }}</span>
												<span class="text-[10px] font-medium text-muted-foreground">{{ v.label }}</span>
											</div>
											<p class="text-[11px] leading-relaxed text-muted-foreground">
												{{ v.description }}
											</p>
										</button>
									</div>

									<!-- Group Separator -->
									<div
										v-if="filteredScopedVars.length > 0 && filteredGlobalVars.length > 0"
										class="my-1.5 border-t border-border/50"
									/>

									<!-- Global Variables -->
									<div v-if="filteredGlobalVars.length > 0">
										<div class="px-2 py-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase select-none">
											Global Variables
										</div>
										<button
											v-for="v in filteredGlobalVars"
											:key="v.name"
											type="button"
											class="
												flex w-full flex-col gap-0.5 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors
												hover:bg-accent hover:text-accent-foreground
											"
											@click="insertVariable(v.name)"
										>
											<div class="flex items-center justify-between gap-2">
												<span class="font-mono font-bold text-foreground">{{ `$(${v.name})` }}</span>
												<span class="text-[10px] font-medium text-muted-foreground">{{ v.label }}</span>
											</div>
											<p class="text-[11px] leading-relaxed text-muted-foreground">
												{{ v.description }}
											</p>
										</button>
									</div>

									<div v-if="filteredScopedVars.length === 0 && filteredGlobalVars.length === 0" class="py-4 text-center text-xs text-muted-foreground italic">
										No matching variables found
									</div>
								</div>
							</div>
						</PopoverContent>
					</Popover>

					<!-- Quick Insert Chips Row (matching button height, border-radius, and padding) -->
					<div
						v-if="props.showQuickChips && variableGroups.scoped.length > 0"
						class="
							hidden items-center gap-1
							sm:flex
						"
					>
						<Tooltip v-for="v in variableGroups.scoped.slice(0, 4)" :key="v.name">
							<TooltipTrigger as-child>
								<button
									type="button"
									class="
										inline-flex h-7 items-center gap-1 rounded-md border border-border/60 bg-background/80 px-2 font-mono text-[11px] font-medium text-foreground transition-colors select-none
										hover:bg-accent hover:text-accent-foreground
									"
									:disabled="props.disabled"
									@click="insertVariable(v.name)"
								>
									<Plus class="size-3 text-muted-foreground" />
									<span>{{ `$(${v.name})` }}</span>
								</button>
							</TooltipTrigger>
							<TooltipContent side="bottom" class="flex max-w-64 flex-col gap-0.5 text-xs">
								<p class="font-semibold text-background">
									{{ v.label }}
								</p>
								<p class="text-[11px] leading-snug text-background/80">
									{{ v.description }}
								</p>
							</TooltipContent>
						</Tooltip>
					</div>
				</div>

				<!-- Right Actions: Preview Toggle -->
				<div class="flex items-center gap-1">
					<Tooltip>
						<TooltipTrigger as-child>
							<Button
								variant="ghost"
								size="sm"
								class="
									h-7 rounded-md px-2 text-xs font-medium text-muted-foreground
									hover:text-foreground
								"
								:class="{ 'bg-accent text-accent-foreground': showPreview }"
								@click="showPreview = !showPreview"
							>
								<Eye v-if="showPreview" class="mr-1.5 size-3.5 text-primary" />
								<EyeOff v-else class="mr-1.5 size-3.5" />
								<span>Preview</span>
							</Button>
						</TooltipTrigger>
						<TooltipContent side="top">
							{{ showPreview ? 'Hide live simulated preview' : 'Show live simulated preview' }}
						</TooltipContent>
					</Tooltip>
				</div>
			</div>

			<!-- TipTap Input Area -->
			<div class="relative flex min-h-[72px] flex-col p-1">
				<EditorContent :editor="editor" />

				<!-- Floating Autocomplete Suggestion Popup -->
				<div
					v-if="suggestionState.active && suggestionItems.length > 0"
					ref="popupRef"
					class="fixed z-50 flex max-h-72 w-88 flex-col rounded-lg border border-border bg-popover p-1 shadow-xl"
					:style="{ top: `${popupPosition.top}px`, left: `${popupPosition.left}px` }"
				>
					<div class="border-b border-border/40 px-2 py-1.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase select-none">
						Select Variable (Type $ to trigger)
					</div>
					<div ref="scrollListRef" class="flex flex-col gap-0.5 overflow-y-auto px-0 py-1">
						<button
							v-for="(item, index) in suggestionItems"
							:key="item.name"
							:ref="(el) => { if (index === suggestionState.selectedIndex) activeSuggestionEl = el as HTMLElement }"
							type="button"
							class="flex scroll-m-1 flex-col gap-0.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors"
							:class="index === suggestionState.selectedIndex ? 'bg-primary font-medium text-primary-foreground shadow-sm' : `
								text-foreground
								hover:bg-accent
							`"
							@click="selectSuggestionItem(item)"
						>
							<div class="flex items-center justify-between gap-3">
								<span class="font-mono font-bold">{{ `$(${item.name})` }}</span>
								<span
									class="shrink-0 text-[10px]"
									:class="index === suggestionState.selectedIndex ? 'font-medium text-primary-foreground/90' : 'text-muted-foreground'"
								>
									{{ item.label }}
								</span>
							</div>
							<p
								v-if="item.description"
								class="text-[11px] leading-relaxed"
								:class="index === suggestionState.selectedIndex ? 'text-primary-foreground/90' : 'text-muted-foreground'"
							>
								{{ item.description }}
							</p>
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Simulated Live Preview (Toggleable) -->
		<TemplatePreview
			v-if="showPreview"
			:text="livePreviewText"
			:mode="props.previewMode"
			:reply-to="typeof props.replyTo === 'boolean' ? (props.replyTo ? 'mad_lad6969' : undefined) : props.replyTo"
		/>
	</div>
</template>

<style>
/* TipTap editor styling */
.ProseMirror {
	outline: none !important;
}

.ProseMirror p {
	margin: 0;
	line-height: 1.6;
}

.ProseMirror p.is-editor-empty:first-child::before {
	color: #888888;
	content: attr(data-placeholder);
	float: left;
	height: 0;
	pointer-events: none;
}
</style>
