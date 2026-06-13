const POLLING_PATHS = [
	'/api/bot/status',
	'/api/spotify/status',
	'/api/spotify/queue',
]

export default defineEventHandler((event) => {
	const start = Date.now()
	const { req, res } = event.node

	res.on('finish', () => {
		const url = req.url || ''
		const pathname = url.split('?')[0] || ''

		// Skip logging for noisey polling endpoints when the response is a success (2xx)
		if (
			req.method === 'GET'
			&& POLLING_PATHS.includes(pathname)
			&& res.statusCode >= 200
			&& res.statusCode < 300
		) {
			return
		}

		const duration = Date.now() - start
		apiLogger.info({
			method: req.method,
			url: req.url,
			statusCode: res.statusCode,
			durationMs: duration,
			ip: getRequestIP(event, { xForwardedFor: true }),
		}, `${req.method} ${req.url} [${res.statusCode}] - ${duration}ms`)
	})
})
