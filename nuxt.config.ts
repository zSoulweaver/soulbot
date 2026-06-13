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
		twitchClientId: process.env.TWITCH_CLIENT_ID,
		twitchClientSecret: process.env.TWITCH_CLIENT_SECRET,
		twitchRedirectUri: process.env.TWITCH_REDIRECT_URI,
		botTwitchRedirectUri: process.env.BOT_TWITCH_REDIRECT_URI,
		streamerChannel: process.env.STREAMER_CHANNEL,
		enableBot: process.env.ENABLE_BOT === 'true',
		spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
		spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
		spotifyRedirectUri: process.env.SPOTIFY_REDIRECT_URI,
		twitchEventSubTransport: process.env.TWITCH_EVENTSUB_TRANSPORT || 'ws',
		twitchEventSubSecret: process.env.TWITCH_EVENTSUB_SECRET || 'default-fixed-secret-change-me',
		twitchEventSubHost: process.env.TWITCH_EVENTSUB_HOST,
		twitchEventSubPort: process.env.TWITCH_EVENTSUB_PORT || '8080',
		ngrokAuthtoken: process.env.NGROK_AUTHTOKEN,
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
