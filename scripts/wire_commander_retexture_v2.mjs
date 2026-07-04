import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const variants = {
  bravo: {
    label: 'Bravo',
    role: 'Aggressive Assault Tank',
    color: 'blue',
    mood: 'Restless, energetic, always moving',
    traits: ['blue recognition stripe', 'motion wear', 'fresh glacis scratches', 'exhaust soot', 'subtle replacement wheel'],
    task: '019f2bde-e9a8-779a-95fe-4af07c87a97c',
    bytes: 30481464
  },
  tango: {
    label: 'Tango',
    role: 'Human Tank',
    color: 'green',
    mood: 'Warm, approachable, campaign veteran',
    traits: ['muted green recognition stripe', 'rubbed crew surfaces', 'boot scuffs', 'varied canvas coloration', 'gentle veteran maintenance'],
    task: '019f2be1-f1fe-781f-8541-1fd8a9e073cc',
    bytes: 28779464
  },
  delta: {
    label: 'Delta',
    role: 'Planner',
    color: 'yellow',
    mood: 'Methodical, disciplined, controlled',
    traits: ['restrained yellow recognition stripe', 'touch-up paint', 'wiped fuel caps', 'controlled grime', 'organized maintenance wear'],
    task: '019f2be4-7152-7ca7-8f52-a0899bd331be',
    bytes: 29059564
  }
};

for (const [id, data] of Object.entries(variants)) {
  const slug = `m4a3_75_vvss_sherman_${id}_retexture_v2`;
  const srcDir = path.join('assets/generated/meshy', slug);
  const publicDir = path.join('public/tftm/models', slug);
  mkdirSync(publicDir, { recursive: true });
  copyFileSync(path.join(srcDir, 'glb.glb'), path.join(publicDir, `${slug}.glb`));

  const manifest = {
    asset_id: slug,
    display_name: `M4A3 75mm Sherman ${data.label} Retexture V2`,
    asset_class: 'meshy_retexture_on_vanilla_base_candidate',
    status: 'human_cloud_visual_review_pending',
    commander_variant: id,
    commander_letter: data.label[0],
    role: data.role,
    recognition_color: data.color,
    mood: data.mood,
    traits: data.traits,
    repair_reason: 'V1 visual review read as pseudo-font marking noise; V2 removes letter/chalk/typography burden from Meshy and asks for one clear recognition stripe plus restrained wear language.',
    generated_at: '2026-07-04T06:52:00.000Z',
    endpoint: '/openapi/v1/retexture',
    source_vanilla_task_id: '019f2a16-c82b-7b52-b541-c707b58c5d00',
    retexture_task_id: data.task,
    source_manifest: `${srcDir}/manifest.json`,
    glb: `${publicDir}/${slug}.glb`,
    inspection: {
      approximate_triangles: 10216,
      texture_count: 4,
      image_count: 4,
      node_count: 1,
      mesh_count: 1,
      primitive_count: 1,
      material_count: 1,
      glb_bytes: data.bytes
    },
    runtime_contract: {
      vanilla_base_preserved: true,
      identity_from_texture_only: true,
      visual_texture_candidate: true,
      gameplay_animation_ready: false,
      rejection_reason_for_gameplay_animation: 'Fused static Meshy sculpture; same vanilla-base animation limitations remain.',
      acceptance_gate: 'Human cloud visual review must confirm a clear commander personality without pseudo-lettering, harsh font texture, or decorative typography.'
    }
  };
  writeFileSync(path.join(publicDir, 'model_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const v1Path = path.join('public/tftm/models', `m4a3_75_vvss_sherman_${id}_retexture_v1`, 'model_manifest.json');
  if (existsSync(v1Path)) {
    const old = JSON.parse(readFileSync(v1Path, 'utf8'));
    old.status = 'red_rejected_visual_build_font_noise';
    old.red_build = {
      observed: 'Human visual review read the markings as harsh pseudo-font texture / reject font noise rather than commander personality.',
      replacement: slug,
      doctrine: 'Do not ask Meshy Retexture to carry complex text, chalk notes, route marks, numbers, or lettering as personality. Use one clear recognition color and restrained non-text wear language.'
    };
    writeFileSync(v1Path, `${JSON.stringify(old, null, 2)}\n`);
  }
}

const platoonPath = 'public/tftm/models/commander_platoon_retexture_v1/model_manifest.json';
const platoon = JSON.parse(readFileSync(platoonPath, 'utf8'));
platoon.status = 'human_cloud_visual_review_pending_font_noise_repair_v2';
platoon.repair_note = 'Bravo/Tango/Delta v1 were rejected by visual read as pseudo-font marking noise. V2 variants remove letters and chalk text from Meshy prompts and use one recognition stripe plus restrained wear/personality per tank.';
for (const variant of platoon.variants) {
  if (variant.id !== 'alpha') {
    const data = variants[variant.id];
    const slug = `m4a3_75_vvss_sherman_${variant.id}_retexture_v2`;
    variant.glb = `public/tftm/models/${slug}/${slug}.glb`;
    variant.manifest = `public/tftm/models/${slug}/model_manifest.json`;
    variant.retexture_task_id = data.task;
    variant.status = 'human_cloud_visual_review_pending';
    variant.repair = 'v2 no-text recognition-stripe repair';
  }
}
platoon.acceptance_gate = 'Viewer should infer four different crews after a three-second glance while recognizing one platoon and one shared Sherman base; Bravo/Tango/Delta must not read as harsh font texture or pseudo-lettering.';
writeFileSync(platoonPath, `${JSON.stringify(platoon, null, 2)}\n`);

let source = readFileSync('src/alpha-assay.ts', 'utf8');
source = source.replace('tftm-commander-platoon-retexture-v1-20260704a', 'tftm-commander-platoon-retexture-v2-20260704a');
for (const id of Object.keys(variants)) {
  source = source.replaceAll(`m4a3_75_vvss_sherman_${id}_retexture_v1`, `m4a3_75_vvss_sherman_${id}_retexture_v2`);
}
source = source.replace(
  'Four commander texture variants. One accepted vanilla base mesh. Texture language only.',
  'Four commander texture variants. V2 removes pseudo-font noise from Bravo/Tango/Delta.'
);
writeFileSync('src/alpha-assay.ts', source);

let smoke = readFileSync('scripts/smoke.mjs', 'utf8');
const additions = [
  'assets/generated/meshy/m4a3_75_vvss_sherman_bravo_retexture_v2/glb.glb',
  'assets/generated/meshy/m4a3_75_vvss_sherman_bravo_retexture_v2/fbx.fbx',
  'assets/generated/meshy/m4a3_75_vvss_sherman_bravo_retexture_v2/manifest.json',
  'public/tftm/models/m4a3_75_vvss_sherman_bravo_retexture_v2/m4a3_75_vvss_sherman_bravo_retexture_v2.glb',
  'public/tftm/models/m4a3_75_vvss_sherman_bravo_retexture_v2/model_manifest.json',
  'assets/generated/meshy/m4a3_75_vvss_sherman_tango_retexture_v2/glb.glb',
  'assets/generated/meshy/m4a3_75_vvss_sherman_tango_retexture_v2/fbx.fbx',
  'assets/generated/meshy/m4a3_75_vvss_sherman_tango_retexture_v2/manifest.json',
  'public/tftm/models/m4a3_75_vvss_sherman_tango_retexture_v2/m4a3_75_vvss_sherman_tango_retexture_v2.glb',
  'public/tftm/models/m4a3_75_vvss_sherman_tango_retexture_v2/model_manifest.json',
  'assets/generated/meshy/m4a3_75_vvss_sherman_delta_retexture_v2/glb.glb',
  'assets/generated/meshy/m4a3_75_vvss_sherman_delta_retexture_v2/fbx.fbx',
  'assets/generated/meshy/m4a3_75_vvss_sherman_delta_retexture_v2/manifest.json',
  'public/tftm/models/m4a3_75_vvss_sherman_delta_retexture_v2/m4a3_75_vvss_sherman_delta_retexture_v2.glb',
  'public/tftm/models/m4a3_75_vvss_sherman_delta_retexture_v2/model_manifest.json'
];
if (!smoke.includes(additions[0])) {
  smoke = smoke.replace(
    "  'public/tftm/models/m4a3_75_vvss_sherman_delta_retexture_v1/model_manifest.json',",
    `  'public/tftm/models/m4a3_75_vvss_sherman_delta_retexture_v1/model_manifest.json',\n${additions.map((entry) => `  '${entry}',`).join('\n')}`
  );
}
smoke = smoke.replace('tftm-commander-platoon-retexture-v1-20260704a', 'tftm-commander-platoon-retexture-v2-20260704a');
for (const id of Object.keys(variants)) {
  smoke = smoke.replaceAll(`m4a3_75_vvss_sherman_${id}_retexture_v1.glb`, `m4a3_75_vvss_sherman_${id}_retexture_v2.glb`);
}
smoke = smoke.replace(
  "const manifestPath = `public/tftm/models/m4a3_75_vvss_sherman_${variantId === 'alpha' ? 'alpha_retexture_v2' : variantId + '_retexture_v1'}/model_manifest.json`;",
  "const manifestPath = `public/tftm/models/m4a3_75_vvss_sherman_${variantId === 'alpha' ? 'alpha_retexture_v2' : variantId + '_retexture_v2'}/model_manifest.json`;"
);
smoke = smoke.replace(
  "  if (commanderManifest.inspection?.approximate_triangles !== 10216) {",
  "  if (variantId !== 'alpha' && !String(commanderManifest.repair_reason || '').includes('pseudo-font')) {\n    failures.push('Commander v2 manifest must preserve font-noise repair reason for ' + variantId);\n  }\n  if (commanderManifest.inspection?.approximate_triangles !== 10216) {"
);
writeFileSync('scripts/smoke.mjs', smoke);

let doctrine = readFileSync('docs/doctrine/sherman-hard-model-texture-architecture.md', 'utf8');
doctrine = doctrine.replace(
  'It remains pending human cloud visual review, not accepted.',
  'It is accepted-enough as the current Alpha baseline after human cloud visual review, while still not gameplay-animation-ready.'
);
if (!doctrine.includes('Commander Font-Noise Failure')) {
  doctrine += '\n## Commander Font-Noise Failure\n\nBravo/Tango/Delta v1 proved that Meshy Retexture should not be asked to write commander identity through letters, chalk notes, route marks, range math, road-sign text, or symbol piles. Human visual review read those variants as harsh pseudo-font texture rather than crew personality. The v2 route treats each tank individually: one recognition stripe, one restraint-focused wear language, no text burden. If readable letters are required later, author them through a controlled UV/decal texture pass rather than asking Meshy to improvise typography.\n';
}
writeFileSync('docs/doctrine/sherman-hard-model-texture-architecture.md', doctrine);

console.log('wired commander retexture v2 assets');
