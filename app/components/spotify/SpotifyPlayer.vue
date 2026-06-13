<script setup lang="ts">
import type { CurrentlyPlayingTrack } from '~/types/spotify'
import { Link2, Radio } from '@lucide/vue'
import { computed } from 'vue'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '~/components/ui/card'

import { Progress } from '~/components/ui/progress'

const props = withDefaults(defineProps<{
	currentlyPlaying?: CurrentlyPlayingTrack | null
	rateLimited?: boolean
	activeProgressMs?: number
	showDefaultFooter?: boolean
}>(), {
	currentlyPlaying: null,
	rateLimited: false,
	activeProgressMs: 0,
	showDefaultFooter: true,
})

const progressPercent = computed(() => {
	if (!props.currentlyPlaying || !props.currentlyPlaying.durationMs)
		return 0
	return (props.activeProgressMs / props.currentlyPlaying.durationMs) * 100
})

function formatTime(ms: number) {
	const totalSeconds = Math.floor(ms / 1000)
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds % 60
	return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
</script>

<template>
	<Card class="relative">
		<!-- Blurred Album Art Background -->
		<img
			v-if="props.currentlyPlaying?.albumArt"
			:src="props.currentlyPlaying.albumArt"
			class="pointer-events-none absolute inset-0 size-full object-cover opacity-15 blur-2xl"
			alt=""
		>
		<CardHeader class="z-1 flex flex-row items-center justify-between">
			<CardTitle class="text-xs font-bold tracking-wider text-muted-foreground uppercase">
				Now Playing
			</CardTitle>
			<Badge v-if="props.rateLimited" variant="destructive">
				RATE LIMITED
			</Badge>
			<Badge
				v-else-if="props.currentlyPlaying?.isPlaying"
				class="
					border-emerald-500/10 bg-emerald-600/10 text-emerald-600
					dark:text-emerald-500
				"
			>
				PLAYING
			</Badge>
			<Badge
				v-else-if="props.currentlyPlaying"
				variant="secondary"
				class="
					border-amber-500/10 bg-amber-600/10 text-amber-600
					dark:text-amber-500
				"
			>
				PAUSED
			</Badge>
			<Badge v-else variant="secondary">
				OFFLINE
			</Badge>
		</CardHeader>
		<CardContent class="z-1 space-y-6">
			<!-- Album Art cover frame -->
			<div v-if="props.currentlyPlaying" class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-background/70 shadow-sm">
				<img
					v-if="props.currentlyPlaying?.albumArt"
					:src="props.currentlyPlaying.albumArt"
					class="size-full object-cover"
					alt="Album Art"
				>
				<!-- Vinyl / Radio Placeholder -->
				<div v-else class="flex flex-col items-center justify-center p-6 text-muted-foreground">
					<p class="text-center text-xs font-medium">
						No Cover Art Available
					</p>
				</div>
			</div>

			<!-- Song Metadata -->
			<div v-if="props.currentlyPlaying" class="space-y-1 text-center">
				<p class="line-clamp-1 text-lg font-bold text-foreground">
					{{ props.currentlyPlaying.title }}
				</p>
				<p class="line-clamp-1 text-sm text-muted-foreground">
					{{ props.currentlyPlaying.artist }}
				</p>
				<p v-if="props.currentlyPlaying.albumName" class="line-clamp-1 text-xs text-muted-foreground/70 italic">
					{{ props.currentlyPlaying.albumName }}
				</p>
			</div>

			<div v-else class="space-y-2 py-6 text-center">
				<Radio class="mx-auto size-10 animate-pulse stroke-1 text-muted-foreground" />
				<p class="text-sm font-semibold text-muted-foreground">
					No playback active
				</p>
				<p class="mx-auto max-w-3xs text-xs text-muted-foreground/80">
					Song Requests are not enabled or Spotify might not be playing right now.
				</p>
			</div>

			<!-- Playback Progress Bar -->
			<div v-if="props.currentlyPlaying" class="space-y-2">
				<ClientOnly>
					<Progress :model-value="progressPercent" class="h-1" />
					<div class="flex justify-between text-xs text-muted-foreground select-none">
						<span>{{ formatTime(props.activeProgressMs) }}</span>
						<span>{{ formatTime(props.currentlyPlaying.durationMs || 0) }}</span>
					</div>
					<template #fallback>
						<Progress :model-value="0" class="h-1" />
						<div class="flex justify-between text-xs text-muted-foreground select-none">
							<span>0:00</span>
							<span>{{ formatTime(props.currentlyPlaying.durationMs || 0) }}</span>
						</div>
					</template>
				</ClientOnly>
			</div>

			<!-- Custom Controls Slot -->
			<slot name="controls" />
		</CardContent>

		<!-- Footer -->
		<slot name="footer">
			<CardFooter v-if="props.showDefaultFooter && props.currentlyPlaying?.link" class="z-1">
				<Button
					as="a"
					:href="props.currentlyPlaying.link"
					target="_blank"
					variant="ghost"
					size="sm"
					class="w-full gap-1.5"
				>
					<Link2 class="size-4" />
					Open in Spotify
				</Button>
			</CardFooter>
		</slot>
	</Card>
</template>
