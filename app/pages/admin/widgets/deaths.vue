<script setup lang="ts">
import type { AdminWidgetResponse } from '~/types/widgets'
import { Check, Copy, RefreshCcw } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import TemplateEditor from '~/components/templates/TemplateEditor.vue'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { NumberField, NumberFieldContent, NumberFieldDecrement, NumberFieldIncrement, NumberFieldInput } from '~/components/ui/number-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import {
	SettingsGroup,
	SettingsGroupAction,
	SettingsGroupContent,
	SettingsGroupDescription,
	SettingsGroupItem,
	SettingsGroupLabel,
} from '~/components/ui/settings-group'
import { SettingsHeading } from '~/components/ui/settings-heading'
import { Spinner } from '~/components/ui/spinner'
import { Switch } from '~/components/ui/switch'
import { Textarea } from '~/components/ui/textarea'

useRequireUserRole(['caster'])

useHead({
	title: 'Death Counter Widget - Bot Administration',
})

const requestUrl = useRequestURL()
const { data: pageData, pending: loading, refresh } = useFetch<AdminWidgetResponse>('/api/admin/widgets/deaths')

const regeneratedKey = ref('')
const secretKey = computed(() => regeneratedKey.value || pageData.value?.key || '')

const template = ref('$(game) Deaths: $(count)')
const initialTemplate = ref('$(game) Deaths: $(count)')

const styles = ref({
	fontFamily: 'Inter',
	fontSize: 36,
	fontWeight: '700',
	color: '#ffffff',
	backgroundColor: 'transparent',
	textAlign: 'center',
	customCss: '',
	showActiveCounter: true,
})
const initialStyles = ref<Record<string, any>>({})

const isSaving = ref(false)
const isRegeneratingKey = ref(false)
const isRegenerateDialogOpen = ref(false)
const copied = ref(false)
const previewIframe = ref<HTMLIFrameElement | null>(null)

// Synchronize state when data resolves
watch(pageData, (newData) => {
	if (newData?.widget) {
		const loadedTemplate = newData.widget.template || '$(game) Deaths: $(count)'
		template.value = loadedTemplate
		initialTemplate.value = loadedTemplate

		if (newData.widget.styles) {
			const loadedStyles = { ...styles.value, ...newData.widget.styles }
			styles.value = loadedStyles
			initialStyles.value = JSON.parse(JSON.stringify(loadedStyles))
		}
	}
}, { immediate: true })

const isModified = computed(() => {
	return template.value !== initialTemplate.value
		|| JSON.stringify(styles.value) !== JSON.stringify(initialStyles.value)
})

const widgetUrl = computed(() => {
	const key = secretKey.value
	if (!key)
		return ''
	const origin = import.meta.client ? window.location.origin : requestUrl.origin
	return `${origin}/widgets/deaths?key=${key}`
})

const iframeSrc = computed(() => {
	const key = secretKey.value
	return key ? `/widgets/deaths?key=${key}&preview=1` : '/widgets/deaths?preview=1'
})

// Sync draft changes to live preview iframe via postMessage safely unwrapping reactive proxies
watch([template, styles], () => {
	if (previewIframe.value && previewIframe.value.contentWindow) {
		previewIframe.value.contentWindow.postMessage({
			type: 'WIDGET_PREVIEW_UPDATE',
			payload: {
				draftTemplate: template.value,
				draftStyles: JSON.parse(JSON.stringify(styles.value)),
			},
		}, '*')
	}
}, { deep: true })

async function copyUrl() {
	if (!widgetUrl.value)
		return
	try {
		await navigator.clipboard.writeText(widgetUrl.value)
		copied.value = true
		toast.success('Widget URL copied to clipboard!')
		setTimeout(() => {
			copied.value = false
		}, 2000)
	}
	catch {
		toast.error('Failed to copy URL to clipboard')
	}
}

function promptRegenerateKey() {
	isRegenerateDialogOpen.value = true
}

async function confirmRegenerateKey() {
	isRegenerateDialogOpen.value = false
	if (isRegeneratingKey.value)
		return

	isRegeneratingKey.value = true
	try {
		const res = await $fetch<{ key: string }>('/api/admin/widgets/key', {
			method: 'POST',
		})
		regeneratedKey.value = res.key
		toast.success('Widget secret key regenerated successfully!')
		await refresh()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to regenerate key')
	}
	finally {
		isRegeneratingKey.value = false
	}
}

async function saveSettings() {
	if (isSaving.value)
		return
	isSaving.value = true

	try {
		await $fetch('/api/admin/widgets/deaths', {
			method: 'PUT',
			body: {
				template: template.value,
				styles: styles.value,
			},
		})
		initialTemplate.value = template.value
		initialStyles.value = JSON.parse(JSON.stringify(styles.value))
		toast.success('Death counter widget settings saved!')
		await refresh()
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to save widget settings')
	}
	finally {
		isSaving.value = false
	}
}

function discardChanges() {
	template.value = initialTemplate.value
	styles.value = JSON.parse(JSON.stringify(initialStyles.value))
	toast.info('Unsaved changes discarded')
}

const FONT_OPTIONS = [
	'Inter',
	'Roboto',
	'Outfit',
	'Montserrat',
	'Impact',
	'Arial',
	'Trebuchet MS',
	'Courier New',
	'Georgia',
]

const FONT_WEIGHT_OPTIONS = [
	{ label: 'Normal (400)', value: '400' },
	{ label: 'Medium (500)', value: '500' },
	{ label: 'Semi-Bold (600)', value: '600' },
	{ label: 'Bold (700)', value: '700' },
	{ label: 'Extra Bold (800)', value: '800' },
	{ label: 'Black (900)', value: '900' },
]

const TEXT_ALIGN_OPTIONS = [
	{ label: 'Left', value: 'left' },
	{ label: 'Center', value: 'center' },
	{ label: 'Right', value: 'right' },
]
</script>

<template>
	<AppSettingsPage
		heading="Death Counter Widget"
		subheading="Customize text templates, typography, colors, and generate OBS browser source links for your stream."
	>
		<template #header-actions>
			<AppRefreshButton :loading="loading" @click="refresh" />
		</template>

		<!-- Full Page Loader -->
		<div v-if="loading || !pageData" class="flex flex-col items-center justify-center gap-2 py-20">
			<Spinner class="size-8 text-primary" />
			<span class="text-sm text-muted-foreground">Retrieving widget settings...</span>
		</div>

		<AppSettingsGrid v-else>
			<!-- Main Settings Column (Default Slot) -->
			<div class="flex flex-col gap-6">
				<!-- Section 1: OBS Browser Source URL -->
				<div class="flex flex-col gap-1">
					<SettingsHeading>
						OBS Browser Source Link
					</SettingsHeading>

					<FieldGroup class="flex flex-col gap-4">
						<Field>
							<FieldLabel for="widget-url-input">
								Widget Secret URL
							</FieldLabel>
							<div class="flex items-center gap-2">
								<Input
									id="widget-url-input"
									v-model:model-value="widgetUrl"
									readonly
									class="w-full font-mono"
								/>
								<Button size="sm" variant="secondary" class="shrink-0" @click="copyUrl">
									<Check v-if="copied" class="mr-1.5 size-4 text-green-500" />
									<Copy v-else class="mr-1.5 size-4" />
									{{ copied ? 'Copied' : 'Copy URL' }}
								</Button>
								<Button size="sm" variant="destructive" class="shrink-0" :disabled="isRegeneratingKey" @click="promptRegenerateKey">
									<RefreshCcw class="mr-1.5 size-4" :class="{ 'animate-spin': isRegeneratingKey }" />
									Regenerate
								</Button>
							</div>
							<FieldDescription>
								Copy this URL into OBS. Anyone with this key can view your stream widget.
							</FieldDescription>
						</Field>
					</FieldGroup>
				</div>

				<!-- Section 2: Text Template -->
				<div class="flex flex-col gap-1">
					<SettingsHeading>
						Text Template
					</SettingsHeading>

					<FieldGroup class="flex flex-col gap-4">
						<Field>
							<FieldLabel for="template-input">
								Display Template
							</FieldLabel>
							<TemplateEditor
								id="template-input"
								v-model="template"
								scope="widgets.deaths"
								placeholder="$(game) Deaths: $(count)"
							/>
							<FieldDescription>
								Customize the text shown on stream.
							</FieldDescription>
						</Field>
					</FieldGroup>

					<SettingsGroup class="mt-4">
						<SettingsGroupItem>
							<SettingsGroupContent>
								<SettingsGroupLabel>Show Active Counter</SettingsGroupLabel>
								<SettingsGroupDescription>
									Display the active death counter name (e.g. [DLC]) in the widget.
								</SettingsGroupDescription>
							</SettingsGroupContent>
							<SettingsGroupAction>
								<Switch v-model:model-value="styles.showActiveCounter" />
							</SettingsGroupAction>
						</SettingsGroupItem>
					</SettingsGroup>
				</div>

				<!-- Section 3: Visual Styling -->
				<div class="flex flex-col gap-1">
					<SettingsHeading>
						Typography & Visual Styling
					</SettingsHeading>

					<SettingsGroup>
						<!-- Font Family -->
						<SettingsGroupItem>
							<SettingsGroupContent>
								<SettingsGroupLabel>Font Family</SettingsGroupLabel>
								<SettingsGroupDescription>Select font family for overlay text.</SettingsGroupDescription>
							</SettingsGroupContent>
							<SettingsGroupAction>
								<Select v-model="styles.fontFamily">
									<SelectTrigger class="w-64">
										<SelectValue placeholder="Select font" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem v-for="font in FONT_OPTIONS" :key="font" :value="font">
											{{ font }}
										</SelectItem>
									</SelectContent>
								</Select>
							</SettingsGroupAction>
						</SettingsGroupItem>

						<!-- Font Size -->
						<SettingsGroupItem>
							<SettingsGroupContent>
								<SettingsGroupLabel>Font Size (px)</SettingsGroupLabel>
								<SettingsGroupDescription>Set font size in pixels.</SettingsGroupDescription>
							</SettingsGroupContent>
							<SettingsGroupAction>
								<NumberField id="font-size" v-model="styles.fontSize" :min="12" :max="160" class="w-64">
									<NumberFieldContent>
										<NumberFieldDecrement />
										<NumberFieldInput />
										<NumberFieldIncrement />
									</NumberFieldContent>
								</NumberField>
							</SettingsGroupAction>
						</SettingsGroupItem>

						<!-- Font Weight -->
						<SettingsGroupItem>
							<SettingsGroupContent>
								<SettingsGroupLabel>Font Weight</SettingsGroupLabel>
								<SettingsGroupDescription>Set font thickness/weight.</SettingsGroupDescription>
							</SettingsGroupContent>
							<SettingsGroupAction>
								<Select v-model="styles.fontWeight">
									<SelectTrigger class="w-64">
										<SelectValue placeholder="Select weight" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem v-for="w in FONT_WEIGHT_OPTIONS" :key="w.value" :value="w.value">
											{{ w.label }}
										</SelectItem>
									</SelectContent>
								</Select>
							</SettingsGroupAction>
						</SettingsGroupItem>

						<!-- Text Alignment -->
						<SettingsGroupItem>
							<SettingsGroupContent>
								<SettingsGroupLabel>Text Alignment</SettingsGroupLabel>
								<SettingsGroupDescription>Set text horizontal alignment.</SettingsGroupDescription>
							</SettingsGroupContent>
							<SettingsGroupAction>
								<Select v-model="styles.textAlign">
									<SelectTrigger class="w-64">
										<SelectValue placeholder="Select alignment" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem v-for="align in TEXT_ALIGN_OPTIONS" :key="align.value" :value="align.value">
											{{ align.label }}
										</SelectItem>
									</SelectContent>
								</Select>
							</SettingsGroupAction>
						</SettingsGroupItem>

						<!-- Text Color -->
						<SettingsGroupItem>
							<SettingsGroupContent>
								<SettingsGroupLabel>Text Color</SettingsGroupLabel>
								<SettingsGroupDescription>Primary text color (hex code).</SettingsGroupDescription>
							</SettingsGroupContent>
							<SettingsGroupAction>
								<div class="flex w-64 items-center gap-2">
									<input
										type="color"
										:value="styles.color"
										class="size-9 cursor-pointer rounded-md border bg-background p-1"
										@input="(e: any) => styles.color = e.target.value"
									>
									<Input v-model="styles.color" class="flex-1 font-mono text-xs" />
								</div>
							</SettingsGroupAction>
						</SettingsGroupItem>

						<!-- Background Color -->
						<SettingsGroupItem>
							<SettingsGroupContent>
								<SettingsGroupLabel>Background Color</SettingsGroupLabel>
								<SettingsGroupDescription>Overlay container background (transparent or rgba).</SettingsGroupDescription>
							</SettingsGroupContent>
							<SettingsGroupAction>
								<Input v-model="styles.backgroundColor" placeholder="transparent" class="w-64 font-mono text-xs" />
							</SettingsGroupAction>
						</SettingsGroupItem>
					</SettingsGroup>

					<!-- Custom CSS Full-Width Field -->
					<FieldGroup class="mt-4 flex flex-col gap-4">
						<Field>
							<FieldLabel for="custom-css">
								Custom CSS
							</FieldLabel>
							<Textarea
								id="custom-css"
								v-model="styles.customCss"
								placeholder=".widget-deaths-text { text-transform: uppercase; }"
								rows="4"
								class="w-full font-mono text-xs"
							/>
							<FieldDescription>
								Add custom CSS rules targeting widget elements.
							</FieldDescription>
						</Field>
					</FieldGroup>
				</div>
			</div>

			<!-- Right Sidebar Column (#sidebar Slot) -->
			<template #sidebar>
				<div class="sticky top-6 flex flex-col gap-4">
					<Card class="overflow-hidden">
						<CardHeader class="pb-3">
							<CardTitle class="text-base">
								Live OBS Preview
							</CardTitle>
							<CardDescription>
								Real-time preview of your widget as it will appear in OBS.
							</CardDescription>
						</CardHeader>
						<CardContent class="border-t bg-black/80 p-0">
							<div class="flex min-h-40 items-center justify-center p-4">
								<ClientOnly>
									<iframe
										ref="previewIframe"
										:src="iframeSrc"
										class="h-40 w-full border-0 bg-transparent"
									/>
									<template #fallback>
										<div class="flex h-40 w-full items-center justify-center text-xs text-muted-foreground">
											Loading preview...
										</div>
									</template>
								</ClientOnly>
							</div>
						</CardContent>
					</Card>
				</div>
			</template>
		</AppSettingsGrid>

		<!-- Floating Save Bar -->
		<AppFloatingSaveBar
			:show="isModified"
			:is-saving="isSaving"
			title="Unsaved Widget Settings"
			description="You have unsaved changes to your Death Counter widget."
			save-text="Save Settings"
			saving-text="Saving..."
			@save="saveSettings"
			@discard="discardChanges"
		/>

		<!-- Secret key regeneration confirmation alert dialog -->
		<AlertDialog :open="isRegenerateDialogOpen" @update:open="isRegenerateDialogOpen = $event">
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Regenerate Secret Key?</AlertDialogTitle>
					<AlertDialogDescription>
						Regenerating your secret key will immediately invalidate all existing OBS browser sources using the current key. You will need to update your OBS browser source URLs.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction @click="confirmRegenerateKey">
						Regenerate Key
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	</AppSettingsPage>
</template>
