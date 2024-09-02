import * as esbuild from 'esbuild';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as sass from 'sass';
import CssModulesPlugin from 'esbuild-css-modules-plugin';
import { execSync } from 'node:child_process';

const opts: esbuild.BuildOptions = {
	// entryPoints: ['src/index.ts'],
	// entryPoints: ['src/elements/index.ts'],
	// entryPoints: ['src/**/index.ts'],
	entryPoints: ['src/**/*.ts'],
	// entryPoints: ['src/index.ts', 'src/elements/index.ts'],
	// outfile: 'dist/index.esm.js',
	outdir: 'dist',
	// outbase: 'src',
	platform: 'browser',

	format: 'esm',
	// bundle: true,
	sourcemap: true,
	minify: false,

	bundle: true,
	splitting: true,
	treeShaking: true,

	logLevel: 'info',
	metafile: true,

	external: ['gsap'],

	plugins: [
		{
			name: 'on_complete',
			setup(build) {
				build.onStart(() => {
					console.log('\nBuild starting...');
				});
				build.onEnd((b) => {
					// console.log(`Build done, ${b.errors.length} error${b.errors.length == 1 ? '' : 's'}. `)
				});
			},
		},
		{
			name: 'plugin_scss',
			setup(build) {
				build.onResolve({ filter: /\.scss$/ }, async (args) => {
					const source = path.resolve(args.resolveDir, args.path);

					let dest = path.resolve(path.resolve('./dist/css'), path.relative('./src', source));
					dest = path.join(path.dirname(dest), path.basename(dest, '.scss') + '.css');

					fs.mkdirSync(path.dirname(dest), { recursive: true });
					fs.writeFileSync(dest, sass.compile(source).css);

					return await build.resolve('./' + path.relative(args.resolveDir, dest), {
						importer: args.importer,
						namespace: args.namespace,
						resolveDir: args.resolveDir,
						kind: args.kind,
						pluginData: args.pluginData,
						with: args.with,
					});
				});
			},
		},
		CssModulesPlugin({
			inject: true,
			// emitDeclarationFile: '.css.d.ts',
		}),
	],
};

async function do_build() {
	if (process.argv.includes('--types')) {
		console.log('Building types...');
		execSync('tsc', { stdio: 'inherit' });
	}
	await esbuild.build(opts);

	// opts.outfile = 'dist/index.cjs.js';
	// opts.format = 'cjs';
	// await esbuild.build(opts);

	// opts.outfile = 'dist/index.min.js';
	// opts.minify = true;
	// await esbuild.build(opts);
}

// main
(async () => {
	if (process.argv.includes('--clean')) {
		const dir = opts.outdir || './dist/';
		if (fs.existsSync(dir)) {
			const doomed = fs.readdirSync(dir);
			for (const target of doomed) fs.rmSync(path.resolve(dir, target), { recursive: true });
		} else fs.mkdirSync(dir);
	}

	if (process.argv.includes('--watch')) {
		const ctx = await esbuild.context(opts);
		await ctx.watch();
		console.log('Watching...');
		process.on('SIGINT', function () {
			console.log('Exiting...');
			ctx.dispose();
			process.exit();
		});
	} else do_build();
})();
