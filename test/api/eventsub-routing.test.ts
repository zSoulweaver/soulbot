import { beforeEach, describe, expect, it, vi } from 'vitest'
import eventsubRouteHandler from '~~/server/api/twitch/eventsub/[...]'
import { eventSubManager } from '~~/server/bot/core/eventsub'

describe('Twitch EventSub Nitro Catch-All Route', () => {
	let mockHandleRequest: any
	let mockDropLegacyRequest: any
	let mockHandleHealthRequest: any

	beforeEach(() => {
		mockHandleRequest = vi.fn((req, res, next) => next())
		mockDropLegacyRequest = vi.fn((req, res, next) => next())
		mockHandleHealthRequest = vi.fn((req, res, next) => next())

		// Setup mock listener representing EventSubMiddleware
		const mockListener = {
			_createHandleRequest: () => mockHandleRequest,
			_createDropLegacyRequest: () => mockDropLegacyRequest,
			_createHandleHealthRequest: () => mockHandleHealthRequest,
		}

		// Inject mock listener into the singleton manager
		;(eventSubManager as any).listener = mockListener
	})

	it('should return 503 if the listener is not initialized', async () => {
		;(eventSubManager as any).listener = null

		const mockReq = { url: '/api/twitch/eventsub', method: 'GET' }
		const mockRes = { statusCode: 200 }

		const mockEvent = {
			node: {
				req: mockReq,
				res: mockRes,
			},
		}

		const res = await eventsubRouteHandler(mockEvent as any)
		expect(mockEvent.node.res.statusCode).toBe(503)
		expect(res).toBe('EventSub listener not initialized')
	})

	it('should route GET /api/twitch/eventsub to the health check handler', async () => {
		const mockReq = { url: '/api/twitch/eventsub', method: 'GET' }
		const mockRes = { statusCode: 200 }

		const mockEvent = {
			node: {
				req: mockReq,
				res: mockRes,
			},
		}

		await eventsubRouteHandler(mockEvent as any)
		expect(mockHandleHealthRequest).toHaveBeenCalledTimes(1)
		expect(mockHandleRequest).not.toHaveBeenCalled()
		expect(mockDropLegacyRequest).not.toHaveBeenCalled()
	})

	it('should route POST /api/twitch/eventsub/event/:id to the request handler with populated req.params.id', async () => {
		const mockReq = { url: '/api/twitch/eventsub/event/sub-12345', method: 'POST' } as any
		const mockRes = { statusCode: 200 }

		const mockEvent = {
			node: {
				req: mockReq,
				res: mockRes,
			},
		}

		await eventsubRouteHandler(mockEvent as any)
		expect(mockHandleRequest).toHaveBeenCalledTimes(1)
		expect(mockReq.params).toEqual({ id: 'sub-12345' })
		expect(mockDropLegacyRequest).not.toHaveBeenCalled()
	})

	it('should route POST /api/twitch/eventsub/:id to the legacy drop handler with populated req.params.id', async () => {
		const mockReq = { url: '/api/twitch/eventsub/legacy-54321', method: 'POST' } as any
		const mockRes = { statusCode: 200 }

		const mockEvent = {
			node: {
				req: mockReq,
				res: mockRes,
			},
		}

		await eventsubRouteHandler(mockEvent as any)
		expect(mockDropLegacyRequest).toHaveBeenCalledTimes(1)
		expect(mockReq.params).toEqual({ id: 'legacy-54321' })
		expect(mockHandleRequest).not.toHaveBeenCalled()
	})

	it('should return 404 for unhandled paths', async () => {
		const mockReq = { url: '/api/twitch/eventsub/unhandled/nested/path', method: 'GET' }
		const mockRes = { statusCode: 200 }

		const mockEvent = {
			node: {
				req: mockReq,
				res: mockRes,
			},
		}

		const res = await eventsubRouteHandler(mockEvent as any)
		expect(mockEvent.node.res.statusCode).toBe(404)
		expect(res).toBe('Not Found')
	})
})
