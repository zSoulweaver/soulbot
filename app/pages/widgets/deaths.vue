<script setup lang="ts">
import type { PublicDeathsWidgetResponse } from '~/types/widgets'
import { useStyleTag } from '@vueuse/core'
import { computed, onMounted, onUnmounted, ref } from 'vue'

definePageMeta({
	layout: 'widget',
})

const route = useRoute()
const key = computed(() => (typeof route.query.key === 'string' ? route.query.key : ''))
const isPreview = computed(() => route.query.preview === '1' || route.query.preview === 'true')

const isUnauthorized = ref(false)
const gameName = ref('Elden Ring')
const counterName = ref('Default')
const deaths = ref(0)
const totalDeaths = ref(0)
const template = ref('$(game) Deaths: $(count)')
const styles = ref<Record<string, any>>({
	fontFamily: 'Inter',
	fontSize: 36,
	fontWeight: '700',
	color: '#ffffff',
	backgroundColor: 'transparent',
	textAlign: 'center',
	customCss: '',
})

const GOOGLE_FONTS = ['Inter', 'Roboto', 'Outfit', 'Montserrat']

// Dynamically load Google Fonts when chosen
useHead(computed(() => {
	const font = styles.value.fontFamily
	if (!font || !GOOGLE_FONTS.includes(font)) {
		return {}
	}
	const fontName = font.replace(/ /g, '+')
	return {
		link: [
			{
				rel: 'stylesheet',
				href: `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;500;600;700;800;900&display=swap`,
			},
		],
	}
}))

// Inject custom CSS dynamically using VueUse useStyleTag
useStyleTag(computed(() => styles.value.customCss || ''))

// Compute formatted text replacement
const formattedText = computed(() => {
	const showCounter = styles.value.showActiveCounter !== false
	const isDefaultCounter = !counterName.value || counterName.value.toLowerCase() === 'default'

	let tpl = template.value

	if (/\$\(counter(?:_name)?\)/.test(tpl)) {
		const counterText = showCounter ? counterName.value : ''
		tpl = tpl.replace(/\$\(counter(?:_name)?\)/g, counterText)
	}
	else if (showCounter && !isDefaultCounter) {
		tpl = tpl.replace(/\$\(game\)/g, `${gameName.value} [${counterName.value}]`)
	}

	return tpl
		.replace(/\$\(count\)/g, String(deaths.value))
		.replace(/\$\(deaths\)/g, String(deaths.value))
		.replace(/\$\(total(?:_deaths)?\)/g, String(totalDeaths.value || deaths.value))
		.replace(/\$\(game\)/g, gameName.value)
})

// Dynamic inline styles
const containerStyle = computed(() => ({
	backgroundColor: styles.value.backgroundColor || 'transparent',
	textAlign: (styles.value.textAlign || 'center') as any,
	padding: '8px 16px',
	width: '100%',
	boxSizing: 'border-box' as const,
}))

const textStyle = computed(() => ({
	fontFamily: styles.value.fontFamily ? `'${styles.value.fontFamily}', sans-serif` : 'Inter, sans-serif',
	fontSize: `${styles.value.fontSize || 36}px`,
	fontWeight: styles.value.fontWeight || '700',
	color: styles.value.color || '#ffffff',
	lineHeight: '1.2',
}))

let sseSource: EventSource | null = null
let pollInterval: ReturnType<typeof setInterval> | null = null

function stopAllConnections() {
	if (sseSource) {
		sseSource.close()
		sseSource = null
	}
	if (pollInterval) {
		clearInterval(pollInterval)
		pollInterval = null
	}
}

async function loadInitialData() {
	if (!key.value && !isPreview.value)
		return

	try {
		const data = await $fetch<PublicDeathsWidgetResponse>('/api/widgets/deaths', {
			query: { key: key.value },
		})
		if (data) {
			isUnauthorized.value = false
			gameName.value = data.gameName
			counterName.value = data.counterName || 'Default'
			deaths.value = data.deaths
			totalDeaths.value = data.totalDeaths || data.deaths
			template.value = data.template
			if (data.styles) {
				styles.value = { ...styles.value, ...data.styles }
			}
		}
	}
	catch (err: any) {
		const status = err.statusCode || err.status || err.response?.status
		if (status === 401 || status === 403) {
			isUnauthorized.value = true
			stopAllConnections()
			return
		}
		console.error('[OBS Widget] Failed to fetch initial widget data:', err)
	}
}

function initSSE() {
	if (isPreview.value || !key.value || typeof window === 'undefined' || isUnauthorized.value)
		return

	const sseUrl = `/api/widgets/deaths/sse?key=${encodeURIComponent(key.value)}`
	sseSource = new EventSource(sseUrl)

	sseSource.addEventListener('deaths:updated', (e) => {
		try {
			const payload = JSON.parse(e.data)
			if (payload.gameName !== undefined)
				gameName.value = payload.gameName
			if (payload.counterName !== undefined)
				counterName.value = payload.counterName
			if (payload.deaths !== undefined)
				deaths.value = payload.deaths
			if (payload.totalDeaths !== undefined)
				totalDeaths.value = payload.totalDeaths
		}
		catch (err) {
			console.error('[OBS Widget] Failed to parse deaths:updated event:', err)
		}
	})

	sseSource.addEventListener('widget:updated', (e) => {
		try {
			const payload = JSON.parse(e.data)
			if (payload.template)
				template.value = payload.template
			if (payload.styles)
				styles.value = { ...styles.value, ...payload.styles }
		}
		catch (err) {
			console.error('[OBS Widget] Failed to parse widget:updated event:', err)
		}
	})

	sseSource.onerror = () => {
		if (isUnauthorized.value) {
			stopAllConnections()
			return
		}
		// If SSE fails due to network disconnect, start fallback polling if not unauthorized
		if (!pollInterval && !isUnauthorized.value) {
			pollInterval = setInterval(async () => {
				if (isUnauthorized.value) {
					stopAllConnections()
					return
				}
				await loadInitialData()
			}, 5000)
		}
	}
}

function handlePostMessage(event: MessageEvent) {
	if (!event.data || event.data.type !== 'WIDGET_PREVIEW_UPDATE')
		return
	const { draftTemplate, draftStyles } = event.data.payload || {}
	if (draftTemplate !== undefined)
		template.value = draftTemplate
	if (draftStyles !== undefined)
		styles.value = { ...styles.value, ...draftStyles }
}

onMounted(async () => {
	await loadInitialData()
	if (!isUnauthorized.value) {
		initSSE()
	}

	if (typeof window !== 'undefined') {
		window.addEventListener('message', handlePostMessage)
	}
})

onUnmounted(() => {
	stopAllConnections()
	if (typeof window !== 'undefined') {
		window.removeEventListener('message', handlePostMessage)
	}
})
</script>

<template>
	<div class="flex min-h-screen w-full items-center justify-center p-4">
		<div v-if="isUnauthorized" class="rounded-md bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive">
			Invalid or expired widget secret key. Please update your OBS browser source URL.
		</div>
		<div v-else :style="containerStyle">
			<div :style="textStyle">
				{{ formattedText }}
			</div>
		</div>
	</div>
</template>
