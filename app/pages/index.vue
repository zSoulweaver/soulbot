<script setup lang="ts">
// Welcome to Soulbot Dashboard
</script>

<template>
	<div class="flex flex-col gap-4">
		<div class="flex flex-col gap-1">
			<h1 class="text-3xl font-bold tracking-tight">
				Dashboard
			</h1>
			<p class="text-muted-foreground">
				Welcome to your Soulbot administration panel.
			</p>
		</div>

		<div
			class="
				grid gap-4
				md:grid-cols-2
				lg:grid-cols-4
			"
		>
			<Card>
				<CardHeader class="flex flex-row items-center justify-between pb-2">
					<CardTitle class="text-sm font-medium">
						Quick Stats
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">
						Coming Soon
					</div>
					<p class="text-xs text-muted-foreground">
						Statistics will be displayed here.
					</p>
				</CardContent>
			</Card>
		</div>
	</div>
</template>
