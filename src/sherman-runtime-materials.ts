import * as THREE from 'three';
import { AUTHORED_SHERMAN_BOXMODEL_FACE_PLATES, AUTHORED_SHERMAN_BOXMODEL_TEXTURE_BASE_URL, AUTHORED_SHERMAN_RETOPO_FACE_PLATES, AUTHORED_SHERMAN_RETOPO_TEXTURE_BASE_URL, AUTHORED_SHERMAN_TEXTUREABLE_FACE_PLATES, AUTHORED_SHERMAN_TEXTUREABLE_TEXTURE_BASE_URL, SHERMAN_DEFAULT_OLIVE_ALBEDO_URL, SHERMAN_DEFAULT_TREAD_ALBEDO_URL } from './sherman-asset-links';

type MaterialTarget = 'olive' | 'tread';

const textureLoader = new THREE.TextureLoader();

function makeAlbedoTexture(url: string, repeatX: number, repeatY: number) {
  const texture = textureLoader.load(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 4;
  return texture;
}

function classifyMaterialTarget(mesh: THREE.Object3D, material: THREE.Material): MaterialTarget {
  const label = (mesh.name + ' ' + material.name).toLowerCase();
  if (/(tread|track|belt)/.test(label)) return 'tread';
  return 'olive';
}

function standardizeMaterial(source: THREE.Material, map: THREE.Texture, target: MaterialTarget) {
  const sourceStandard = source as THREE.MeshStandardMaterial;
  const material = new THREE.MeshStandardMaterial({
    name: (source.name || target) + '-linked-albedo',
    map,
    color: 0xffffff,
    roughness: Number.isFinite(sourceStandard.roughness) ? sourceStandard.roughness : target === 'tread' ? 0.82 : 0.9,
    metalness: Number.isFinite(sourceStandard.metalness) ? sourceStandard.metalness : target === 'tread' ? 0.08 : 0.03,
    side: source.side,
    transparent: source.transparent,
    opacity: source.opacity
  });
  material.depthWrite = source.depthWrite;
  material.depthTest = source.depthTest;
  material.needsUpdate = true;
  return material;
}

export function applyDefaultShermanTextureSet(root: THREE.Object3D) {
  const oliveAlbedo = makeAlbedoTexture(SHERMAN_DEFAULT_OLIVE_ALBEDO_URL, 1.15, 1.15);
  const treadAlbedo = makeAlbedoTexture(SHERMAN_DEFAULT_TREAD_ALBEDO_URL, 5.5, 1.0);
  let texturedMaterials = 0;
  let treadMaterials = 0;

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const nextMaterials = materials.map((material) => {
      const target = classifyMaterialTarget(mesh, material);
      if (target === 'tread') treadMaterials += 1;
      texturedMaterials += 1;
      return standardizeMaterial(material, target === 'tread' ? treadAlbedo : oliveAlbedo, target);
    });

    mesh.material = Array.isArray(mesh.material) ? nextMaterials : nextMaterials[0];
  });

  root.userData.defaultShermanTextureSet = {
    source: 'sherman_default_texture_set_v1',
    olive: SHERMAN_DEFAULT_OLIVE_ALBEDO_URL,
    tread: SHERMAN_DEFAULT_TREAD_ALBEDO_URL,
    texturedMaterials,
    treadMaterials
  };
}

function normalizeSurfaceId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
}

function surfaceIdForMesh(mesh: THREE.Object3D, material: THREE.Material, facePlateIds: readonly string[]) {
  const fromUserData = typeof mesh.userData?.surface_id === 'string' ? mesh.userData.surface_id : '';
  const source = fromUserData || material.name || mesh.name;
  const normalized = normalizeSurfaceId(source);
  const sortedPlateIds = [...facePlateIds].sort((a, b) => b.length - a.length);
  for (const plateId of sortedPlateIds) {
    if (normalized.includes(plateId)) return plateId;
  }
  return 'hull_left';
}

function applyAuthoredTexturePlates(root: THREE.Object3D, facePlateIds: readonly string[], baseUrl: string, sourceName: string) {
  const textureByPlate = new Map<string, THREE.Texture>();
  for (const plateId of facePlateIds) {
    textureByPlate.set(plateId, makeAlbedoTexture(baseUrl + plateId + '.png', 1, 1));
  }
  let texturedMaterials = 0;
  const usedPlateIds = new Set<string>();

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const nextMaterials = materials.map((sourceMaterial) => {
      const plateId = surfaceIdForMesh(mesh, sourceMaterial, facePlateIds);
      const map = textureByPlate.get(plateId) || textureByPlate.get('hull_left')!;
      usedPlateIds.add(plateId);
      texturedMaterials += 1;
      return standardizeMaterial(sourceMaterial, map, plateId.includes('track') ? 'tread' : 'olive');
    });
    mesh.material = Array.isArray(mesh.material) ? nextMaterials : nextMaterials[0];
  });

  root.userData.authoredTextureSet = {
    source: sourceName,
    base: baseUrl,
    texturedMaterials,
    usedPlateIds: Array.from(usedPlateIds).sort()
  };
}

export function applyAuthoredRetopoTexturePlates(root: THREE.Object3D) {
  applyAuthoredTexturePlates(root, AUTHORED_SHERMAN_RETOPO_FACE_PLATES, AUTHORED_SHERMAN_RETOPO_TEXTURE_BASE_URL, 'authored_sherman_retopo_v1');
  root.userData.authoredRetopoTextureSet = root.userData.authoredTextureSet;
}

export function applyAuthoredBoxmodelTexturePlates(root: THREE.Object3D) {
  applyAuthoredTexturePlates(root, AUTHORED_SHERMAN_BOXMODEL_FACE_PLATES, AUTHORED_SHERMAN_BOXMODEL_TEXTURE_BASE_URL, 'authored_sherman_boxmodel_v1');
  root.userData.authoredBoxmodelTextureSet = root.userData.authoredTextureSet;
}


export function applyAuthoredTextureableTexturePlates(root: THREE.Object3D) {
  applyAuthoredTexturePlates(root, AUTHORED_SHERMAN_TEXTUREABLE_FACE_PLATES, AUTHORED_SHERMAN_TEXTUREABLE_TEXTURE_BASE_URL, 'authored_sherman_textureable_v1');
  root.userData.authoredTextureableTextureSet = root.userData.authoredTextureSet;
}
