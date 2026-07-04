import * as THREE from 'three';
import { SHERMAN_DEFAULT_OLIVE_ALBEDO_URL, SHERMAN_DEFAULT_TREAD_ALBEDO_URL } from './sherman-asset-links';

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
