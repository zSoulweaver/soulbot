<script setup lang="ts">
import {
	Bot,
	Clock,
	LayoutDashboard,
	Music,
	Trophy,
} from '@lucide/vue'
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import TwitchIcon from '~/components/icons/TwitchIcon.vue'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

const route = useRoute()
const { loggedIn, user } = useUserSession()
const { public: { botName } } = useRuntimeConfig()

useHead({
	title: 'Home',
})

const isModeratorOrCaster = computed(() => {
	return loggedIn.value && (user.value?.role === 'caster' || user.value?.role === 'moderator')
})

onMounted(() => {
	if (route.query.error === 'auth_failed') {
		toast.error('Authentication failed. Please check your Twitch credentials or configuration.')
	}
})
</script>

<template>
	<div
		class="
			mx-auto flex max-w-4xl flex-col gap-8 py-8
			md:py-16
		"
	>
		<!-- Hero Section -->
		<div class="relative overflow-hidden rounded-3xl border border-border/40 bg-card/30 p-8 text-center shadow-lg backdrop-blur-md">
			<div class="absolute -top-24 -left-24 size-48 rounded-full bg-primary/20 blur-3xl" />
			<div class="absolute -right-24 -bottom-24 size-48 rounded-full bg-twitch/15 blur-3xl" />

			<div class="relative flex flex-col items-center gap-4">
				<div class="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
					<Bot class="size-10" />
				</div>
				<h1
					class="
						bg-linear-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-4xl font-extrabold tracking-tight text-transparent uppercase
						sm:text-5xl
					"
				>
					{{ botName }} Chat Bot
				</h1>
				<p class="max-w-xl text-lg text-muted-foreground">
					Your interactive companion for stream points, loyalty tracking, custom commands, and real-time requests.
				</p>
			</div>
		</div>

		<!-- Authenticated Greeting / CTA Section -->
		<div class="flex flex-col gap-6">
			<Card v-if="loggedIn && user" class="border-border/40 bg-card/10 backdrop-blur-sm">
				<CardHeader class="flex flex-row items-center gap-4">
					<Avatar class="size-12 border-2 border-primary/20">
						<AvatarImage :src="user.image || ''" :alt="user.displayName" />
						<AvatarFallback>{{ user.displayName[0] }}</AvatarFallback>
					</Avatar>
					<div class="flex-1">
						<div class="flex items-center gap-2">
							<h2 class="text-xl font-bold">
								{{ user.displayName }}
							</h2>
							<Badge
								v-if="user.role === 'caster'" variant="default" class="
									bg-red-500
									hover:bg-red-600
								"
							>
								Caster
							</Badge>
							<Badge
								v-else-if="user.role === 'moderator'" variant="default" class="
									bg-green-600
									hover:bg-green-700
								"
							>
								Mod
							</Badge>
							<Badge v-else variant="outline">
								Viewer
							</Badge>
						</div>
						<p class="text-sm text-muted-foreground">
							Logged in via Twitch
						</p>
					</div>
				</CardHeader>
			</Card>

			<Button
				v-else
				size="lg"
				class="
					bg-twitch text-white shadow-md transition-all duration-200
					hover:bg-twitch-hover
				"
				as-child
			>
				<a href="/api/auth/twitch">
					<TwitchIcon class="mr-2 size-5 fill-current" />
					Log in with Twitch
				</a>
			</Button>
		</div>

		<!-- Quick Links Grid -->
		<div class="flex flex-col gap-4">
			<h3 class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
				Quick Access Links
			</h3>

			<div
				class="
					grid grid-cols-1 gap-4
					sm:grid-cols-2
				"
			>
				<!-- Song Queue -->
				<NuxtLink to="/song-queue" class="group">
					<Card
						class="
							h-full border-border/40 bg-card/10 transition-all duration-200
							group-hover:border-primary/40 group-hover:bg-primary/2 group-hover:shadow-md
						"
					>
						<CardHeader class="flex flex-row items-center gap-4 space-y-0">
							<div
								class="
									flex aspect-square size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors
									group-hover:bg-primary/20
								"
							>
								<Music class="size-6" />
							</div>
							<div>
								<CardTitle
									class="
										text-base transition-colors
										group-hover:text-primary
									"
								>
									Song Queue
								</CardTitle>
								<CardDescription class="mt-0.5 text-xs">
									Request songs and view what's currently playing.
								</CardDescription>
							</div>
						</CardHeader>
					</Card>
				</NuxtLink>

				<!-- Points Leaderboard -->
				<NuxtLink to="/leaderboard/points" class="group">
					<Card
						class="
							h-full border-border/40 bg-card/10 transition-all duration-200
							group-hover:border-primary/40 group-hover:bg-primary/2 group-hover:shadow-md
						"
					>
						<CardHeader class="flex flex-row items-center gap-4 space-y-0">
							<div
								class="
									flex aspect-square size-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 transition-colors
									group-hover:bg-amber-500/20
								"
							>
								<Trophy class="size-6" />
							</div>
							<div>
								<CardTitle
									class="
										text-base transition-colors
										group-hover:text-amber-500
									"
								>
									Points Leaderboard
								</CardTitle>
								<CardDescription class="mt-0.5 text-xs">
									Check out the top stream point earners and gamblers.
								</CardDescription>
							</div>
						</CardHeader>
					</Card>
				</NuxtLink>

				<!-- Watch Time -->
				<NuxtLink to="/leaderboard/watch-time" class="group">
					<Card
						class="
							h-full border-border/40 bg-card/10 transition-all duration-200
							group-hover:border-primary/40 group-hover:bg-primary/2 group-hover:shadow-md
						"
					>
						<CardHeader class="flex flex-row items-center gap-4 space-y-0">
							<div
								class="
									flex aspect-square size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 transition-colors
									group-hover:bg-emerald-500/20
								"
							>
								<Clock class="size-6" />
							</div>
							<div>
								<CardTitle
									class="
										text-base transition-colors
										group-hover:text-emerald-500
									"
								>
									Watch Time
								</CardTitle>
								<CardDescription class="mt-0.5 text-xs">
									See who has spent the most time hanging out in chat.
								</CardDescription>
							</div>
						</CardHeader>
					</Card>
				</NuxtLink>

				<!-- Admin Dashboard (Only for moderators/casters) -->
				<NuxtLink v-if="isModeratorOrCaster" to="/admin" class="group">
					<Card
						class="
							h-full border-border/40 bg-card/10 transition-all duration-200
							group-hover:border-primary/40 group-hover:bg-primary/2 group-hover:shadow-md
						"
					>
						<CardHeader class="flex flex-row items-center gap-4 space-y-0">
							<div
								class="
									flex aspect-square size-12 items-center justify-center rounded-xl bg-red-500/10 text-red-500 transition-colors
									group-hover:bg-red-500/20
								"
							>
								<LayoutDashboard class="size-6" />
							</div>
							<div>
								<CardTitle
									class="
										text-base transition-colors
										group-hover:text-red-500
									"
								>
									Bot Administration
								</CardTitle>
								<CardDescription class="mt-0.5 text-xs">
									Access dashboard, configuration settings, and actions.
								</CardDescription>
							</div>
						</CardHeader>
					</Card>
				</NuxtLink>
			</div>
		</div>
	</div>
</template>
