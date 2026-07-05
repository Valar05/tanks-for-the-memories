import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const esbuild = require('esbuild-wasm');

const root = process.cwd();
const srcDir = path.join(root, 'src');
const distDir = path.join(root, 'dist');
const assetsDir = path.join(distDir, 'assets');
const publicDir = path.join(root, 'public');
const assetVersion = process.env.TFTM_ASSET_VERSION || String(Date.now());

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

function copyRecursive(source, destination) {
  if (!existsSync(source)) {
    return;
  }
  const stats = statSync(source);
  if (stats.isDirectory()) {
    mkdirSync(destination, { recursive: true });
    for (const entry of readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(destination, entry));
    }
    return;
  }
  mkdirSync(path.dirname(destination), { recursive: true });
  copyFileSync(source, destination);
}

function localFsResolver() {
  return {
    name: 'local-fs-resolver',
    setup(build) {
      build.onResolve({ filter: /^three$/ }, () => ({ path: path.join(root, 'node_modules', 'three', 'build', 'three.module.js') }));
      build.onResolve({ filter: /^three\/examples\/jsm\/loaders\/GLTFLoader\.js$/ }, () => ({ path: path.join(root, 'node_modules', 'three', 'examples', 'jsm', 'loaders', 'GLTFLoader.js') }));
      build.onResolve({ filter: /^three\/examples\/jsm\/controls\/OrbitControls\.js$/ }, () => ({ path: path.join(root, 'node_modules', 'three', 'examples', 'jsm', 'controls', 'OrbitControls.js') }));
      build.onResolve({ filter: /^three\/examples\/jsm\/geometries\/DecalGeometry\.js$/ }, () => ({ path: path.join(root, 'node_modules', 'three', 'examples', 'jsm', 'geometries', 'DecalGeometry.js') }));
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
  };
}

async function buildEntry(sourceName, outputName) {
  await esbuild.build({
    stdin: {
      contents: readFileSync(path.join(srcDir, sourceName), 'utf8'),
      resolveDir: srcDir,
      sourcefile: sourceName,
      loader: 'ts'
    },
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    outdir: assetsDir,
    entryNames: outputName,
    loader: { '.css': 'css' },
    write: true,
    plugins: [localFsResolver()]
  });
}

function writeBundledHtml(sourceName, outputName, bundleName) {
  const html = readFileSync(path.join(root, sourceName), 'utf8')
    .replace('</head>', `    <link rel="stylesheet" href="./assets/${bundleName}.css?v=${assetVersion}" />\n  </head>`)
    .replace(/<script type="module" src="\/src\/[^"]+"><\/script>/, `<script type="module" src="./assets/${bundleName}.js?v=${assetVersion}"></script>`);
  writeFileSync(path.join(distDir, outputName), html);
}

await buildEntry('main.ts', 'index');
await buildEntry('model-assay.ts', 'model-assay');
await buildEntry('alpha-control.ts', 'alpha-control');
await buildEntry('single-tank.ts', 'single-tank');
await buildEntry('retopo-tank.ts', 'retopo-tank');
await buildEntry('boxmodel-tank.ts', 'boxmodel-tank');
await buildEntry('textureable-tank.ts', 'textureable-tank');
await buildEntry('treadfirst-treads.ts', 'treadfirst-treads');

writeBundledHtml('index.html', 'index.html', 'index');
writeBundledHtml('model-assay.html', 'model-assay.html', 'model-assay');
writeBundledHtml('alpha-control.html', 'alpha-control.html', 'alpha-control');
writeBundledHtml('single-tank.html', 'single-tank.html', 'single-tank');
writeBundledHtml('retopo-tank.html', 'retopo-tank.html', 'retopo-tank');
writeBundledHtml('boxmodel-tank.html', 'boxmodel-tank.html', 'boxmodel-tank');
writeBundledHtml('textureable-tank.html', 'textureable-tank.html', 'textureable-tank');
writeBundledHtml('treadfirst-treads.html', 'treadfirst-treads.html', 'treadfirst-treads');
copyRecursive(publicDir, distDir);
copyRecursive(
  path.join(root, 'assets', 'generated', 'meshy', 'minimal_animatable_tank_v1'),
  path.join(distDir, 'model-assay', 'minimal_animatable_tank_v1')
);
copyRecursive(
  path.join(root, 'assets', 'generated', 'meshy', 'tank_meshy_part_assembly_v1'),
  path.join(distDir, 'model-assay', 'tank_meshy_part_assembly_v1')
);
copyRecursive(
  path.join(root, 'assets', 'generated', 'meshy', 'sherman_part_generation_v1'),
  path.join(distDir, 'model-assay', 'sherman_part_generation_v1')
);
copyRecursive(
  path.join(root, 'assets', 'generated', 'meshy', 'sherman_part_generation_v2'),
  path.join(distDir, 'model-assay', 'sherman_part_generation_v2')
);
copyRecursive(
  path.join(root, 'assets', 'generated', 'meshy', 'sherman_part_selected_source_v1'),
  path.join(distDir, 'model-assay', 'sherman_part_selected_source_v1')
);
copyRecursive(
  path.join(root, 'assets', 'generated', 'meshy', 'sherman_part_meshy_kit_v1'),
  path.join(distDir, 'model-assay', 'sherman_part_meshy_kit_v1')
);
copyRecursive(
  path.join(root, 'assets', 'generated', 'meshy', 'sherman_mantlet_socket_v1'),
  path.join(distDir, 'model-assay', 'sherman_mantlet_socket_v1')
);
copyRecursive(
  path.join(root, 'assets', 'generated', 'meshy', 'sherman_coaxial_mg_v1'),
  path.join(distDir, 'model-assay', 'sherman_coaxial_mg_v1')
);
copyRecursive(
  path.join(root, 'assets', 'generated', 'openai', 'sherman_runtime_pbr_v1'),
  path.join(distDir, 'model-assay', 'sherman_runtime_pbr_v1')
);
copyRecursive(
  path.join(root, 'assets', 'generated', 'openai', 'sherman_albedo_only_v1'),
  path.join(distDir, 'model-assay', 'sherman_albedo_only_v1')
);
copyRecursive(
  path.join(root, 'assets', 'generated', 'openai', 'sherman_default_texture_set_v1'),
  path.join(distDir, 'model-assay', 'sherman_default_texture_set_v1')
);
copyRecursive(
  path.join(root, 'assets', 'authored'),
  path.join(distDir, 'authored')
);
console.log('Built dist using esbuild-wasm.');
