import process from 'node:process'
import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',
	devtools: { enabled: true },
	vite: {
		plugins: [
			tailwindcss(),
		],
	},
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
		streamerChannel: process.env.STREAMER_CHANNEL,
		public: {
			// Public variables if needed
		},
	},
})
