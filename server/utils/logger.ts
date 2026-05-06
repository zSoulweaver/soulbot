import process from 'node:process'
import pino from 'pino'

const transports = []

// Always use pino-pretty in development for nice local logs
if (process.env.NODE_ENV !== 'production') {
	transports.push({
		target: 'pino-pretty',
		options: {
			colorize: true,
			ignore: 'pid,hostname',
			translateTime: 'SYS:standard',
		},
	})
}
else if (!process.env.AXIOM_TOKEN) {
	// In production without axiom, we just log basic JSON to stdout
	transports.push({
		target: 'pino/file',
		options: { destination: 1 },
	})
}

// Add Axiom transport if credentials are provided
if (process.env.AXIOM_TOKEN && process.env.AXIOM_DATASET) {
	transports.push({
		target: '@axiomhq/pino',
		options: {
			dataset: process.env.AXIOM_DATASET,
			token: process.env.AXIOM_TOKEN,
		},
	})
}

// Initialize Pino logger
export const logger = pino(
	transports.length > 0
		? pino.transport({ targets: transports })
		: {},
)

// Export specialized loggers for different sub-components
export const apiLogger = logger.child({ component: 'api' })
export const botLogger = logger.child({ component: 'bot' })
export const dbLogger = logger.child({ component: 'database' })
