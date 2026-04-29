import { initTwurple, startBot } from '../utils/twurple'

export default defineNitroPlugin(async () => {
	console.log('[Bot Plugin] Initializing...')

	try {
		// 1. Load tokens from DB into AuthProvider
		await initTwurple()

		// 2. Try to start the bot
		const result = await startBot()
		if (result === 'started') {
			console.log('[Bot Plugin] Bot started successfully.')
		}
		else if (result === 'already_running') {
			console.log('[Bot Plugin] Bot is already running.')
		}
		else {
			console.log('[Bot Plugin] Tokens missing, waiting for onboarding...')
		}
	}
	catch (err) {
		console.error('[Bot Plugin] Initialization failed:', err)
	}
})
