<script setup lang="ts">
import type { TemplateVariableMeta } from '~/composables/useTemplateCatalog'
import {
	AlertCircle,
	Eye,
	EyeOff,
	Plus,
	Search,
	Sparkles,
} from '@lucide/vue'
import Mention from '@tiptap/extension-mention'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { onClickOutside } from '@vueuse/core'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { GLOBAL_TEMPLATE_VARIABLES } from '~~/shared/types/templates'
import { Button } from '~/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { useTemplateCatalog } from '~/composables/useTemplateCatalog'
import { validateTemplate } from '~/composables/useTemplateValidator'
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

const { getVariablesForScope, renderPreview, loading: catalogLoading, catalog } = useTemplateCatalog()

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

// Validation result
const validation = computed(() => {
	if ((props.scope && !catalog.value) || catalogLoading.value || !modelValue.value) {
		return { isValid: true, invalidVariables: [], validVariables: [], tokens: [] }
	}
	return validateTemplate(modelValue.value || '', {
		scopeId: props.scope,
		allowedVariables: variableGroups.value.all,
		customVariables: props.customVariables,
		includeGlobal: props.includeGlobal,
	})
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
	const lines = text.split('\n')
	return lines.map((line) => {
		const converted = line
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/\$\(([^()]+)\)/g, (_match, varName) => {
				const cleanName = varName.trim()
				return `<span data-type="mention" data-id="${cleanName}">$(${cleanName})<span class="mention-delete-btn">×</span></span>`
			})
		return `<p>${converted}</p>`
	}).join('')
}

// Helper to convert TipTap editor document/HTML back to raw template string
function editorToString(editorInstance: any): string {
	if (!editorInstance)
		return ''
	let result = ''
	const doc = editorInstance.state.doc
	let isFirstBlock = true

	doc.forEach((node: any) => {
		if (node.isBlock) {
			if (!isFirstBlock) {
				result += '\n'
			}
			isFirstBlock = false
			node.descendants((child: any) => {
				if (child.type.name === 'mention') {
					result += `$(${child.attrs.id || child.attrs.label})`
					return false
				}
				if (child.isText) {
					result += child.text
				}
				if (child.type.name === 'hardBreak') {
					result += '\n'
				}
				return true
			})
		}
		else if (node.isText) {
			result += node.text
		}
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

// Custom Variable Mention Extension with invalid and category-based styling
const CustomVariableMention = Mention.extend({
	name: 'mention',
	renderHTML({ node }) {
		const varId = node.attrs.id || node.attrs.label || ''
		const isGlobal = GLOBAL_TEMPLATE_VARIABLES.some(g => g.name === varId) || varId.startsWith('core.')

		const singleValidation = validateTemplate(`$(${varId})`, {
			scopeId: props.scope,
			allowedVariables: variableGroups.value.all,
			customVariables: props.customVariables,
			includeGlobal: props.includeGlobal,
		})

		// While catalog is still loading, if it's not a known global variable, don't mark as invalid yet
		const isInvalid = catalogLoading.value && variableGroups.value.scoped.length === 0
			? false
			: !singleValidation.isValid

		let badgeClass = 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400'
		let category = 'scoped'

		if (isInvalid) {
			badgeClass = 'border-destructive/50 bg-destructive/15 text-destructive'
			category = 'invalid'
		}
		else if (isGlobal) {
			badgeClass = 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
			category = 'global'
		}

		return [
			'span',
			{
				'data-type': 'mention',
				'data-id': node.attrs.id,
				'data-invalid': isInvalid ? 'true' : 'false',
				'data-category': category,
				'class': `group relative inline-flex items-center overflow-hidden rounded border px-1.5 py-0.5 mx-0.5 text-xs font-mono font-bold select-none align-baseline cursor-pointer transition-colors hover:border-red-500/50 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-500/60 dark:hover:bg-[#220c0e] dark:hover:text-red-400 ${badgeClass}`,
			},
			`$(${node.attrs.id || node.attrs.label})`,
			[
				'span',
				{
					class: 'mention-delete-btn pointer-events-none absolute inset-y-0 right-0 flex items-center justify-center pl-5 pr-1.5 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 bg-gradient-to-r from-transparent via-red-100/90 to-red-100 text-red-600 dark:from-transparent dark:via-[#220c0e]/95 dark:to-[#220c0e] dark:text-red-400',
				},
				[
					'span',
					{
						class: 'mention-delete-icon',
					},
				],
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

// When the variable catalog finishes loading, re-render the TipTap document
// so that mention badges re-evaluate their styling (scoped vs global vs invalid)
watch([() => variableGroups.value.all.length, catalogLoading], () => {
	if (editor.value) {
		const currentStr = editorToString(editor.value)
		editor.value.commands.setContent(stringToHtml(currentStr), { emitUpdate: false })
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

function replaceInvalidToken(rawToken: string, suggestion: string) {
	const replacement = suggestion.startsWith('$') ? suggestion : `$(${suggestion})`
	const newStr = (modelValue.value || '').replaceAll(rawToken, () => replacement)
	modelValue.value = newStr
	if (editor.value) {
		editor.value.commands.setContent(stringToHtml(newStr), { emitUpdate: false })
	}
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
	<div class="@container flex flex-col gap-2">
		<!-- Main Editor Frame -->
		<div
			class="
				flex flex-col rounded-lg border transition-all
				focus-within:border-ring focus-within:ring-1 focus-within:ring-ring
			"
			:class="[
				props.disabled ? 'pointer-events-none bg-muted/30 opacity-60' : 'bg-background',
				!validation.isValid && validation.invalidVariables.length > 0 ? 'border-destructive/60' : 'border-input',
			]"
		>
			<!-- Top Toolbar -->
			<div class="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-muted/20 px-2.5 py-2">
				<div class="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
					<!-- Insert Variable Dropdown / Popover -->
					<Popover v-model:open="isPopoverOpen">
						<PopoverTrigger as-child>
							<Button
								variant="outline"
								size="sm"
								class="h-7 shrink-0 gap-1.5 rounded-md px-2.5 text-xs font-medium"
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
										<div
											class="
												px-2 py-1 text-[10px] font-bold tracking-wider text-sky-600 uppercase select-none
												dark:text-sky-400
											"
										>
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
												<span
													class="
														font-mono font-bold text-sky-600
														dark:text-sky-400
													"
												>{{ `$(${v.name})` }}</span>
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
										<div
											class="
												px-2 py-1 text-[10px] font-bold tracking-wider text-amber-600 uppercase select-none
												dark:text-amber-400
											"
										>
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
												<span
													class="
														font-mono font-bold text-amber-600
														dark:text-amber-400
													"
												>{{ `$(${v.name})` }}</span>
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

					<!-- Quick Insert Chips Row (Container Query Responsive) -->
					<div
						v-if="props.showQuickChips && variableGroups.scoped.length > 0"
						class="
							hidden items-center gap-1 overflow-hidden
							@min-[420px]:flex
						"
					>
						<Tooltip v-for="(v, idx) in variableGroups.scoped.slice(0, 4)" :key="v.name">
							<TooltipTrigger as-child>
								<button
									type="button"
									class="
										h-7 shrink-0 items-center gap-1 rounded-md border border-sky-500/25 bg-sky-500/5 px-2 font-mono text-[11px] font-medium text-sky-700 transition-colors select-none
										hover:border-sky-500/40 hover:bg-sky-500/15 hover:text-sky-800
										dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300
										dark:hover:bg-sky-500/20
									"
									:class="idx >= 2 ? (idx === 2 ? `
										hidden
										@min-[560px]:inline-flex
									` : `
										hidden
										@min-[680px]:inline-flex
									`) : 'inline-flex'"
									:disabled="props.disabled"
									@click="insertVariable(v.name)"
								>
									<Plus
										class="
											size-3 text-sky-600/70
											dark:text-sky-400/70
										"
									/>
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
				<div class="flex shrink-0 items-center gap-1">
					<Tooltip>
						<TooltipTrigger as-child>
							<Button
								variant="ghost"
								size="sm"
								class="
									h-7 shrink-0 rounded-md px-2 text-xs font-medium text-muted-foreground
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
				<ClientOnly>
					<EditorContent :editor="editor" />
					<template #fallback>
						<div class="min-h-[72px] w-full px-3 py-2 text-sm/relaxed whitespace-pre-wrap text-muted-foreground">
							{{ modelValue || props.placeholder }}
						</div>
					</template>
				</ClientOnly>

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

		<!-- In-Editor Invalid Variable Diagnostics Alert with Quick Fix -->
		<div
			v-if="!validation.isValid && validation.invalidVariables.length > 0"
			class="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive transition-all"
		>
			<div class="flex items-center gap-1.5 font-semibold">
				<AlertCircle class="size-4 shrink-0 text-destructive" />
				<span>Invalid Variable{{ validation.invalidVariables.length === 1 ? '' : 's' }} Detected</span>
			</div>

			<div class="flex flex-col gap-1.5 pl-5.5">
				<div
					v-for="(inv, idx) in validation.invalidVariables"
					:key="idx"
					class="flex flex-wrap items-center justify-between gap-2"
				>
					<div class="flex items-center gap-2">
						<code class="rounded-sm bg-destructive/20 px-1 py-0.5 font-mono text-xs font-bold text-destructive">
							{{ inv.raw }}
						</code>
						<span class="text-xs text-muted-foreground">{{ inv.reason }}</span>
					</div>

					<div v-if="inv.suggestions.length > 0" class="flex items-center gap-1">
						<span class="text-xs text-muted-foreground">Suggestion:</span>
						<Button
							v-for="sug in inv.suggestions.slice(0, 2)"
							:key="sug"
							type="button"
							size="sm"
							variant="outline"
							class="
								h-6 gap-1 border-emerald-500/30 bg-emerald-500/10 px-2 font-mono text-xs font-bold text-emerald-600
								hover:bg-emerald-500/20
								dark:text-emerald-400
							"
							@click="replaceInvalidToken(inv.raw, sug)"
						>
							<Sparkles />
							<span>Replace with {{ sug.startsWith('$') ? sug : `$(${sug})` }}</span>
						</Button>
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

.mention-delete-icon {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 10px;
	height: 10px;
	flex-shrink: 0;
}

.mention-delete-icon::before,
.mention-delete-icon::after {
	content: '';
	position: absolute;
	width: 7.5px;
	height: 1.5px;
	background-color: currentColor;
	border-radius: 9999px;
}

.mention-delete-icon::before {
	transform: rotate(45deg);
}

.mention-delete-icon::after {
	transform: rotate(-45deg);
}
</style>
