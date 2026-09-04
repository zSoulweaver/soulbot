<script setup lang="ts">
import { Wrench } from '@lucide/vue'
import { computed, ref } from 'vue'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { useTemplateAudit } from '~/composables/useTemplateAudit'
import AppTemplateAuditDialog from './AppTemplateAuditDialog.vue'

const { auditResult, isModeratorOrCaster } = useTemplateAudit()
const isDialogOpen = ref(false)

const showBrokenAlert = computed(() => {
	return isModeratorOrCaster.value && (auditResult.value?.totalIssues || 0) > 0
})

const issueCount = computed(() => auditResult.value?.totalIssues || 0)
</script>

<template>
	<div v-if="showBrokenAlert">
		<Alert
			variant="destructive"
			class="flex animate-in flex-wrap items-center justify-between gap-4 duration-300 fade-in slide-in-from-top"
		>
			<div class="flex flex-1 flex-col gap-0.5">
				<AlertTitle>
					Invalid Template Variables Detected
				</AlertTitle>
				<AlertDescription>
					{{ issueCount }} template{{ issueCount === 1 ? '' : 's' }} in your configuration contain invalid, outdated, or broken variables that may fail to render properly.
				</AlertDescription>
			</div>

			<Button
				variant="destructive"
				@click="isDialogOpen = true"
			>
				<Wrench />
				<span>View Diagnostics</span>
			</Button>
		</Alert>

		<AppTemplateAuditDialog v-model:open="isDialogOpen" />
	</div>
</template>
