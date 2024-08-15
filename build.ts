import * as esbuild from 'esbuild';
import * as fs from 'node:fs';
import * as path from 'node:path';
import CssModulesPlugin from 'esbuild-css-modules-plugin';
import { execSync } from 'node:child_process';

const opts: esbuild.BuildOptions = {
	entryPoints: ['src/index.ts'],
	outfile: 'dist/index.esm.js',
	platform: 'browser',

	format: 'esm',
	bundle: true,
	sourcemap: true,
	minify: false,

	logLevel: 'info',
	metafile: true,

	plugins: [
		{
			name: 'on_complete',
			setup(build) {
				if (build.initialOptions.format == 'esm') {
					console.log('Building types...');
					if (process.argv.includes('--types')) execSync('tsc', { stdio: 'inherit' });
				}
				build.onStart(() => {
					console.log('\nBuild starting...');
				});
				build.onEnd((b) => {
					// console.log(`Build done, ${b.errors.length} error${b.errors.length == 1 ? '' : 's'}. `)
				});
			},
		},
		CssModulesPlugin({
			inject: true,
			emitDeclarationFile: '.css.d.ts',
		}),
	],
};

async function do_build() {
	if (process.argv.includes('--types')) {
		execSync('tsc', { stdio: 'inherit' });
	}
	await esbuild.build(opts);

	opts.outfile = 'dist/index.cjs.js';
	opts.format = 'cjs';
	await esbuild.build(opts);

	opts.outfile = 'dist/index.min.js';
	opts.minify = true;
	await esbuild.build(opts);
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
