import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const esbuild = require('esbuild-wasm');

const root = process.cwd();
const srcDir = path.join(root, 'src');
const distDir = path.join(root, 'dist');
const assetsDir = path.join(distDir, 'assets');

rmSync(distDir, { recursive: true, force: true });
mkdirSync(assetsDir, { recursive: true });

function resolveImport(importPath, resolveDir) {
  const base = path.resolve(resolveDir, importPath);
  const ext = path.extname(base);
  const candidates = ext ? [base] : [base, base + '.ts', base + '.tsx', base + '.js', base + '.jsx', base + '.css'];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

await esbuild.build({
  stdin: {
    contents: readFileSync(path.join(srcDir, 'main.ts'), 'utf8'),
    resolveDir: srcDir,
    sourcefile: 'main.ts',
    loader: 'ts'
  },
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  outdir: assetsDir,
  entryNames: 'index',
  loader: { '.css': 'css' },
  write: true,
  plugins: [{
    name: 'local-fs-resolver',
    setup(build) {
      build.onResolve({ filter: /^three$/ }, () => ({ path: path.join(root, 'node_modules', 'three', 'build', 'three.module.js') }));
      build.onResolve({ filter: /^\.|^\// }, (args) => {
        const resolved = resolveImport(args.path, args.resolveDir);
        if (!resolved) {
          return { errors: [{ text: 'Could not resolve ' + args.path + ' from ' + args.resolveDir }] };
        }
        return { path: resolved };
      });
      build.onLoad({ filter: /\.(ts|tsx|js|jsx)$/ }, (args) => ({
        contents: readFileSync(args.path, 'utf8'),
        loader: path.extname(args.path).slice(1) === 'ts' ? 'ts' : path.extname(args.path).slice(1) === 'tsx' ? 'tsx' : 'js'
      }));
      build.onLoad({ filter: /\.css$/ }, (args) => ({ contents: readFileSync(args.path, 'utf8'), loader: 'css' }));
    }
  }]
});

const html = readFileSync(path.join(root, 'index.html'), 'utf8')
  .replace('</head>', '    <link rel="stylesheet" href="./assets/index.css" />\n  </head>')
  .replace('<script type="module" src="/src/main.ts"></script>', '<script type="module" src="./assets/index.js"></script>');

writeFileSync(path.join(distDir, 'index.html'), html);
console.log('Built dist using esbuild-wasm.');
