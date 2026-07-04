import * as THREE from 'three';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';

type DecalProfileId = 'alpha';

type TankDecalOptions = {
  debug?: boolean;
};

type DecalSpec = {
  id: string;
  surfaceId: string;
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number, number];
  material: THREE.Material;
};

const DECAL_RENDER_ORDER = 9;

export function applyTankDecalProfile(tankRoot: THREE.Object3D, profileId: DecalProfileId, options: TankDecalOptions = {}) {
  if (profileId !== 'alpha') return { decalCount: 0, profileId };
  const group = new THREE.Group();
  group.name = 'runtime_decal_profile_alpha';
  const materials = createAlphaDecalMaterials();
  const specs: DecalSpec[] = [
    {
      id: 'alpha_crimson_glacis_field_paint',
      surfaceId: 'glacis',
      position: [1.18, 0.93, 0],
      rotation: [0, Math.PI * 0.5, 0],
      size: [0.62, 0.92, 0.28],
      material: materials.crimsonFieldPaint
    },
    {
      id: 'alpha_turret_crimson_field_paint',
      surfaceId: 'turret_shell',
      position: [-0.22, 1.47, 0.54],
      rotation: [0, 0, 0],
      size: [0.82, 0.28, 0.18],
      material: materials.crimsonFieldPaint
    },
    {
      id: 'alpha_hand_painted_a',
      surfaceId: 'turret_shell',
      position: [-0.08, 1.51, 0.58],
      rotation: [0, 0, 0],
      size: [0.34, 0.3, 0.16],
      material: materials.whiteA
    },
    {
      id: 'alpha_small_rear_accent',
      surfaceId: 'rear_hull',
      position: [-1.82, 0.94, 0],
      rotation: [0, -Math.PI * 0.5, 0],
      size: [0.36, 0.22, 0.18],
      material: materials.crimsonFaded
    }
  ];

  const meshes = collectDecalTargetMeshes(tankRoot);
  for (const spec of specs) {
    const position = new THREE.Vector3(...spec.position);
    const rotation = new THREE.Euler(...spec.rotation);
    const size = new THREE.Vector3(...spec.size);
    for (const target of meshes) {
      const geometry = new DecalGeometry(target, position, rotation, size);
      const count = geometry.getAttribute('position')?.count || 0;
      if (count === 0) continue;
      const decal = new THREE.Mesh(geometry, spec.material);
      decal.name = spec.id + '__' + target.name;
      decal.renderOrder = DECAL_RENDER_ORDER;
      decal.userData = {
        decalProfile: profileId,
        decalId: spec.id,
        surfaceId: spec.surfaceId,
        runtimeDecal: true
      };
      group.add(decal);
    }
    if (options.debug) {
      group.add(makeDebugMarker(spec));
    }
  }

  tankRoot.add(group);
  return { decalCount: group.children.length, profileId };
}

function collectDecalTargetMeshes(root: THREE.Object3D) {
  const meshes: THREE.Mesh[] = [];
  root.updateWorldMatrix(true, true);
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const name = object.name.toLowerCase();
    if (name.includes('tread') || name.includes('wheel') || name.includes('sprocket') || name.includes('idler')) return;
    if (name.includes('barrel') || name.includes('gun') || name.includes('mg') || name.includes('mantlet')) return;
    const attribute = mesh.geometry.getAttribute('position');
    if (!attribute || attribute.count < 3) return;
    meshes.push(mesh);
  });
  return meshes;
}

function createAlphaDecalMaterials() {
  return {
    crimsonFieldPaint: new THREE.MeshBasicMaterial({
      color: 0x66191d,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      side: THREE.DoubleSide
    }),
    crimsonFaded: new THREE.MeshBasicMaterial({
      color: 0x5a1a1b,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      side: THREE.DoubleSide
    }),
    whiteA: new THREE.MeshBasicMaterial({
      map: createLetterTexture('A'),
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -5,
      side: THREE.DoubleSide
    })
  };
}

function createLetterTexture(letter: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D canvas unavailable for runtime tank decal texture');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(224, 219, 197, 0.92)';
  context.font = 'bold 172px Georgia, serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.translate(128, 134);
  context.rotate(-0.08);
  context.fillText(letter, 0, 0);
  for (let i = 0; i < 18; i += 1) {
    context.fillStyle = 'rgba(72, 76, 50, 0.18)';
    context.fillRect(-88 + i * 11, -64 + (i % 5) * 19, 18, 6);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeDebugMarker(spec: DecalSpec) {
  const marker = new THREE.Mesh(
    new THREE.BoxGeometry(spec.size[0], spec.size[1], spec.size[2]),
    new THREE.MeshBasicMaterial({
      color: 0xffcc44,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      wireframe: true
    })
  );
  marker.name = 'runtime_decal_debug_marker__' + spec.id;
  marker.position.set(spec.position[0], spec.position[1], spec.position[2]);
  marker.rotation.set(spec.rotation[0], spec.rotation[1], spec.rotation[2]);
  marker.renderOrder = DECAL_RENDER_ORDER + 1;
  return marker;
}
