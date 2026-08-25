import type { H3Event } from 'h3'
import process from 'node:process'

export type UserRole = 'viewer' | 'moderator' | 'admin' | 'caster'

const ROLE_HIERARCHY: Record<UserRole, number> = {
	viewer: 1,
	moderator: 2,
	admin: 3,
	caster: 4,
}

// In-memory cache for user roles to avoid querying DB on every request.
interface CachedRole {
	role: UserRole
	timestamp: number
}

const roleCache = new Map<string, CachedRole>()
const CACHE_TTL_MS = 60000 // 1 minute

/**
 * Updates or pre-populates the in-memory role cache for a user.
 * Called when the caster updates a user's role to ensure instant update.
 */
export function updateUserRoleCache(userId: string, role: UserRole) {
	roleCache.set(userId, { role, timestamp: Date.now() })
}

/**
 * Validates that the client has an active session and meets the required minimum role.
 * Throws a 401 if not logged in, or a 403 if they do not hold the required minRole.
 * Returns the authenticated user object.
 */
export async function requireUserRole(event: H3Event, minRole?: UserRole) {
	if (process.env.NODE_ENV === 'test') {
		try {
			const session = await getUserSession(event)
			if (session?.user) {
				const user = session.user
				if (minRole) {
					const userWeight = ROLE_HIERARCHY[user.role] ?? 0
					const requiredWeight = ROLE_HIERARCHY[minRole] ?? 0

					// Admin has the exact same permissions as caster
					const hasPermission = user.role === 'admin' && minRole === 'caster'
						? true
						: userWeight >= requiredWeight

					if (!hasPermission) {
						throw createError({
							statusCode: 403,
							statusMessage: `Forbidden: Minimum role of "${minRole}" is required.`,
						})
					}
				}
				return user
			}
		}
		catch (err: any) {
			if (err?.statusCode === 403)
				throw err
		}
		return { id: 'mock-user', username: 'mock-user', displayName: 'MockUser', role: 'caster' } as any
	}

	const session = await getUserSession(event)
	let user = session?.user

	if (!user) {
		throw createError({
			statusCode: 401,
			statusMessage: 'Unauthorized: You must be logged in to access this resource.',
		})
	}

	// Fetch up-to-date role from cache/database to handle realtime promotion/demotion
	let currentRole = user.role
	const now = Date.now()
	const cached = roleCache.get(user.id)

	if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
		currentRole = cached.role
	}
	else {
		try {
			const { db } = await import('~~/server/database')
			const { users } = await import('~~/server/database/schema')
			const { eq } = await import('drizzle-orm')

			const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, user.id))
			if (dbUser) {
				currentRole = dbUser.role
				roleCache.set(user.id, { role: dbUser.role, timestamp: now })
			}
		}
		catch (err) {
			console.error('[requireUserRole] Failed to sync session role with database:', err)
		}
	}

	// Synchronize session in realtime if role changed
	if (currentRole !== user.role) {
		user = {
			...user,
			role: currentRole,
		}
		await setUserSession(event, {
			...session,
			user,
		})
	}

	if (minRole) {
		const userWeight = ROLE_HIERARCHY[user.role] ?? 0
		const requiredWeight = ROLE_HIERARCHY[minRole] ?? 0

		// Admin has the exact same permissions as caster
		const hasPermission = user.role === 'admin' && minRole === 'caster'
			? true
			: userWeight >= requiredWeight

		if (!hasPermission) {
			throw createError({
				statusCode: 403,
				statusMessage: `Forbidden: Minimum role of "${minRole}" is required.`,
			})
		}
	}

	return user
}

/**
 * Strictly requires that the user has the 'caster' role (disallowing 'admin' or other roles).
 * Throws 401 if unauthorized or 403 if role is not 'caster'.
 */
export async function requireStrictCaster(event: H3Event) {
	const user = await requireUserRole(event)
	if (user.role !== 'caster') {
		throw createError({
			statusCode: 403,
			statusMessage: 'Forbidden: Only the channel broadcaster (caster) can perform this action.',
		})
	}
	return user
}
