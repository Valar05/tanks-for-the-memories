declare module 'three' {
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
  }

  export class Object3D {
    constructor(...args: any[]);
    position: Vector3;
    rotation: Euler;
    scale: { setScalar(value: number): void };
    visible: boolean;
  }

  export class Group extends Object3D {
    constructor(...args: any[]);
    add(...objects: any[]): void;
  }

  export class Mesh extends Object3D {
    constructor(...args: any[]);
    add(...objects: any[]): void;
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

  export class WebGLRenderer {
    constructor(...args: any[]);
    domElement: HTMLCanvasElement;
    setPixelRatio(value: number): void;
    setSize(width: number, height: number): void;
    render(scene: Scene, camera: Camera): void;
  }

  export class PerspectiveCamera extends Object3D {
    constructor(...args: any[]);
    aspect: number;
    fov: number;
    updateProjectionMatrix(): void;
    lookAt(x: number, y: number, z: number): void;
  }

  export class OrthographicCamera extends Object3D {
    constructor(...args: any[]);
    updateProjectionMatrix(): void;
    lookAt(x: number, y: number, z: number): void;
  }

  export class MeshStandardMaterial {
    constructor(...args: any[]);
  }

  export class PlaneGeometry {
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
  }

  export type Camera = PerspectiveCamera | OrthographicCamera;
}
