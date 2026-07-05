import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const blenderScript = path.join(root, 'scripts', 'export_authored_sherman_treads.py');
const result = spawnSync('proot-distro', ['login', 'debian', '--', 'blender', '--background', '--python', blenderScript], { stdio: 'inherit' });
if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
