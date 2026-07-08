import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { requirePromptContract } from './prompt_contract_guard.mjs';
requirePromptContract({ action: 'guided_hard_surface_hull_export' });

const root = process.cwd();
const blenderScript = path.join(root, 'scripts', 'export_authored_sherman_guided_hull.py');
const result = spawnSync('proot-distro', ['login', 'debian', '--', 'blender', '--background', '--python', blenderScript], { stdio: 'inherit' });
if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
