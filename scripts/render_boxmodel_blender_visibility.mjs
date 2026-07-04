import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const blenderScript = path.join(root, 'scripts', 'render_boxmodel_blender_visibility.py');
const contactScript = path.join(root, 'scripts', 'build_boxmodel_blender_visibility_contact_sheet.py');
const manifestPath = path.join(root, 'generated', 'blender-visibility', 'authored_sherman_boxmodel_v1', 'manifest.json');

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.signal) {
    console.error(command + ' terminated by signal ' + result.signal);
    process.exit(1);
  }
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

run('proot-distro', ['login', 'debian', '--', 'blender', '--background', '--python', blenderScript]);
run('python3', [contactScript]);
if (!existsSync(manifestPath)) {
  console.error('missing Blender visibility manifest: ' + manifestPath);
  process.exit(1);
}
console.log('Blender visibility diagnostic written to ' + path.dirname(manifestPath));
