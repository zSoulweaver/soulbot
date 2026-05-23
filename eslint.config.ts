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
			'no-template-curly-in-string': 'off',
			'vitest/prefer-lowercase-title': [
				'error',
				{
					allowedPrefixes: [
						'GET',
						'POST',
						'PUT',
						'DELETE',
					],
				},
			],
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
		rules: {
			'better-tailwindcss/enforce-consistent-line-wrapping': [
				'warn',
				{
					printWidth: 1000,
					indent: 'tab',
				},
			],
		},
	},
)
