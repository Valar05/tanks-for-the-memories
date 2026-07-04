declare module 'three' {

  export class Clock {
    constructor(...args: any[]);
    getElapsedTime(): number;
  }

  export class Vector3 {
    constructor(...args: any[]);
    x: number;
    y: number;
    z: number;
    clone(): Vector3;
    copy(v: Vector3): this;
    set(x: number, y: number, z: number): this;
    distanceTo(v: Vector3): number;
    sub(v: Vector3): this;
    add(v: Vector3): this;
    multiplyScalar(value: number): this;
    addScaledVector(v: Vector3, s: number): this;
    normalize(): this;
    length(): number;
    lerp(v: Vector3, alpha: number): this;
    project(camera: Camera): this;
  }

  export class Euler {
    x: number;
    y: number;
    z: number;
    set(x: number, y: number, z: number): this;
  }

  export class Object3D {
    constructor(...args: any[]);
    name: string;
    position: Vector3;
    rotation: Euler;
    scale: { x: number; y: number; z: number; set(x: number, y: number, z: number): void; setScalar(value: number): void; multiplyScalar(value: number): void };
    visible: boolean;
    matrix: any;
    frustumCulled: boolean;
    castShadow: boolean;
    receiveShadow: boolean;
    children: Object3D[];
    userData: any;
    renderOrder: number;
    traverse(callback: (object: Object3D) => void): void;
    updateMatrix(): void;
    updateWorldMatrix(updateParents?: boolean, updateChildren?: boolean): void;
    clone(recursive?: boolean): this;
    getObjectByName(name: string): Object3D | undefined;
  }

  export class Group extends Object3D {
    constructor(...args: any[]);
    add(...objects: any[]): void;
  }

  export class Mesh extends Object3D {
    constructor(...args: any[]);
    material: any;
    geometry: BufferGeometry;
    matrixWorld: any;
    isMesh: boolean;
    add(...objects: any[]): void;
  }

  export class InstancedMesh extends Mesh {
    constructor(geometry: BufferGeometry, material: any, count: number);
    instanceMatrix: { needsUpdate: boolean };
    setMatrixAt(index: number, matrix: any): void;
  }

  export class Scene extends Object3D {
    constructor(...args: any[]);
    background: any;
    fog: any;
    add(...objects: any[]): void;
  }

  export class Color {
    constructor(...args: any[]);
    offsetHSL(h: number, s: number, l: number): void;
    getHex(): number;
  }

  export class Fog {
    constructor(color: any, near: number, far: number);
  }

  export class Box3 {
    constructor(...args: any[]);
    min: Vector3;
    max: Vector3;
    setFromObject(object: Object3D): this;
    getSize(target: Vector3): Vector3;
    getCenter(target: Vector3): Vector3;
  }

  export class WebGLRenderer {
    constructor(...args: any[]);
    domElement: HTMLCanvasElement;
    setPixelRatio(value: number): void;
    getPixelRatio(): number;
    outputColorSpace: any;
    toneMapping: any;
    toneMappingExposure: number;
    shadowMap: { enabled: boolean; type: any };
    setSize(width: number, height: number, updateStyle?: boolean): void;
    setClearColor(color: any, alpha?: number): void;
    render(scene: Scene, camera: Camera): void;
  }

  export class PerspectiveCamera extends Object3D {
    constructor(...args: any[]);
    aspect: number;
    fov: number;
    updateProjectionMatrix(): void;
    lookAt(x: number | Vector3, y?: number, z?: number): void;
  }

  export class OrthographicCamera extends Object3D {
    constructor(...args: any[]);
    updateProjectionMatrix(): void;
    lookAt(x: number, y: number, z: number): void;
  }

  export class MeshStandardMaterial {
    constructor(...args: any[]);
    roughness: number;
    metalness: number;
    map: any;
    roughnessMap: any;
    metalnessMap: any;
    normalMap: any;
    clone(): MeshStandardMaterial;
  }

  export class BufferGeometry {
    constructor(...args: any[]);
    setAttribute(name: string, attribute: BufferAttribute): this;
    setIndex(index: number[] | any): this;
    computeVertexNormals(): void;
    clone(): BufferGeometry;
    applyMatrix4(matrix: any): this;
    center(): this;
    getIndex(): { count: number } | null;
    getAttribute(name: string): { count: number };
  }

  export class BufferAttribute {
    constructor(array: any, itemSize: number);
  }

  export type Texture = any;

  export class PlaneGeometry {
    constructor(...args: any[]);
  }

  export class GridHelper extends Object3D {
    constructor(...args: any[]);
  }

  export class BoxGeometry {
    constructor(width: number, height: number, depth: number);
  }

  export class CylinderGeometry {
    constructor(...args: any[]);
  }

  export class ConeGeometry {
    constructor(...args: any[]);
  }

  export class AmbientLight extends Object3D {
    constructor(...args: any[]);
  }

  export class DirectionalLight extends Object3D {
    constructor(...args: any[]);
    shadow: { mapSize: { set(width: number, height: number): void } };
  }

  export class MeshBasicMaterial {
    constructor(...args: any[]);
    clone(): MeshBasicMaterial;
  }

  export class HemisphereLight {
    constructor(...args: any[]);
  }

  export class IcosahedronGeometry {
    constructor(...args: any[]);
  }

  export class CanvasTexture {
    constructor(...args: any[]);
    clone(): CanvasTexture;
    colorSpace: any;
    wrapS: any;
    wrapT: any;
    repeat: { set(x: number, y: number): void };
    offset: { x: number; y: number; set(x: number, y: number): void };
  }

  export const SRGBColorSpace: any;
  export const ACESFilmicToneMapping: any;
  export const NoColorSpace: any;
  export const PCFSoftShadowMap: any;
  export const DoubleSide: any;
  export const RepeatWrapping: any;
  export const MathUtils: { clamp(value: number, min: number, max: number): number; smoothstep(value: number, min: number, max: number): number; radToDeg(value: number): number };

  export type Material = any;
  export type Camera = PerspectiveCamera | OrthographicCamera;
}


declare module 'three/examples/jsm/loaders/GLTFLoader.js' {
  export class GLTFLoader {
    constructor(...args: any[]);
    load(url: string, onLoad: (gltf: any) => void, onProgress?: (event: ProgressEvent) => void, onError?: (error: unknown) => void): void;
    loadAsync(url: string): Promise<any>;
  }
}

declare module 'three/examples/jsm/geometries/DecalGeometry.js' {
  import { BufferGeometry, Euler, Mesh, Vector3 } from 'three';
  export class DecalGeometry extends BufferGeometry {
    constructor(mesh: Mesh, position: Vector3, orientation: Euler, size: Vector3);
  }
}


declare module 'three/examples/jsm/utils/SkeletonUtils.js' {
  import { Object3D } from 'three';
  export const SkeletonUtils: { clone<T extends Object3D>(source: T): T };
}
