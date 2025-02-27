/**
 * Import aliases config file.
 *
 * @note PLEASE DO NOT EDIT THIS FILE!
 * @note This entire file will be updated automatically.
 * @note Instead of editing here, please review <https://github.com/clevercanyon/skeleton>.
 */

import path from 'node:path';
import { $fs } from '../../../../node_modules/@clevercanyon/utilities.node/dist/index.js';

const __dirname = $fs.imuDirname(import.meta.url);
const projDir = path.resolve(__dirname, '../../../..');

/**
 * Defines import aliases.
 */
export default {
	asGlobs: {
		'react': path.resolve(projDir, './node_modules/preact/compat'),
		'react/jsx-runtime': path.resolve(projDir, './node_modules/preact/jsx-runtime'),

		'react-dom': path.resolve(projDir, './node_modules/preact/compat'),
		'react-dom/test-utils': path.resolve(projDir, './node_modules/preact/test-utils'),
	},
	asRegExpStrings: {
		'^react$': path.resolve(projDir, './node_modules/preact/compat'),
		'^react/jsx-runtime$': path.resolve(projDir, './node_modules/preact/jsx-runtime'),

		'^react-dom$': path.resolve(projDir, './node_modules/preact/compat'),
		'^react-dom/test-utils$': path.resolve(projDir, './node_modules/preact/test-utils'),
	},
	asFindReplaceRegExps: [
		{ find: /^react$/u, replacement: path.resolve(projDir, './node_modules/preact/compat') },
		{ find: /^react\/jsx-runtime$/u, replacement: path.resolve(projDir, './node_modules/preact/jsx-runtime') },
		{ find: /^react-dom$/u, replacement: path.resolve(projDir, './node_modules/preact/compat') },
		{ find: /^react-dom\/test-utils$/u, replacement: path.resolve(projDir, './node_modules/preact/test-utils') },
	],
};
