/**
 * Recursively checks if two values/objects are deeply equal, optionally ignoring specified object keys.
 */
export function isDeepEqual(a: any, b: any, ignoreKeys: (string | number | symbol)[] = []): boolean {
	if (a === b)
		return true

	if (a === null || a === undefined || b === null || b === undefined)
		return a === b

	if (typeof a !== 'object' || typeof b !== 'object')
		return a === b

	if (Array.isArray(a) !== Array.isArray(b))
		return false

	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length)
			return false
		for (let i = 0; i < a.length; i++) {
			if (!isDeepEqual(a[i], b[i], ignoreKeys))
				return false
		}
		return true
	}

	const ignored = new Set(ignoreKeys.map(k => String(k)))
	const keysA = Object.keys(a).filter(k => !ignored.has(k))
	const keysB = Object.keys(b).filter(k => !ignored.has(k))

	if (keysA.length !== keysB.length)
		return false

	for (const key of keysA) {
		if (!Object.hasOwn(b, key))
			return false
		if (!isDeepEqual(a[key], b[key], ignoreKeys))
			return false
	}

	return true
}

/**
 * Safely deep-clones any JSON-serializable or plain object/array structure,
 * unwrapping Vue reactive proxies without throwing DOMException.
 */
export function deepClone<T>(value: T): T {
	if (value === null || value === undefined || typeof value !== 'object') {
		return value
	}
	try {
		return JSON.parse(JSON.stringify(value))
	}
	catch {
		return value
	}
}
