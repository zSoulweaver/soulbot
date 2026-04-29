import antfu from '@antfu/eslint-config'
import betterTailwindCss from 'eslint-plugin-better-tailwindcss'

export default antfu(
	{
		formatters: true,
		vue: true,
		stylistic: {
			indent: 'tab',
		},
		rules: {
			'no-console': 'off',
		},
	},
	{
		extends: [
			betterTailwindCss.configs.recommended,
		],
		settings: {
			'better-tailwindcss': {
				entryPoint: 'app/assets/css/main.css',
			},
		},
	},
)
