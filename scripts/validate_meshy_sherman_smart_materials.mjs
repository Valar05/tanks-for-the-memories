import { existsSync, readFileSync } from 'node:fs';

const style = 'meshy-sherman-runtime-smart-material-v3-pbr-edge-grime-metal';
const hullStyle = 'meshy-hybrid-hull-material-v1-baked-reference-masks';
const failures = [];
function fail(message) { failures.push(message); }
const files = [
  'src/authored-sherman-shared-materials.ts',
  'src/hybrid-hull-treads.ts',
  'src/turretfirst-turret.ts',
  'public/tftm/models/meshy_sherman_turret_kit_v2/model_manifest.json',
  'public/tftm/models/sherman_hybrid_meshy_hull_lowpoly_v1/model_manifest.json'
];
for (const file of files) if (!existsSync(file)) fail('missing ' + file);
if (!failures.length) {
  const materials = readFileSync(files[0], 'utf8');
  const hybrid = readFileSync(files[1], 'utf8');
  const turret = readFileSync(files[2], 'utf8');
  const turretManifest = JSON.parse(readFileSync(files[3], 'utf8'));
  const hullManifest = JSON.parse(readFileSync(files[4], 'utf8'));
  for (const marker of [
    'export function applyMeshyShermanSmartMaterial',
    'installMeshyDiffuseOverlayShader',
    'cloneMeshyMaterialForMesh',
    'sourceMaterial.clone()',
    'preservedPbrMaps',
    'normalMap: Boolean(material.normalMap)',
    'roughnessMap: Boolean(material.roughnessMap)',
    'metalnessMap: Boolean(material.metalnessMap)',
    'emissiveMap: Boolean(material.emissiveMap)',
    'uMeshyDiffuseReferenceStrength',
    'imported Meshy diffuse is used only as blurred luminance reference',
    'smart diffuse overlay replaces visible markings',
    'importedDiffuseReference = vec3(referenceShade)',
    'smartPaint *= mix(vec3(1.0), importedDiffuseReference * 1.16, uMeshyDiffuseReferenceStrength)',
    style,
    'gunSteel',
    'interiorVoid'
  ]) if (!materials.includes(marker)) fail('material helper missing marker ' + marker);
  for (const stale of [
    'export function getMeshyShermanSmartMaterial',
    'plasticReadFix',
    'roughness: 0.95',
    'metalness: 0.035',
    'triplanar object-space painted Sherman material'
  ]) if (materials.includes(stale)) fail('material helper still contains rejected marker ' + stale);
  for (const marker of [
    "applyMeshyShermanSmartMaterial(gltf.scene, 'hullArmor')",
    'tftm-hybrid-meshy-hull-authored-treads-v1-34-tread-pbr-v3-20260707',
    'embedded-meshy-reference-generated-hull-uv-material-v1',
    hullStyle,
    'materialDebugParam'
  ]) if (!hybrid.includes(marker)) fail('hybrid route missing marker ' + marker);
  for (const marker of [
    "applyMeshyShermanSmartMaterial(shell, 'turretArmor')",
    "applyMeshyShermanSmartMaterial(mantlet, 'mantletArmor')",
    "applyMeshyShermanSmartMaterial(barrel, 'gunSteel')",
    "applyMeshyShermanSmartMaterial(coax, 'gunSteel')",
    "applyMeshyShermanSmartMaterial(hatchSource, 'hatchArmor')",
    "applyMeshyShermanSmartMaterial(interior, 'interiorVoid')",
    style,
    'tftm-meshy-sherman-turret-kit-v2-pbr-edge-grime-metal-20260707',
    'imported-diffuse-reference-pbr-edge-grime-preserve-meshy-maps'
  ]) if (!turret.includes(marker)) fail('turret route missing marker ' + marker);
  if (turret.includes('blackInteriorMaterial') || turret.includes('forceBlack(interior)')) fail('turret route still uses old solid black material path');
  if (turretManifest.runtime_build !== 'tftm-meshy-sherman-turret-kit-v2-pbr-edge-grime-metal-20260707') fail('turret manifest build token mismatch');
  if (turretManifest.revision !== 'v2-meshy-kit-pbr-edge-grime-metal-20260707') fail('turret manifest revision mismatch');
  if (turretManifest.runtime_material_style?.style_id !== style) fail('turret manifest missing smart material style');
  if (!String(turretManifest.runtime_material_style?.projection || '').includes('imported Meshy PBR maps stay attached')) fail('turret manifest must preserve non-diffuse Meshy PBR maps');
  if (!String(turretManifest.runtime_material_style?.material_goal || '').includes('realistic matte painted Sherman turret kit')) fail('turret manifest must reject unwanted markings');
  if (hullManifest.runtime_build !== 'tftm-hybrid-meshy-hull-authored-treads-v1-34-tread-pbr-v3-20260707') fail('hull manifest build token mismatch');
  if (hullManifest.runtime_material_style?.style_id !== hullStyle) fail('hull manifest missing hull baked material style');
  if (!String(hullManifest.runtime_material_style?.projection || '').includes('generated hull maps are bound to the Meshy hull UVs')) fail('hull manifest must document UV-bound generated maps');
  if (!String(hullManifest.runtime_material_style?.material_goal || '').includes('hull-first red-build material repair')) fail('hull manifest must document red-build hull material repair');
  const roles = turretManifest.runtime_material_style?.roles || {};
  for (const [part, role] of Object.entries({ turret_shell: 'turretArmor', mantlet_socket: 'mantletArmor', barrel: 'gunSteel', coax: 'gunSteel', hatch: 'hatchArmor', black_interior: 'interiorVoid' })) {
    if (roles[part] !== role) fail('turret manifest role mismatch for ' + part);
  }
}
if (failures.length) {
  console.error('Meshy Sherman smart material smoke failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Meshy Sherman smart material smoke passed: hull uses UV-bound baked material v1 while turret kit keeps Meshy smart material roles.');
