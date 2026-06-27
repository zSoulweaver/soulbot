import process from 'node:process'
import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',
	devtools: { enabled: true },

	devServer: {
		host: '127.0.0.1',
		https: true,
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
		streamerChannel: '',
		enableBot: true,
		spotifyClientId: '',
		spotifyClientSecret: '',
		spotifyRedirectUri: '',
		twitchEventSubTransport: 'ws',
		twitchEventSubSecret: 'default-fixed-secret-change-me',
		twitchEventSubHost: '',
		twitchEventSubPort: '8080',
		ngrokAuthtoken: '',
		oauth: {
			twitch: {
				clientId: '',
				clientSecret: '',
				redirectURL: '',
			},
		},
		public: {
			// Public variables if needed
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
