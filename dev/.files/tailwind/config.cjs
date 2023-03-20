/**
 * Tailwind CSS config file.
 *
 * Tailwind is not aware of this config file's location.
 *
 * @note PLEASE DO NOT EDIT THIS FILE!
 * @note This entire file will be updated automatically.
 * @note Instead of editing here, please review <https://github.com/clevercanyon/skeleton>.
 *
 * @see https://tailwindcss.com/docs/configuration
 */
/* eslint-env es2021, node */

/*
-----------------------------------------------------------------------------------------------------------------------
Example `index.scss` starter file contents:
-----------------------------------------------------------------------------------------------------------------------
@import 'https://fonts.googleapis.com/css2?family=Georama:ital,wght@0,100..900;1,100..900&display=swap';

@tailwind base;
@tailwind components;
@tailwind utilities;
-------------------------------------------------------------------------------------------------------------------- */

const path = require('node:path');
const projDir = path.resolve(__dirname, '../../..');

/**
 * Composition.
 */
module.exports = {
	plugins: [require('@tailwindcss/typography')],
	theme: {
		fontFamily: {
			sans: ['Georama', 'sans-serif'],
			serif: ['Georgia', 'serif'],
		},
	},
	content: [path.resolve(projDir, './src/**/*.{md,xml,html,shtml,php,ejs,js,jsx,cjs,cjsx,node,mjs,mjsx,ts,tsx,cts,ctsx,mts,mtsx}')],
};
