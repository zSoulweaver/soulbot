// NOTE: Untested pathway
import { defineEventHandler } from 'h3'
import { eventSubManager } from '~~/server/bot/core/eventsub'

export default defineEventHandler(async (event) => {
	const req = event.node.req
	const res = event.node.res

	// Retrieve singleton listener instance
	const listener = (eventSubManager as any).listener

	if (!listener) {
		res.statusCode = 503
		return 'EventSub listener not initialized'
	}

	// Retrieve underlying Express-compatible handlers from Twurple's EventSubMiddleware
	const handlers = listener as any
	const handleRequest = handlers._createHandleRequest?.()
	const dropLegacyRequest = handlers._createDropLegacyRequest?.()
	const handleHealthRequest = handlers._createHandleHealthRequest?.()

	if (!handleRequest || !dropLegacyRequest || !handleHealthRequest) {
		res.statusCode = 503
		return 'EventSub middleware handlers not available'
	}

	const url = req.url || ''
	const pathname = url.split('?')[0] || ''
	const method = req.method

	// Split path into segments and extract segments after 'eventsub'
	const segments = pathname.split('/').filter(Boolean)
	const eventsubIndex = segments.indexOf('eventsub')
	if (eventsubIndex === -1) {
		res.statusCode = 404
		return 'Not Found'
	}

	const subSegments = segments.slice(eventsubIndex + 1)

	if (method === 'POST') {
		if (subSegments[0] === 'event' && subSegments[1]) {
			// POST /api/twitch/eventsub/event/:id
			(req as any).params = { id: subSegments[1] }
			await new Promise<void>((resolve, reject) => {
				handleRequest(req, res, (err: any) => {
					if (err)
						reject(err)
					else resolve()
				})
			})
			return
		}
		else if (subSegments[0] && subSegments.length === 1) {
			// POST /api/twitch/eventsub/:id
			(req as any).params = { id: subSegments[0] }
			await new Promise<void>((resolve, reject) => {
				dropLegacyRequest(req, res, (err: any) => {
					if (err)
						reject(err)
					else resolve()
				})
			})
			return
		}
	}
	else if (method === 'GET') {
		if (subSegments.length === 0) {
			// GET /api/twitch/eventsub
			await new Promise<void>((resolve, reject) => {
				handleHealthRequest(req, res, (err: any) => {
					if (err)
						reject(err)
					else resolve()
				})
			})
			return
		}
	}

	res.statusCode = 404
	return 'Not Found'
})
