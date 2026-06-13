<script setup lang="ts">
import { PlusIcon } from 'lucide-vue-next'
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '~/components/ui/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '~/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { Spinner } from '~/components/ui/spinner'

const props = defineProps<{
	open: boolean
}>()

const emit = defineEmits(['update:open', 'added'])

const newLink = ref('')
const isAdding = ref(false)
const validationError = ref('')

watch(() => props.open, (isOpen) => {
	if (isOpen) {
		newLink.value = ''
		validationError.value = ''
	}
})

function parseSpotifyTrackId(input: string): string | null {
	const trimmed = input.trim()
	const uriMatch = trimmed.match(/^spotify:track:([a-zA-Z0-9]{22})$/)
	if (uriMatch)
		return uriMatch[1] || null

	const urlMatch = trimmed.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]{22})/)
	if (urlMatch)
		return urlMatch[1] || null

	return null
}

async function addBlacklistTrack() {
	validationError.value = ''
	const link = newLink.value.trim()
	if (!link) {
		validationError.value = 'Spotify link is required.'
		return
	}

	const trackId = parseSpotifyTrackId(link)
	if (!trackId) {
		validationError.value = 'Invalid Spotify URL or URI. (Direct track links only)'
		return
	}

	isAdding.value = true
	try {
		const res = await $fetch<any>('/api/spotify/blacklist', {
			method: 'POST',
			body: { link },
		})
		toast.success(`Successfully blacklisted "${res.track?.title || 'Track'}"`)
		newLink.value = ''
		emit('added')
		emit('update:open', false)
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to blacklist track.')
	}
	finally {
		isAdding.value = false
	}
}
</script>

<template>
	<Dialog :open="props.open" @update:open="emit('update:open', $event)">
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Add to Blacklist</DialogTitle>
				<DialogDescription>
					Prevent a Spotify track from being requested. If it is already in the queue, it will be automatically removed and refunded.
				</DialogDescription>
			</DialogHeader>

			<div class="flex flex-col gap-4">
				<FieldGroup>
					<Field :data-invalid="validationError ? '' : undefined">
						<FieldLabel for="spotify-link">
							Spotify Track Link / URI
						</FieldLabel>
						<Input
							id="spotify-link"
							v-model="newLink"
							placeholder="e.g. https://open.spotify.com/track/..."
							:disabled="isAdding"
							required
							:aria-invalid="validationError ? 'true' : 'false'"
							@keyup.enter="addBlacklistTrack"
						/>
						<FieldDescription v-if="validationError" class="text-destructive">
							{{ validationError }}
						</FieldDescription>
						<FieldDescription v-else>
							Paste a Spotify track URL or URI (e.g. <code class="rounded-sm bg-muted px-1 py-0.5 text-xs font-semibold select-all">spotify:track:id</code>)
						</FieldDescription>
					</Field>
				</FieldGroup>
			</div>

			<DialogFooter
				class="
					flex gap-2
					sm:justify-end
				"
			>
				<DialogClose as-child>
					<Button variant="outline" :disabled="isAdding">
						Cancel
					</Button>
				</DialogClose>

				<Button :disabled="isAdding || !newLink.trim()" @click="addBlacklistTrack">
					<Spinner v-if="isAdding" data-icon="inline-start" />
					<PlusIcon v-else data-icon="inline-start" />
					{{ isAdding ? 'Blacklisting...' : 'Add to Blacklist' }}
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
</template>
