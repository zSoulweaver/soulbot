<script setup lang="ts">
import { MedalIcon, TrophyIcon } from '@lucide/vue'

const { data: leaderboard, pending } = useFetch<any[]>('/api/loyalty/watchtime/leaderboard')
</script>

<template>
	<AppPageContainer class="mx-auto max-w-4xl py-8">
		<div class="mb-8 flex flex-col gap-2 text-center">
			<h1 class="flex items-center justify-center gap-4 text-4xl font-black tracking-tight text-foreground uppercase">
				Watch Time Leaderboard
			</h1>
			<p class="text-lg text-muted-foreground">
				The most dedicated chat members hanging out in our community.
			</p>
		</div>

		<div class="overflow-hidden rounded-xl border border-border/50 bg-card/10 shadow-sm">
			<Table>
				<TableHeader class="bg-muted/50">
					<TableRow>
						<TableHead class="w-20 text-center font-bold">
							Rank
						</TableHead>
						<TableHead class="font-bold">
							Member
						</TableHead>
						<TableHead class="pr-8 text-right font-bold">
							Time Spent
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					<template v-if="pending">
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
									<span class="text-lg">{{ user.displayName }}</span>
								</div>
							</TableCell>
							<TableCell class="pr-8 text-right text-xl font-bold tabular-nums">
								{{ formatWatchTime(user.watchTime) }}
							</TableCell>
						</TableRow>
					</template>
					<template v-else>
						<TableRow>
							<TableCell colspan="3" class="h-32 text-center text-muted-foreground">
								No watch time data available yet.
							</TableCell>
						</TableRow>
					</template>
				</TableBody>
			</Table>
		</div>
	</AppPageContainer>
</template>
