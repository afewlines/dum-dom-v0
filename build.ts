import * as esbuild from 'esbuild';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as sass from 'sass';
import CssModulesPlugin from 'esbuild-css-modules-plugin';
import { execSync } from 'node:child_process';

const opts: esbuild.BuildOptions = {
	entryPoints: ['src/**/*.ts'],
	outdir: 'dist',
	outbase: 'src',

	platform: 'browser',
	format: 'esm',

	bundle: true,
	splitting: true,
	treeShaking: true,
	// minify: false,
	minify: true,

	chunkNames: 'data/[ext]/[name]-[hash]',

	logLevel: 'info',
	metafile: true,
	sourcemap: true,

	external: ['gsap'],

	plugins: [
		{
			name: 'plugin_scss',
			setup(build) {
				build.onResolve({ filter: /\.scss$/ }, async (args) => {
					const source = path.resolve(args.resolveDir, args.path);

					let dest = path.resolve(path.resolve('./dist/data/css'), path.relative('./src', source));
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
		}),
	],
};

async function do_build() {
	if (process.argv.includes('--types')) {
		console.log('Building types...');
		execSync('tsc', { stdio: 'inherit' });
	}
	await esbuild.build(opts);
	if (process.argv.includes('--exports')) {
		const indicies: string[] = [];
		const subpackages: string[] = [];

		for (const target of fs.readdirSync('./dist/', { recursive: true })) {
			const test = target.toString().replace(/\\/g, '/');
			if (/^data\//.test(test)) continue;
			if (/^styling\//.test(test)) continue;
			if (/common.js$/i.test(test)) continue;
			if (/\.js$/i.test(test)) {
				const name = path.basename(test);
				if (name === 'index.js') indicies.push(test);
				else subpackages.push(test);
			}
		}

		const fake_exports: { [key: string]: string } = {};
		console.log('\nDO INDICIES');
		for (const index of indicies) {
			const subpackage = `./${path.dirname(index)}`;
			const source = `./dist/${index}`;
			console.log(`\t${subpackage}: ${source}`);
			fake_exports[subpackage.replace(/\\/g, '/')] = source.replace(/\\/g, '/');
		}
		console.log('\nDO SUBPACKAGE');
		for (const target of subpackages) {
			const subpackage = `./${path.join(path.dirname(target), path.basename(target, path.extname(target)))}`;
			const source = `./dist/${target}`;
			console.log(`\t${subpackage}: ${source}`);
			fake_exports[subpackage.replace(/\\/g, '/')] = source.replace(/\\/g, '/');
		}
		console.log('\n"exports":', JSON.stringify(fake_exports, undefined, 4));
	}

	// TODO necro cjs/min formats

	// opts.outfile = 'dist/index.cjs.js';
	// opts.format = 'cjs';
	// await esbuild.build(opts);

	// opts.outfile = 'dist/index.min.js';
	// opts.minify = true;
	// await esbuild.build(opts);
}

// main
async function main() {
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
}

main();
