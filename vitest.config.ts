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
		globalSetup: ['./test/global-setup.ts'],
		globals: true,
		fileParallelism: true,
		silent: 'passed-only',
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
