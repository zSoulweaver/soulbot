<script setup lang="ts">
import type { PublicDeathsResponse } from '~/types/deaths'
import { ChevronDownIcon, Gamepad2Icon, MedalIcon, SearchIcon, TrophyIcon } from '@lucide/vue'
import { computed, ref } from 'vue'
import { Badge } from '~/components/ui/badge'
import {
	Pagination,
	PaginationContent,
	PaginationFirst,
	PaginationLast,
	PaginationNext,
	PaginationPrevious,
} from '~/components/ui/pagination'
import { usePagination } from '~/composables/usePagination'

useHead({
	title: 'Game Deaths Standings',
})

// Server-side pagination and search
const {
	page: currentPage,
	limit: itemsPerPage,
	search: searchQuery,
	data: deathsRes,
	loading,
} = usePagination<PublicDeathsResponse>('/api/deaths', { initialLimit: 10 })

const featuredGame = computed(() => deathsRes.value?.featuredGame || null)
const currentGameName = computed(() => deathsRes.value?.currentGame || '')
const filteredDeaths = computed(() => deathsRes.value?.data || [])
const totalGames = computed(() => deathsRes.value?.meta?.total || 0)

const startIndex = computed(() => {
	if (totalGames.value === 0)
		return 0
	return (currentPage.value - 1) * itemsPerPage.value + 1
})

const endIndex = computed(() => {
	return Math.min(currentPage.value * itemsPerPage.value, totalGames.value)
})

// Expanded row tracking for playthrough breakdowns
const expandedGameIds = ref<Set<number>>(new Set())

function toggleExpand(gameId: number) {
	if (expandedGameIds.value.has(gameId)) {
		expandedGameIds.value.delete(gameId)
	}
	else {
		expandedGameIds.value.add(gameId)
	}
}
</script>

<template>
	<AppPageContainer
		class="
			mx-auto w-full max-w-3xl px-4 py-8
			sm:px-6
		"
	>
		<!-- Page Title Header -->
		<div class="mb-8 flex flex-col gap-2 text-center">
			<h1
				class="
					font-serif text-4xl font-normal text-foreground
					md:text-5xl
				"
			>
				Game Death Counter
			</h1>
			<p class="text-lg text-muted-foreground">
				Tracking stream deaths across every game category.
			</p>
		</div>

		<!-- Featured Current Game Hero Banner (if current channel game matches tracked deaths) -->
		<div v-if="loading" class="mb-8 overflow-hidden rounded-2xl border border-border/50 bg-card p-6 shadow-md">
			<div
				class="
					flex flex-col items-center gap-6
					sm:flex-row
				"
			>
				<Skeleton class="h-44 w-32 shrink-0 rounded-xl" />
				<div class="flex flex-1 flex-col gap-3">
					<Skeleton class="h-4 w-28" />
					<Skeleton class="h-8 w-60" />
					<Skeleton class="h-6 w-36" />
				</div>
			</div>
		</div>

		<div
			v-else-if="featuredGame"
			class="relative mb-8 overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-r from-primary/10 via-card to-card p-6 shadow-xl backdrop-blur-sm"
		>
			<div
				class="
					flex flex-col items-center gap-6
					sm:flex-row
				"
			>
				<!-- Box Art Container (No hover scale) -->
				<div class="relative shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted/50 shadow-md">
					<img
						v-if="featuredGame.boxArtUrl"
						:src="featuredGame.boxArtUrl"
						:alt="featuredGame.gameName"
						class="h-44 w-32 object-cover"
					>
					<div v-else class="flex h-44 w-32 items-center justify-center bg-muted/80 text-muted-foreground">
						<Gamepad2Icon class="size-12 opacity-40" />
					</div>
				</div>

				<!-- Info Container -->
				<div
					class="
						flex flex-1 flex-col text-center
						sm:text-left
					"
				>
					<div
						class="
							flex flex-wrap items-center justify-center gap-2
							sm:justify-start
						"
					>
						<span class="text-xs font-bold tracking-widest text-primary uppercase">
							Current Category
						</span>
					</div>

					<h2
						class="
							mt-2 font-serif text-3xl font-bold text-foreground
							md:text-4xl
						"
					>
						{{ featuredGame.gameName }}
					</h2>

					<span
						v-if="featuredGame.counters && featuredGame.counters.length > 1"
						class="mt-1 text-sm font-normal text-muted-foreground"
					>
						Active Counter: <span class="font-medium text-foreground">{{ featuredGame.activeCounterName }}</span>
					</span>

					<!-- Clean Typographic Stat Callouts -->
					<div
						class="mt-5 w-full"
					>
						<!-- Case A: Multiple Counters exist (3-column grid on desktop, stacked on mobile) -->
						<div
							v-if="featuredGame.counters && featuredGame.counters.length > 1"
							class="
								grid grid-cols-1 gap-4
								sm:grid-cols-3 sm:items-start sm:gap-0 sm:divide-x sm:divide-border/60
							"
						>
							<!-- Active Counter Deaths Stat -->
							<div
								class="
									flex flex-col items-center justify-start
									sm:items-start sm:pr-4
								"
							>
								<span class="text-3xl leading-none font-black text-destructive tabular-nums">
									{{ featuredGame.activeCounterDeaths.toLocaleString() }}
								</span>
								<span class="mt-1 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
									Active Counter Deaths
								</span>
							</div>

							<!-- Total Deaths Stat Across All Counters -->
							<div
								class="
									flex flex-col items-center justify-start
									sm:items-start sm:px-4
								"
							>
								<span class="text-3xl leading-none font-black text-foreground tabular-nums">
									{{ featuredGame.totalDeaths.toLocaleString() }}
								</span>
								<span class="mt-1 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
									Total Game Deaths
								</span>
							</div>

							<!-- Leaderboard Rank Stat -->
							<div
								class="
									flex flex-col items-center justify-start
									sm:items-start sm:pl-4
								"
							>
								<span class="text-3xl leading-none font-black text-foreground tabular-nums">
									#{{ featuredGame.rank }}
								</span>
								<span class="mt-1 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
									Leaderboard Rank
								</span>
							</div>
						</div>

						<!-- Case B: Single Counter (2-column grid on desktop, stacked on mobile) -->
						<div
							v-else
							class="
								grid grid-cols-1 gap-4
								sm:grid-cols-2 sm:items-start sm:gap-0 sm:divide-x sm:divide-border/60
							"
						>
							<div
								class="
									flex flex-col items-center justify-start
									sm:items-start sm:pr-4
								"
							>
								<span class="text-3xl leading-none font-black text-destructive tabular-nums">
									{{ featuredGame.totalDeaths.toLocaleString() }}
								</span>
								<span class="mt-1 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
									Total Deaths
								</span>
							</div>

							<!-- Leaderboard Rank Stat -->
							<div
								class="
									flex flex-col items-center justify-start
									sm:items-start sm:pl-4
								"
							>
								<span class="text-3xl leading-none font-black text-foreground tabular-nums">
									#{{ featuredGame.rank }}
								</span>
								<span class="mt-1 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
									Leaderboard Rank
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div v-else-if="currentGameName && currentGameName !== 'General'" class="mb-8 rounded-xl border border-border/50 bg-card/60 p-4 text-center text-sm text-muted-foreground">
			Currently playing <span class="font-semibold text-foreground">{{ currentGameName }}</span> (No deaths recorded yet).
		</div>

		<!-- Main Table Section (Search + Table wrapped with tight gap-2.5) -->
		<div class="flex flex-col gap-2.5">
			<!-- Leaderboard Search & Controls -->
			<div class="flex items-center justify-between gap-4">
				<InputGroup class="w-full max-w-xs">
					<InputGroupAddon>
						<SearchIcon class="text-muted-foreground" />
					</InputGroupAddon>
					<InputGroupInput
						v-model="searchQuery"
						type="search"
						placeholder="Search game category..."
					/>
				</InputGroup>
			</div>

			<!-- Ranked Standings Table -->
			<div class="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
				<Table>
					<TableHeader class="bg-muted/30">
						<TableRow>
							<TableHead class="w-20 text-center font-bold">
								Rank
							</TableHead>
							<TableHead class="font-bold">
								Game Category
							</TableHead>
							<TableHead class="pr-8 text-right font-bold">
								Total Deaths
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<!-- Loading Skeleton State -->
						<template v-if="loading">
							<TableRow v-for="i in 5" :key="i">
								<TableCell class="text-center">
									<Skeleton class="mx-auto h-6 w-8 rounded-md" />
								</TableCell>
								<TableCell>
									<div class="flex items-center gap-3">
										<Skeleton class="h-14 w-10 shrink-0 rounded-md" />
										<Skeleton class="h-5 w-44 rounded-md" />
									</div>
								</TableCell>
								<TableCell class="pr-8 text-right">
									<Skeleton class="ml-auto h-6 w-16 rounded-md" />
								</TableCell>
							</TableRow>
						</template>

						<!-- Data Rows -->
						<template v-else-if="filteredDeaths.length">
							<template v-for="game in filteredDeaths" :key="game.id">
								<TableRow
									class="transition-colors select-none"
									:class="{
										'cursor-pointer': game.counters && game.counters.length > 1,
										'bg-yellow-500/10 font-medium dark:bg-yellow-500/10': game.rank === 1,
										'bg-slate-500/10 font-medium dark:bg-slate-400/10': game.rank === 2,
										'bg-amber-600/10 font-medium dark:bg-amber-600/10': game.rank === 3,
										'bg-primary/5': game.isCurrentGame && game.rank > 3,
									}"
									@click="game.counters && game.counters.length > 1 && toggleExpand(game.id)"
								>
									<!-- Rank Cell -->
									<TableCell class="relative">
										<div
											v-if="game.isCurrentGame"
											class="absolute inset-y-0 left-0 w-1 bg-primary"
										/>
										<div class="flex items-center justify-center">
											<TrophyIcon v-if="game.rank === 1" class="size-5 text-yellow-500" />
											<MedalIcon v-else-if="game.rank === 2" class="size-5 text-slate-400" />
											<MedalIcon v-else-if="game.rank === 3" class="size-5 text-amber-600" />
											<span v-else class="font-mono text-sm font-semibold text-muted-foreground">#{{ game.rank }}</span>
										</div>
									</TableCell>

									<!-- Game Name & Box Art Cell -->
									<TableCell>
										<div class="flex items-center gap-3">
											<div class="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-muted/40">
												<img
													v-if="game.boxArtUrl"
													:src="game.boxArtUrl"
													:alt="game.gameName"
													class="size-full object-cover"
												>
												<div v-else class="flex size-full items-center justify-center bg-muted text-muted-foreground">
													<Gamepad2Icon class="size-6 opacity-40" />
												</div>
											</div>

											<div class="flex flex-1 flex-col">
												<div class="flex items-center gap-2">
													<span class="text-base font-bold text-foreground">
														{{ game.gameName }}
													</span>
													<ChevronDownIcon
														v-if="game.counters && game.counters.length > 1"
														class="size-4 text-muted-foreground transition-transform duration-200"
														:class="{ 'rotate-180': expandedGameIds.has(game.id) }"
													/>
												</div>
												<span v-if="game.counters && game.counters.length > 1" class="text-xs text-muted-foreground">
													{{ game.counters.length }} counters
												</span>
											</div>
										</div>
									</TableCell>

									<!-- Death Count Cell -->
									<TableCell class="pr-8 text-right text-lg font-black text-foreground tabular-nums">
										{{ game.deaths.toLocaleString() }}
									</TableCell>
								</TableRow>

								<!-- Expandable Death Counters Breakdown Row -->
								<TableRow
									v-if="game.counters && game.counters.length > 1 && expandedGameIds.has(game.id)"
									:key="`breakdown-${game.id}`"
									class="
										border-t-0 bg-muted/10
										hover:bg-muted/10
									"
								>
									<TableCell colspan="3" class="p-0">
										<div class="flex flex-col gap-2 border-y border-border/40 bg-muted/20 px-6 py-3">
											<span class="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
												Death Counters
											</span>
											<div class="flex flex-col gap-1.5">
												<div
													v-for="counter in game.counters"
													:key="counter.id"
													class="flex items-center justify-between rounded-lg border border-border/40 bg-background/80 px-3.5 py-2 text-sm shadow-xs"
												>
													<div class="flex items-center gap-2">
														<span class="font-medium text-foreground">
															{{ counter.name }}
														</span>
														<Badge
															v-if="game.isCurrentGame && counter.isActive"
															variant="default"
															class="h-4.5 px-1.5 text-[10px] font-bold tracking-wide uppercase"
														>
															Active
														</Badge>
													</div>
													<span class="font-black text-foreground tabular-nums">
														{{ counter.deaths.toLocaleString() }} <span class="text-xs font-normal text-muted-foreground">deaths</span>
													</span>
												</div>
											</div>
										</div>
									</TableCell>
								</TableRow>
							</template>
						</template>

						<!-- Empty State -->
						<template v-else>
							<TableRow>
								<TableCell colspan="3" class="h-40 text-center text-muted-foreground">
									<div class="flex flex-col items-center justify-center gap-2">
										<Gamepad2Icon class="size-8 text-muted-foreground/50" />
										<span>No game deaths found.</span>
									</div>
								</TableCell>
							</TableRow>
						</template>
					</TableBody>
				</Table>
			</div>

			<!-- Bottom Pagination Controls -->
			<div
				v-if="totalGames > 0"
				class="
					flex flex-col items-center justify-between gap-4 select-none
					sm:flex-row
				"
			>
				<span class="text-xs text-muted-foreground">
					Showing {{ startIndex }}-{{ endIndex }} of {{ totalGames }} games
				</span>

				<Pagination
					v-model:page="currentPage"
					:total="totalGames"
					:sibling-count="1"
					:items-per-page="itemsPerPage"
					class="mx-0 w-auto"
				>
					<PaginationContent>
						<PaginationFirst />
						<PaginationPrevious />
						<PaginationNext />
						<PaginationLast />
					</PaginationContent>
				</Pagination>
			</div>
		</div>
	</AppPageContainer>
</template>
