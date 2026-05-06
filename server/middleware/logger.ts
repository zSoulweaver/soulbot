export default defineEventHandler((event) => {
	const start = Date.now()
	const { req, res } = event.node

	res.on('finish', () => {
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
