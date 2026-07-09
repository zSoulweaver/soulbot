<script setup lang="ts">
import type { GamblingLeaderboardResponse } from '~/types/loyalty'
import {
	FlameIcon,
	MedalIcon,
	SparklesIcon,
	TrendingDownIcon,
	TrendingUpIcon,
	TrophyIcon,
} from '@lucide/vue'
import { computed } from 'vue'

useHead({
	title: 'Points Leaderboard',
})

// Non-blocking parallel data fetches
const { data: leaderboard, pending: pendingLeaderboard } = useFetch<any[]>('/api/loyalty/leaderboard')
const { data: gamblingData, pending: pendingGambling } = useFetch<GamblingLeaderboardResponse>('/api/loyalty/gambling/leaderboard')

// Computed configuration for the four sideboards to keep templates DRY
const sideboards = computed(() => {
	if (!gamblingData.value)
		return []
	return [
		{
			title: 'Biggest Gainers',
			icon: TrendingUpIcon,
			iconClass: 'text-emerald-500',
			items: gamblingData.value.topGainers,
			formatValue: (u: any) => `+${u.gambleNetPoints.toLocaleString()}`,
			valueClass: 'text-emerald-500 font-bold',
			subValue: () => '',
			col: 'left',
		},
		{
			title: 'Biggest Losers',
			icon: TrendingDownIcon,
			iconClass: 'text-red-500',
			items: gamblingData.value.topLosers,
			formatValue: (u: any) => u.gambleNetPoints.toLocaleString(),
			valueClass: 'text-red-500 font-bold',
			subValue: () => '',
			col: 'left',
		},
		{
			title: 'Luckiest Users',
			icon: SparklesIcon,
			iconClass: 'text-yellow-500',
			items: gamblingData.value.luckiest,
			formatValue: (u: any) => `${u.winRate}%`,
			subValue: (u: any) => `${u.gambleWins}/${u.totalGambles} W/L`,
			valueClass: 'text-yellow-500 font-bold',
			col: 'right',
		},
		{
			title: 'Unluckiest Users',
			icon: FlameIcon,
			iconClass: 'text-orange-500',
			items: gamblingData.value.unluckiest,
			formatValue: (u: any) => `${u.winRate}%`,
			subValue: (u: any) => `${u.gambleWins}/${u.totalGambles} W/L`,
			valueClass: 'text-orange-500 font-bold',
			col: 'right',
		},
	]
})
</script>

<template>
	<AppPageContainer
		class="
			mx-auto max-w-7xl px-4 py-8
			sm:px-6
			lg:px-8
		"
	>
		<!-- Page Header -->
		<div class="mb-8 flex flex-col gap-2 text-center">
			<h1 class="flex items-center justify-center gap-4 text-4xl font-black tracking-tight text-foreground uppercase">
				Points Leaderboard
			</h1>
			<p class="text-lg text-muted-foreground">
				The elite point earners and gamblers in our community.
			</p>
		</div>

		<!-- Main Responsive Grid -->
		<div
			class="
				grid grid-cols-1 gap-8
				lg:grid-cols-12
			"
		>
			<!-- LEFT COLUMN: Gainers & Losers (Stacks below on mobile) -->
			<div
				class="
					order-2 col-span-12 flex flex-col gap-8
					lg:order-1 lg:col-span-3
				"
			>
				<div
					v-for="board in sideboards.filter(b => b.col === 'left')"
					:key="board.title"
					class="rounded-xl border border-border/50 bg-card/40 p-4 shadow-sm backdrop-blur-sm"
				>
					<h2 class="mb-4 flex items-center gap-2 text-base font-bold tracking-wider text-muted-foreground uppercase">
						<component :is="board.icon" class="size-5" :class="board.iconClass" />
						{{ board.title }}
					</h2>

					<div class="flex flex-col gap-3">
						<template v-if="pendingGambling">
							<div v-for="i in 5" :key="i" class="flex items-center gap-3">
								<Skeleton class="size-4 rounded-full" />
								<Skeleton class="size-8 rounded-full" />
								<Skeleton class="h-4 w-20" />
								<Skeleton class="ml-auto h-4 w-12" />
							</div>
						</template>

						<template v-else-if="board.items.length">
							<div
								v-for="(user, index) in board.items"
								:key="user.id"
								class="
									flex items-center gap-3 border-b border-border/30 py-1
									last:border-0
								"
							>
								<span class="w-4 text-center font-mono text-xs text-muted-foreground">
									{{ index + 1 }}
								</span>
								<Avatar class="size-7">
									<AvatarFallback class="text-xs">
										{{ user.displayName[0] }}
									</AvatarFallback>
								</Avatar>
								<div class="flex min-w-0 flex-col">
									<span class="truncate text-sm/tight font-semibold text-foreground">
										{{ user.displayName }}
									</span>
								</div>
								<div class="ml-auto text-right">
									<span :class="board.valueClass" class="font-mono text-sm leading-none">
										{{ board.formatValue(user) }}
									</span>
								</div>
							</div>
						</template>

						<template v-else>
							<div class="py-2 text-center text-sm text-muted-foreground">
								No stats available yet.
							</div>
						</template>
					</div>
				</div>
			</div>

			<!-- CENTER COLUMN: Main Leaderboard (Always top on mobile) -->
			<div
				class="
					order-1 col-span-12 flex flex-col gap-4
					lg:order-2 lg:col-span-6
				"
			>
				<div class="overflow-hidden rounded-xl border border-border/50 bg-card/10 shadow-sm">
					<Table>
						<TableHeader class="bg-muted/30">
							<TableRow>
								<TableHead class="w-20 text-center font-bold">
									Rank
								</TableHead>
								<TableHead class="font-bold">
									Member
								</TableHead>
								<TableHead class="pr-8 text-right font-bold">
									Points
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							<template v-if="pendingLeaderboard">
								<TableRow v-for="i in 10" :key="i">
									<TableCell><Skeleton class="mx-auto h-6 w-8" /></TableCell>
									<TableCell><Skeleton class="h-6 w-32" /></TableCell>
									<TableCell><Skeleton class="mr-4 ml-auto h-6 w-20" /></TableCell>
								</TableRow>
							</template>
							<template v-else-if="leaderboard?.length">
								<TableRow
									v-for="(user, index) in leaderboard"
									:key="user.id"
									:class="index < 3 ? 'bg-primary/5 font-semibold' : ''"
								>
									<TableCell class="text-center">
										<div class="flex items-center justify-center">
											<TrophyIcon v-if="index === 0" class="mr-1 size-5 text-yellow-500" />
											<MedalIcon v-else-if="index === 1" class="mr-1 size-5 text-slate-300" />
											<MedalIcon v-else-if="index === 2" class="mr-1 size-5 text-amber-600" />
											<span v-else class="font-mono text-muted-foreground">#{{ index + 1 }}</span>
										</div>
									</TableCell>
									<TableCell>
										<div class="flex items-center gap-3">
											<Avatar class="size-8">
												<AvatarFallback>{{ user.displayName[0] }}</AvatarFallback>
											</Avatar>
											<span class="text-base font-medium text-foreground">{{ user.displayName }}</span>
										</div>
									</TableCell>
									<TableCell class="pr-8 text-right text-lg font-black tracking-tight text-foreground tabular-nums">
										{{ user.points.toLocaleString() }}
									</TableCell>
								</TableRow>
							</template>
							<template v-else>
								<TableRow>
									<TableCell colspan="3" class="h-32 text-center text-muted-foreground">
										No point data available yet.
									</TableCell>
								</TableRow>
							</template>
						</TableBody>
					</Table>
				</div>
			</div>

			<!-- RIGHT COLUMN: Lucky & Unlucky (Stacks below on mobile) -->
			<div
				class="
					order-3 col-span-12 flex flex-col gap-8
					lg:order-3 lg:col-span-3
				"
			>
				<div
					v-for="board in sideboards.filter(b => b.col === 'right')"
					:key="board.title"
					class="rounded-xl border border-border/50 bg-card/40 p-4 shadow-sm backdrop-blur-sm"
				>
					<h2 class="mb-4 flex items-center gap-2 text-base font-bold tracking-wider text-muted-foreground uppercase">
						<component :is="board.icon" class="size-5" :class="board.iconClass" />
						{{ board.title }}
					</h2>

					<div class="flex flex-col gap-3">
						<template v-if="pendingGambling">
							<div v-for="i in 5" :key="i" class="flex items-center gap-3">
								<Skeleton class="size-4 rounded-full" />
								<Skeleton class="size-8 rounded-full" />
								<Skeleton class="h-4 w-20" />
								<Skeleton class="ml-auto h-4 w-12" />
							</div>
						</template>

						<template v-else-if="board.items.length">
							<div
								v-for="(user, index) in board.items"
								:key="user.id"
								class="
									flex items-center gap-3 border-b border-border/30 py-1
									last:border-0
								"
							>
								<span class="w-4 text-center font-mono text-xs text-muted-foreground">
									{{ index + 1 }}
								</span>
								<Avatar class="size-7">
									<AvatarFallback class="text-xs">
										{{ user.displayName[0] }}
									</AvatarFallback>
								</Avatar>
								<div class="flex min-w-0 flex-col">
									<span class="truncate text-sm/tight font-semibold text-foreground">
										{{ user.displayName }}
									</span>
									<span class="mt-0.5 font-mono text-[10px] leading-none text-muted-foreground">
										{{ board.subValue(user) }}
									</span>
								</div>
								<div class="ml-auto text-right">
									<span :class="board.valueClass" class="font-mono text-sm leading-none">
										{{ board.formatValue(user) }}
									</span>
								</div>
							</div>
						</template>

						<template v-else>
							<div class="py-6 text-center text-sm text-muted-foreground">
								No stats available yet.
							</div>
						</template>
					</div>
				</div>
			</div>
		</div>
	</AppPageContainer>
</template>
