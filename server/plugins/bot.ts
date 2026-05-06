export default defineNitroPlugin(async () => {
	botLogger.info('Initializing bot plugin...')

	try {
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
		botLogger.error({ err }, 'Initialization failed')
	}
})
