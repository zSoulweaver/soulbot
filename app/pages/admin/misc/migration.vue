<script setup lang="ts">
import { Database, RefreshCcw, UploadCloud } from '@lucide/vue'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Spinner } from '~/components/ui/spinner'
import { Switch } from '~/components/ui/switch'

const botType = ref('phantombot')

useHead({
	title: 'Database Migration',
})

const override = ref(false)
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const dragActive = ref(false)
const migrating = ref(false)
const errorMsg = ref<string | null>(null)

interface MigrationStats {
	users: number
	commands: number
	timers: number
	currencyName: string
	currencyNamePlural: string
}

const stats = ref<MigrationStats | null>(null)

function triggerFileSelect() {
	if (migrating.value)
		return
	fileInput.value?.click()
}

function onFileChange(e: Event) {
	const target = e.target as HTMLInputElement
	if (target.files && target.files.length > 0) {
		file.value = target.files[0] || null
		errorMsg.value = null
		stats.value = null
	}
}

function onDragOver(_e: DragEvent) {
	if (migrating.value)
		return
	dragActive.value = true
}

function onDragLeave() {
	dragActive.value = false
}

function onDrop(e: DragEvent) {
	if (migrating.value)
		return
	dragActive.value = false
	if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
		const droppedFile = e.dataTransfer.files[0]
		if (droppedFile && (droppedFile.name.endsWith('.db') || droppedFile.name.endsWith('.sqlite') || droppedFile.name.endsWith('.sqlite3'))) {
			file.value = droppedFile
			errorMsg.value = null
			stats.value = null
		}
		else {
			toast.error('Please upload a valid SQLite database (.db or .sqlite) file.')
		}
	}
}

function formatBytes(bytes: number): string {
	if (bytes === 0)
		return '0 Bytes'
	const k = 1024
	const sizes = ['Bytes', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

function resetForm() {
	file.value = null
	stats.value = null
	errorMsg.value = null
	if (fileInput.value) {
		fileInput.value.value = ''
	}
}

async function runMigration() {
	if (!file.value || migrating.value)
		return

	migrating.value = true
	errorMsg.value = null
	stats.value = null

	const formData = new FormData()
	formData.append('file', file.value)
	formData.append('override', String(override.value))
	formData.append('botType', botType.value)

	try {
		const res = await $fetch<{ success: boolean, stats: MigrationStats }>('/api/migration/import', {
			method: 'POST',
			body: formData,
		})

		if (res.success) {
			stats.value = res.stats
			toast.success('Database migration completed successfully!')
		}
		else {
			throw new Error('Migration API returned failure state')
		}
	}
	catch (err: any) {
		console.error(err)
		errorMsg.value = err.data?.statusMessage || err.message || 'An unexpected error occurred during database migration.'
		toast.error('Database migration failed.')
	}
	finally {
		migrating.value = false
	}
}
</script>

<template>
	<div>
		<AppPageHeader
			heading="Database Migration"
			subheading="Migrate custom commands, user points, watch time, and timers from other Twitch chat bot databases."
		/>

		<AppPageContainer>
			<!-- Success Metrics Alert -->
			<Alert v-if="stats" variant="success">
				<AlertTitle>Migration Completed Successfully!</AlertTitle>
				<AlertDescription>
					<p class="mb-2">
						Successfully imported data from the provided database:
					</p>
					<ul class="list-disc space-y-1 pl-5">
						<li>Users: <span class="font-bold">{{ stats.users }}</span></li>
						<li>Commands: <span class="font-bold">{{ stats.commands }}</span></li>
						<li>Timers: <span class="font-bold">{{ stats.timers }}</span></li>
						<li>Currency Name: <span class="font-bold">{{ stats.currencyNamePlural }}</span></li>
					</ul>
				</AlertDescription>
			</Alert>

			<!-- Error Feedback -->
			<Alert v-if="errorMsg" variant="destructive">
				<AlertTitle>Migration Error</AlertTitle>
				<AlertDescription>{{ errorMsg }}</AlertDescription>
			</Alert>

			<!-- Main migration form (Directly on background, full width design) -->
			<div class="flex w-full flex-col gap-8">
				<!-- Configuration Section -->
				<div class="flex flex-col gap-4">
					<h3 class="flex items-center gap-2 text-lg font-semibold">
						<Database class="size-5 text-muted-foreground" />
						Migration Configuration
					</h3>
					<FieldGroup
						class="
							flex-wrap gap-6
							sm:flex-row
						"
					>
						<Field
							class="
								w-full
								sm:w-80
							"
						>
							<FieldLabel for="botType">
								Select Source Bot
							</FieldLabel>
							<Select id="botType" v-model="botType" :disabled="migrating">
								<SelectTrigger class="w-full">
									<SelectValue placeholder="Select platform" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="phantombot">
										Phantombot (SQLite)
									</SelectItem>
								</SelectContent>
							</Select>
							<FieldDescription>Choose the source database platform to migrate from.</FieldDescription>
						</Field>

						<Field
							class="
								w-full
								sm:w-96
							"
						>
							<FieldLabel for="override">
								Overwrite Existing Data
							</FieldLabel>
							<div class="flex h-10 items-center">
								<Switch id="override" v-model:model-value="override" :disabled="migrating" />
							</div>
							<FieldDescription>Replace existing users' points, watch time, and duplicate commands/timers. Unchecked skips existing records.</FieldDescription>
						</Field>
					</FieldGroup>
				</div>

				<!-- Database File Upload -->
				<div class="flex flex-col gap-4">
					<h3 class="flex items-center gap-2 text-lg font-semibold">
						<UploadCloud class="size-5 text-muted-foreground" />
						Database File Upload
					</h3>
					<div
						class="
							relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-10 text-center transition-all
							hover:bg-muted/30
						"
						:class="{
							'scale-[0.99] border-primary bg-primary/5 shadow-inner': dragActive,
							'border-primary/50 bg-primary/5': file,
							'border-muted-foreground/30': !dragActive && !file,
							'cursor-not-allowed opacity-60': migrating,
						}"
						@dragenter.prevent="onDragOver"
						@dragover.prevent="onDragOver"
						@dragleave.prevent="onDragLeave"
						@drop.prevent="onDrop"
						@click="triggerFileSelect"
					>
						<input
							ref="fileInput"
							type="file"
							class="hidden"
							accept=".db,.sqlite,.sqlite3"
							:disabled="migrating"
							@change="onFileChange"
						>
						<div class="rounded-full bg-primary/10 p-3 text-primary">
							<UploadCloud v-if="!file" class="size-8" />
							<Database v-else class="size-8" />
						</div>
						<div v-if="!file" class="flex flex-col gap-1">
							<span class="text-sm font-semibold">Click to upload or drag & drop</span>
							<span class="text-xs text-muted-foreground">Compatible SQLite database files (.db, .sqlite)</span>
						</div>
						<div v-else class="flex flex-col gap-1">
							<span class="max-w-md truncate text-sm font-semibold text-primary">{{ file.name }}</span>
							<span class="text-xs text-muted-foreground">{{ formatBytes(file.size) }}</span>
						</div>
					</div>
				</div>

				<!-- Action Buttons -->
				<div class="flex justify-end gap-3">
					<Button
						variant="outline"
						:disabled="migrating || !file"
						@click="resetForm"
					>
						Clear File
					</Button>
					<Button
						:disabled="migrating || !file"
						@click="runMigration"
					>
						<Spinner v-if="migrating" class="mr-2 size-4" />
						<RefreshCcw v-else class="mr-2 size-4" />
						{{ migrating ? 'Migrating Database...' : 'Start Migration' }}
					</Button>
				</div>
			</div>
		</AppPageContainer>
	</div>
</template>
