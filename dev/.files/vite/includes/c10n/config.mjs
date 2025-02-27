/**
 * C10n config file.
 *
 * Vite is not aware of this config file's location.
 *
 * @note PLEASE DO NOT EDIT THIS FILE!
 * @note This entire file will be updated automatically.
 * @note Instead of editing here, please review <https://github.com/clevercanyon/skeleton>.
 */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import * as preact from 'preact';
import { $http as $cfpꓺhttp } from '../../../../../node_modules/@clevercanyon/utilities.cfp/dist/index.js';
import { $chalk, $fs, $glob } from '../../../../../node_modules/@clevercanyon/utilities.node/dist/index.js';
import { $obp, $str } from '../../../../../node_modules/@clevercanyon/utilities/dist/index.js';
import { renderToString as $preactꓺapisꓺssrꓺrenderToString } from '../../../../../node_modules/@clevercanyon/utilities/dist/preact/apis/ssr.js';
import { StandAlone as $preactꓺcomponentsꓺ404ꓺStandAlone } from '../../../../../node_modules/@clevercanyon/utilities/dist/preact/routes/404.js';
import exclusions from '../../../bin/includes/exclusions.mjs';
import u from '../../../bin/includes/utilities.mjs';

/**
 * Configures c10n for Vite.
 *
 * @param   props Props from vite config file driver.
 *
 * @returns       C10n configuration.
 */
export default async ({ mode, command, isSSRBuild, projDir, distDir, pkg, env, appType, targetEnv, staticDefs, pkgUpdates }) => {
	let postProcessed = false; // Initialize.
	return {
		name: 'vite-plugin-c10n-post-process',
		enforce: 'post', // After others on this hook.

		async closeBundle(/* Rollup hook. */) {
			if (postProcessed) return;
			postProcessed = true;

			/**
			 * Not during SSR builds.
			 */
			if (isSSRBuild) return;

			/**
			 * Recompiles `./package.json`.
			 */
			if ('build' === command) {
				u.log($chalk.gray('Recompiling `./package.json`.'));
				await u.updatePkg({ $set: pkgUpdates });
			}

			/**
			 * Generates typescript type declaration file(s).
			 */
			if ('build' === command /* Also does important type checking at build time. */) {
				u.log($chalk.gray('Generating TypeScript type declarations.'));
				await u.spawn('npx', ['tsc', '--emitDeclarationOnly']);
			}

			/**
			 * Prunes `./.npmignore`s, which we don’t include in any distribution.
			 *
			 * We only prune `./.npmignore`s when building for production, as it’s possible there are files being
			 * compiled by TypeScript that are needed for development; i.e., they need to exist in dev mode in order to
			 * be capable of serving their intended purpose; e.g., dev-only utilities, runners, sandbox files, etc.
			 *
			 * Regarding `node_modules`. There is an exception for the case of `node_modules/assets/a16s`, used for
			 * Cloudflare SSR-specific assets. See `../a16s/dir.mjs` for details. The `node_modules` folder is pruned by
			 * this routine (i.e., it’s in `./.npmignore`) which is why we need to be aware of the exception. As of
			 * right now, we don’t actually have to deal with the exception here, since this particular routine is
			 * bypassed if `isSSRBuild`. However, please keep it in mind for future reference.
			 *
			 * We intentionally use our 'default' NPM ignores when pruning; i.e., as opposed to using the current and
			 * potentially customized `./.npmignore` file in the current project directory. The reason is because we
			 * intend to enforce our standards. For further details {@see https://o5p.me/MuskgW}.
			 */
			if ('build' === command && 'prod' === mode) {
				for (let globOpts = [{ onlyDirectories: true }, { onlyFiles: false }], i = 0; i < globOpts.length; i++) {
					for (const fileOrDir of await $glob.promise(exclusions.defaultNPMIgnores, { cwd: distDir, ignoreCase: true, ...globOpts[i] })) {
						const projRelPath = path.relative(projDir, fileOrDir);

						if (!fs.existsSync(fileOrDir)) {
							continue; // Already pruned this in a previous iteration.
							// e.g., when we get directory parents first, then its leaves.
						}
						if (
							// These things we expect to prune regularly.
							// Anything else warrants more attention (see below).
							$str.matches(
								projRelPath,
								[
									...exclusions.devIgnores, //
									...exclusions.sandboxIgnores,
									...exclusions.exampleIgnores,
									...exclusions.docIgnores,
									...exclusions.testIgnores,
									...exclusions.specIgnores,
									...exclusions.benchIgnores,
								],
								{ ignoreCase: true, dot: false },
							)
						) {
							// These things we expect to prune regularly.
							u.log($chalk.gray('Pruning `./' + projRelPath + '`.'));
						} else {
							// Anything else warrants more attention (yellow).
							u.log($chalk.yellow('Pruning `./' + projRelPath + '`.'));
						}
						await fsp.rm(fileOrDir, { force: true, recursive: true });
					}
				}
			}

			/**
			 * Deletes a few things that are not needed by apps running on Cloudflare Pages.
			 */
			if ('build' === command && ['spa', 'mpa'].includes(appType) && ['cfp'].includes(targetEnv)) {
				for (const fileOrDir of await $glob.promise(
					[
						'types', // Prunes TypeScript type declarations.
						'index.*', // Prunes unused `index.*` files, in favor of SSR routes.
					],
					{ cwd: distDir, onlyFiles: false },
				)) {
					u.log($chalk.gray('Pruning `./' + path.relative(projDir, fileOrDir) + '`.'));
					await fsp.rm(fileOrDir, { force: true, recursive: true });
				}
			}

			/**
			 * Updates a few files that configure apps running on Cloudflare Pages.
			 */
			if ('build' === command && ['spa', 'mpa'].includes(appType) && ['cfp'].includes(targetEnv)) {
				for (const file of await $glob.promise(
					[
						'_headers', //
						'_redirects',
						'_routes.json',
						'404.html',
						'robots.txt',
						'sitemap.xml',
						'sitemaps/**/*.xml',
					],
					{ cwd: distDir },
				)) {
					const fileExt = $str.trim(path.extname(file), '.');
					const fileRelPath = path.relative(distDir, file);

					let fileContents = fs.readFileSync(file).toString(); // Reads file contents.

					for (const key of Object.keys(staticDefs) /* Replaces all static definition tokens. */) {
						fileContents = fileContents.replace(new RegExp($str.escRegExp(key), 'gu'), staticDefs[key]);
					}
					if (['_headers'].includes(fileRelPath)) {
						const cfpDefaultHeaders = $cfpꓺhttp.prepareDefaultHeaders({ appType, isC10n: env.APP_IS_C10N || false });
						fileContents = fileContents.replace('$$__APP_CFP_DEFAULT_HEADERS__$$', cfpDefaultHeaders);
					}
					if (['404.html'].includes(fileRelPath)) {
						const cfpDefault404 = '<!DOCTYPE html>' + $preactꓺapisꓺssrꓺrenderToString(preact.h($preactꓺcomponentsꓺ404ꓺStandAlone));
						fileContents = fileContents.replace('$$__APP_CFP_DEFAULT_404_HTML__$$', cfpDefault404);
					}
					if (['_headers', '_redirects', 'robots.txt'].includes(fileRelPath)) {
						fileContents = fileContents.replace(/^#[^\n]*\n/gmu, '');
						//
					} else if (['json'].includes(fileExt)) {
						fileContents = fileContents.replace(/\/\*[\s\S]*?\*\/\n?/gu, '');
						//
					} else if (['xml', 'html'].includes(fileExt)) {
						fileContents = fileContents.replace(/<!--[\s\S]*?-->\n?/gu, '');
					}
					fileContents = $str.trim(fileContents.replace(/\n{3,}/gu, '\n\n'));

					u.log($chalk.gray('Updating `./' + path.relative(projDir, file) + '`.'));
					await fsp.writeFile(file, fileContents);
				}
			}

			/**
			 * Generates SSR build on-the-fly internally.
			 */
			if ('build' === command && $obp.get(pkg, 'config.c10n.&.ssrBuild.appType')) {
				u.log($chalk.gray('Running secondary SSR build routine.'));
				await u.spawn('npx', ['vite', 'build', '--mode', mode, '--ssr']);
			}

			/**
			 * Generates a zip archive containing `./dist` directory.
			 */
			if ('build' === command) {
				const zipFile = path.resolve(projDir, './.~dist.zip');
				u.log($chalk.gray('Generating `' + path.relative(projDir, zipFile) + '`.'));

				const archive = $fs.archiver('zip', { zlib: { level: 9 } });
				archive.pipe(fs.createWriteStream(zipFile));
				archive.directory(distDir + '/', false);
				await archive.finalize();
			}
		},
	};
};
