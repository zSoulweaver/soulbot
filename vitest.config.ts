import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
	test: {
		environment: 'nuxt',
		environmentOptions: {
			nuxt: {
				domEnvironment: 'happy-dom',
			},
		},
		setupFiles: ['./test/setup.ts'],
		globals: true, // Enable Vitest global variables like describe, it, expect, vi
		fileParallelism: false, // Run test files sequentially to avoid SQLite lock contention
	},
	plugins: [
		{
			name: 'ignore-bun-test',
			enforce: 'pre',
			resolveId(id) {
				if (id === 'bun:test') {
					return { id: 'bun:test', external: true }
				}
			},
		},
	],
})
