import {copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';

const root = process.cwd();
const dist = path.join(root, 'dist');
const assets = path.join(dist, 'assets');
const publicDir = path.join(root, 'public');

rmSync(dist, {recursive: true, force: true});
mkdirSync(assets, {recursive: true});

await esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  outfile: 'dist/assets/index.js',
  loader: {'.css': 'css'},
  sourcemap: false,
});

function copyRecursive(source, destination) {
  if (!existsSync(source)) return;
  const stat = statSync(source);
  if (stat.isDirectory()) {
    mkdirSync(destination, {recursive: true});
    for (const entry of readdirSync(source)) copyRecursive(path.join(source, entry), path.join(destination, entry));
    return;
  }
  mkdirSync(path.dirname(destination), {recursive: true});
  copyFileSync(source, destination);
}

copyRecursive(publicDir, dist);

const html = readFileSync('index.html', 'utf8')
  .replace('</head>', '    <link rel="stylesheet" href="/tanks-for-the-memories/assets/index.css" />\n  </head>')
  .replace('<script type="module" src="/src/main.ts"></script>', '<script type="module" src="/tanks-for-the-memories/assets/index.js"></script>');
writeFileSync(path.join(dist, 'index.html'), html);

console.log('Built dist/index.html');
