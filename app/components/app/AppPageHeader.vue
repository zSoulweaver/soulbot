<script setup lang="ts">
defineProps<{
	heading: string
	subheading?: string
}>()
</script>

<template>
	<div
		class="
			relative px-8 pt-12 pb-10
			md:pt-16 md:pb-12
		"
	>
		<!-- Content wrapper -->
		<div
			class="
				relative flex flex-col justify-between gap-6
				md:flex-row md:items-center
			"
		>
			<div>
				<h1
					class="
						font-serif text-4xl font-normal text-foreground
						sm:text-5xl
					"
				>
					{{ heading }}
				</h1>
				<p
					v-if="subheading"
					class="
						mt-2 max-w-3xl font-sans text-sm text-muted-foreground
						sm:text-base
					"
				>
					{{ subheading }}
				</p>
			</div>

			<!-- Actions Slot -->
			<div class="flex shrink-0 items-center gap-2">
				<slot />
			</div>
		</div>
	</div>
</template>
