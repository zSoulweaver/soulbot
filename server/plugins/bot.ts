import process from 'node:process'
import { initRegistry, registry, templateRegistry } from '~~/server/bot'
import { startSpotifyQueueEngine } from '~~/server/bot/modules/spotify/queue-engine'
import { seedDefaultExclusions } from '../bot/modules/points/payout'

export default defineNitroPlugin(() => {
	const config = useRuntimeConfig()

	// Always initialize registry in memory and sync with SQLite so the Web UI always has command definitions loaded
	initRegistry()

	if (process.env.NODE_ENV !== 'test') {
		seedDefaultExclusions().catch(err => botLogger.error({ err }, 'Failed to seed exclusions during init'))
	}

	startSpotifyQueueEngine()
	Promise.resolve().then(async () => {
		try {
			await Promise.all([
				registry.syncWithDb(),
				templateRegistry.syncWithDb(),
			])
			botLogger.info('Registry and templates synchronized with DB on startup.')
		}
		catch (err) {
			botLogger.error({ err }, 'Failed to synchronize registry with DB on startup')
		}
	})

	if (!config.enableBot) {
		botLogger.info('Bot plugin is disabled (ENABLE_BOT=false).')
		return
	}

	botLogger.info('Bot plugin registered.')

	// Run initialization in the background so we don't block the Nitro renderer startup
	Promise.resolve().then(async () => {
		try {
			botLogger.info('Initializing bot (background)...')
			await initTwurple()
			await startDiscord()

			const result = await startBot()
			if (result === 'started') {
				botLogger.info('Bot started successfully.')
			}
			else if (result === 'already_running') {
				botLogger.info('Bot is already running.')
			}
			else {
				botLogger.info('Tokens missing, waiting for onboarding...')
			}
		}
		catch (err) {
			botLogger.error({ err }, 'Bot initialization failed')
		}
	})
})
