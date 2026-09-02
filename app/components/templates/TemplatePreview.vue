<script setup lang="ts">
import { Bot } from '@lucide/vue'
import DiscordIcon from '~/components/icons/DiscordIcon.vue'
import TwitchIcon from '~/components/icons/TwitchIcon.vue'

const props = withDefaults(
	defineProps<{
		text: string
		mode?: 'twitch' | 'discord'
		botName?: string
		replyTo?: string
	}>(),
	{
		mode: 'twitch',
		botName: 'SoulBot',
		replyTo: undefined,
	},
)
</script>

<template>
	<div class="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-muted/40 p-3">
		<div class="flex items-center justify-between text-[11px] font-semibold text-muted-foreground select-none">
			<div class="flex items-center gap-1.5">
				<TwitchIcon v-if="props.mode === 'twitch'" class="size-3.5 text-twitch" />
				<DiscordIcon v-else class="size-3.5 text-[#5865F2]" />
				<span>Live Preview</span>
			</div>
			<span class="text-[10px] text-muted-foreground/80">Simulated Output</span>
		</div>

		<!-- Twitch Chat Bubble -->
		<div
			v-if="props.mode === 'twitch'"
			class="
				flex items-baseline gap-1.5 rounded-md border border-border/40 bg-background/90 px-3 py-2 text-xs
				dark:bg-zinc-950/70
			"
		>
			<span class="font-bold text-twitch select-none">
				{{ props.botName }}:
			</span>
			<span class="wrap-break-word text-foreground/90">
				<template v-if="props.replyTo">
					<span class="font-semibold text-muted-foreground select-none">@{{ props.replyTo }}, </span>
				</template>
				{{ props.text || '...' }}
			</span>
		</div>

		<!-- Discord Message Bubble -->
		<div
			v-else
			class="
				flex items-start gap-3 rounded-md border border-border/40 bg-[#313338]/10 px-3 py-2.5 text-xs
				dark:bg-[#313338]/60
			"
		>
			<div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#5865F2] text-white">
				<Bot class="size-4" />
			</div>
			<div class="flex flex-col gap-0.5">
				<div class="flex items-center gap-1.5">
					<span class="font-semibold text-foreground select-none">{{ props.botName }}</span>
					<span class="rounded-sm bg-[#5865F2] px-1 py-0.5 text-[9px] font-bold text-white uppercase select-none">APP</span>
					<span class="text-[10px] text-muted-foreground select-none">Today at 12:00 PM</span>
				</div>
				<p class="leading-relaxed wrap-break-word text-foreground/90">
					<template v-if="props.replyTo">
						<span class="font-semibold text-muted-foreground select-none">@{{ props.replyTo }}, </span>
					</template>
					{{ props.text || '...' }}
				</p>
			</div>
		</div>
	</div>
</template>
