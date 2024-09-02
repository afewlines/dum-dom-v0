import * as eslint from 'eslint';
// import {ESLint} from 'eslint';
eslint.Linter;

const options: eslint.ESLint.Options = {
	root: true,
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/eslint-recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:prettier/recommended',
	],
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint'],
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
	},
	rules: {
		'no-unused-vars': 'off',
		'@typescript-eslint/no-unused-vars': [
			'error',
			{ varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
		],
		'@typescript-eslint/triple-slash-reference': ['warn'],
		'@typescript-eslint/no-explicit-any': 'warn',
		'prettier/prettier': 'warn',
	},
};

export default options;
