module.exports = {
	root: true,
	env: {
		es6: true,
		node: true,
	},
	extends: [
		'eslint:recommended',
		'plugin:import/errors',
		'plugin:import/warnings',
		'plugin:import/typescript',
		'google',
		'plugin:@typescript-eslint/recommended',
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: ['tsconfig.json', 'tsconfig.dev.json'],
		sourceType: 'module',
	},
	ignorePatterns: [
		'/lib/**/*', // Ignore built files.
	],
	plugins: ['@typescript-eslint', 'import'],
	rules: {
		quotes: ['error', 'single'],
		'import/no-unresolved': 0,
		'linebreak-style': 0,
		'comma-dangle': 0,
		indent: 0,
		'no-tabs': 0,
		'quote-props': 0,
		'eol-last': 0,
		semi: 0,
		'max-len': 0,
		'@typescript-eslint/ban-ts-comment': 0,
		camelcase: 0,
		'@typescript-eslint/no-unused-vars': 0,
		'require-jsdoc': 0,
		'operator-linebreak': 0,
	},
};
