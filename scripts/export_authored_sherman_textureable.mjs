import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const assetId = 'authored_sherman_textureable_v1';
const blenderScript = path.join(root, 'scripts', 'export_authored_sherman_textureable.py');
const templateDir = path.join(root, 'assets', 'authored', assetId, 'texture_templates');
const runtimePlateDir = path.join(root, 'public', 'tftm', 'models', assetId, 'texture_plates');
const facePlateIds = ['hull_glacis','hull_left','hull_right','hull_rear','engine_deck','turret_front','turret_left','turret_right','turret_top','turret_bustle','mantlet','barrel_strip','coaxial_mg','track_outer','track_inner_top_bottom','wheel_disc','bogie_side'];
const plateColors = {
  hull_glacis: '#5f6b43', hull_left: '#59643f', hull_right: '#59643f', hull_rear: '#4d5737', engine_deck: '#56623f',
  turret_front: '#626d45', turret_left: '#5c6742', turret_right: '#5c6742', turret_top: '#657049', turret_bustle: '#56623f',
  mantlet: '#4b4e3b', barrel_strip: '#414438', coaxial_mg: '#151612', track_outer: '#2e2c24', track_inner_top_bottom: '#373329',
  wheel_disc: '#4c4635', bogie_side: '#514a38'
};
function run(command, args) { const result = spawnSync(command, args, { stdio: 'inherit' }); if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1); }
function writePlate(file, id, color, guide) {
  const script = [
    'from PIL import Image, ImageDraw', 'import random, sys',
    'file, color, guide, seed = sys.argv[1], sys.argv[2], sys.argv[3] == \'1\', sys.argv[4]',
    'rng = random.Random(seed)', 'img = Image.new(\'RGB\', (1024, 1024), color)', 'p = img.load()',
    'base = tuple(int(color.lstrip(\'#\')[i:i+2], 16) for i in (0, 2, 4))',
    'for y in range(1024):', '    shade = int((y / 1023 - 0.5) * 16)', '    for x in range(1024):',
    '        if (x * 3 + y * 5) % 17 == 0:', '            jitter = rng.randint(-5, 5)', '            p[x, y] = tuple(max(0, min(255, c + shade + jitter)) for c in base)',
    'd = ImageDraw.Draw(img, \'RGBA\')',
    'if guide:', '    d.rectangle((52, 52, 972, 972), outline=(216, 209, 167, 132), width=6)', '    d.rectangle((96, 96, 928, 928), outline=(37, 41, 30, 58), width=3)', '    d.line((132, 512, 892, 512), fill=(32, 36, 25, 24), width=2)', '    d.line((512, 132, 512, 892), fill=(32, 36, 25, 24), width=2)',
    'else:', '    for _ in range(34):', '        x0 = rng.randint(70, 920)', '        y0 = rng.randint(70, 920)', '        x1 = x0 + rng.randint(20, 110)', '        d.line((x0, y0, x1, y0 + rng.randint(-2, 2)), fill=(30, 34, 24, rng.randint(8, 22)), width=rng.randint(1, 2))',
    'img.save(file)'
  ].join('\n');
  const result = spawnSync('python3', ['-c', script, file, color, guide ? '1' : '0', id], { encoding: 'utf8' });
  if ((result.status ?? 1) !== 0) throw new Error('failed to write plate ' + id + ': ' + (result.stderr || result.stdout));
}
run('proot-distro', ['login', 'debian', '--', 'blender', '--background', '--python', blenderScript]);
mkdirSync(templateDir, { recursive: true });
mkdirSync(runtimePlateDir, { recursive: true });
for (const id of facePlateIds) { writePlate(path.join(templateDir, id + '.png'), id, plateColors[id], true); writePlate(path.join(runtimePlateDir, id + '.png'), id, plateColors[id], false); }
console.log(JSON.stringify({ asset_id: assetId, texture_templates: templateDir, runtime_plates: runtimePlateDir, facePlateIds }, null, 2));
