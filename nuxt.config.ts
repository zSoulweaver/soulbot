import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import tailwindcss from '@tailwindcss/vite'
import selfsigned from 'selfsigned'

async function getDevHttpsConfig() {
	const certsDir = join(process.cwd(), '.certs')
	const keyPath = join(certsDir, 'dev-key.pem')
	const certPath = join(certsDir, 'dev-cert.pem')

	if (!existsSync(keyPath) || !existsSync(certPath)) {
		mkdirSync(certsDir, { recursive: true })
		const attrs = [{ name: 'commonName', value: '127.0.0.1' }]
		const notAfterDate = new Date()
		notAfterDate.setFullYear(notAfterDate.getFullYear() + 10)

		const pems = await selfsigned.generate(attrs, {
			notAfterDate,
			algorithm: 'sha256',
			keySize: 2048,
			extensions: [
				{
					name: 'basicConstraints',
					cA: true,
				},
				{
					name: 'keyUsage',
					keyCertSign: true,
					digitalSignature: true,
					keyEncipherment: true,
				},
				{
					name: 'subjectAltName',
					altNames: [
						{ type: 2, value: 'localhost' },
						{ type: 7, ip: '127.0.0.1' },
					],
				},
			],
		})

		writeFileSync(keyPath, pems.private, 'utf8')
		writeFileSync(certPath, pems.cert, 'utf8')
	}

	return {
		key: keyPath,
		cert: certPath,
	}
}

const devHttps = await getDevHttpsConfig()

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',
	devtools: { enabled: true },

	app: {
		pageTransition: {
			name: 'page',
			mode: 'out-in',
		},
	},

	devServer: {
		host: '127.0.0.1',
		https: devHttps,
	},

	vite: {
		plugins: process.env.NODE_ENV === 'test'
			? []
			: [
					tailwindcss(),
				],
		optimizeDeps: {
			include: [
				'@lucide/vue',
				'vue-sonner',
				'clsx',
				'tailwind-merge',
				'@vueuse/core',
				'reka-ui',
				'class-variance-authority',
			],
		},
	},

	ssr: true,
	css: ['./app/assets/css/main.css'],

	components: [
		{
			path: '~/components',
			pathPrefix: false,
			pattern: '**/*.vue', // Only auto-import .vue files
		},
	],

	runtimeConfig: {
		twitchClientId: '',
		twitchClientSecret: '',
		twitchRedirectUri: '',
		botTwitchRedirectUri: '',
		enableBot: true,
		spotifyClientId: '',
		spotifyClientSecret: '',
		spotifyRedirectUri: '',
		twitchEventsubTransport: 'ws',
		twitchEventsubSecret: 'default-fixed-secret-change-me',
		twitchEventsubHost: '',
		twitchEventsubPort: '8080',
		ngrokAuthtoken: '',

		public: {
			botName: 'Soulbot',
		},
	},

	nitro: {
		sourceMap: true,
		externals: {
			inline: ['@lucide/vue'],
		},
	},

	modules: ['nuxt-auth-utils', '@vueuse/nuxt', '@nuxtjs/color-mode'],

	colorMode: {
		preference: 'system',
		fallback: 'dark',
	},

	typescript: {
		tsConfig: {
			include: ['../test/**/*'],
		},
	},
})
