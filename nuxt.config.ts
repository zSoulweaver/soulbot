import process from 'node:process'
import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',
	devtools: { enabled: true },

	vite: {
		plugins: process.env.NODE_ENV === 'test'
			? []
			: [
					tailwindcss(),
				],
		optimizeDeps: {
			include: [
				'lucide-vue-next',
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
		twitchClientId: process.env.TWITCH_CLIENT_ID,
		twitchClientSecret: process.env.TWITCH_CLIENT_SECRET,
		twitchRedirectUri: process.env.TWITCH_REDIRECT_URI,
		botTwitchRedirectUri: process.env.BOT_TWITCH_REDIRECT_URI,
		streamerChannel: process.env.STREAMER_CHANNEL,
		enableBot: process.env.ENABLE_BOT === 'true',
		oauth: {
			twitch: {
				clientId: process.env.TWITCH_CLIENT_ID,
				clientSecret: process.env.TWITCH_CLIENT_SECRET,
				redirectURL: process.env.TWITCH_REDIRECT_URI,
			},
		},
		public: {
			// Public variables if needed
		},
	},

	nitro: {
		sourceMap: true,
	},

	modules: ['nuxt-auth-utils', '@vueuse/nuxt'],

	typescript: {
		tsConfig: {
			include: ['../test/**/*'],
		},
	},
})
