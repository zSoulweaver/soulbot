export default defineNitroPlugin((nitroApp) => {
	nitroApp.hooks.hook('error', (error, { event }) => {
		apiLogger.error({
			err: error,
			url: event?.node?.req?.url,
			method: event?.node?.req?.method,
		}, 'Unhandled API Exception')
	})
})
