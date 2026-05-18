export default defineNitroPlugin(() => {
	const config = useRuntimeConfig()

	if (!config.enableBot) {
		botLogger.info('Bot plugin is disabled (ENABLE_BOT=false).')
		return
	}

	botLogger.info('Bot plugin registered.')

	// Run initialization in the background so we don't block the Nitro renderer startup
	Promise.resolve().then(async () => {
		try {
			botLogger.info('Initializing bot (background)...')
			// 1. Load tokens from DB into AuthProvider
			await initTwurple()

			// 2. Try to start the bot
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
