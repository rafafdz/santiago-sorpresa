import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  coffeeTexture,
  notebookTexture,
  plasterTexture,
  softDotTexture,
  tokenTexture,
  wallTexture,
  woodTexture,
} from './textures';
import { maxPixelRatio } from './webgl';

import type { HotspotId } from './sceneProps';
export type { HotspotId };

interface Options {
  onTap: (id: HotspotId) => void;
  /** The GPU dropped our context (common on Android under memory pressure). */
  onContextLost: () => void;
  reducedMotion: boolean;
}

const isMobile = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(pointer: coarse)').matches || Math.min(window.innerWidth, window.innerHeight) < 600);

const ICE = new THREE.Color('#7cc4f0');
const TARGET = new THREE.Vector3(-0.15, 0.7, -0.45);

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/**
 * The whole 3D diorama, built procedurally from primitives.
 * React owns game state; this class only renders and reports taps.
 */
export class EscapeScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.05, 50);
  private controls: OrbitControls;
  private timer = new THREE.Timer();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private hotspotMeshes: THREE.Object3D[] = [];
  private anchors: Record<HotspotId, THREE.Vector3> = {
    bag: new THREE.Vector3(-1.1, 0.55, 0.45),
    wall: new THREE.Vector3(-1.1, 2.25, -1.7),
    safe: new THREE.Vector3(0.35, 1.12, -0.15),
  };
  private pins: Partial<Record<HotspotId, HTMLElement | null>> = {};
  private highlights: Partial<Record<HotspotId, THREE.Mesh>> = {};
  private focus: HotspotId | null = 'bag';
  private door!: THREE.Group;
  private dialMesh!: THREE.Object3D;
  private handle!: THREE.Object3D;
  private envelope!: THREE.Group;
  private innerLight!: THREE.PointLight;
  private token!: THREE.Group;
  private dust!: THREE.Points;
  private doorAnim: { t: number; from: number; to: number } | null = null;
  private doorOpen = 0;
  private tokenAnim = -1;
  private disposed = false;
  private down: { x: number; y: number; t: number } | null = null;
  private resizeObs: ResizeObserver;
  private disposables: { dispose: () => void }[] = [];

  constructor(private canvas: HTMLCanvasElement, private opts: Options) {
    const mobile = isMobile();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'default' });
    this.renderer.setPixelRatio(maxPixelRatio(mobile, window.devicePixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene.background = new THREE.Color('#0b111c');
    this.scene.fog = new THREE.Fog('#0b111c', 6, 13);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = envRT.texture;
    this.scene.environmentIntensity = 0.35;
    pmrem.dispose();
    this.disposables.push(envRT);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.copy(TARGET);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minAzimuthAngle = -0.85;
    this.controls.maxAzimuthAngle = 0.85;
    this.controls.minPolarAngle = 0.55;
    this.controls.maxPolarAngle = 1.42;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.6;

    this.build();
    this.fitCamera(true);

    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('webglcontextlost', this.onLost);
    this.resizeObs = new ResizeObserver(() => this.fitCamera(false));
    this.resizeObs.observe(canvas.parentElement ?? canvas);
    this.renderer.setAnimationLoop(this.tick);
  }

  // ---------------------------------------------------------------- public API

  setPins(pins: Partial<Record<HotspotId, HTMLElement | null>>) {
    this.pins = pins;
  }

  setFocus(id: HotspotId | null) {
    this.focus = id;
  }

  setTokenRevealed(revealed: boolean) {
    if (revealed && !this.token.visible) {
      this.token.visible = true;
      this.tokenAnim = this.opts.reducedMotion ? 1 : 0;
    } else if (!revealed) {
      this.token.visible = false;
      this.tokenAnim = -1;
    }
  }

  setSafeOpen(open: boolean) {
    const to = open ? 1 : 0;
    if (this.opts.reducedMotion || !open) {
      this.doorOpen = to;
      this.doorAnim = null;
      this.applyDoor();
    } else if (this.doorOpen !== to) {
      this.doorAnim = { t: 0, from: this.doorOpen, to };
    }
  }

  resetView() {
    this.fitCamera(true);
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.resizeObs.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.controls.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.disposables.forEach((d) => d.dispose());
    this.renderer.dispose();
  }

  // ---------------------------------------------------------------- input

  private onLost = (e: Event) => {
    e.preventDefault();
    this.renderer.setAnimationLoop(null);
    this.opts.onContextLost();
  };

  private onDown = (e: PointerEvent) => {
    this.down = { x: e.clientX, y: e.clientY, t: performance.now() };
  };

  private onUp = (e: PointerEvent) => {
    const d = this.down;
    this.down = null;
    if (!d || this.disposed) return;
    const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
    if (moved > 10 || performance.now() - d.t > 600) return;
    const id = this.pick(e);
    if (id) this.opts.onTap(id);
  };

  private onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || this.down) return;
    this.canvas.style.cursor = this.pick(e) ? 'pointer' : 'grab';
  };

  private pick(e: PointerEvent): HotspotId | null {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.hotspotMeshes, true)[0];
    let o: THREE.Object3D | null = hit?.object ?? null;
    while (o) {
      if (o.userData.hotspot) return o.userData.hotspot as HotspotId;
      o = o.parent;
    }
    return null;
  }

  // ---------------------------------------------------------------- layout

  private fitCamera(resetPosition: boolean) {
    const parent = this.canvas.parentElement;
    const w = parent?.clientWidth || window.innerWidth;
    const h = parent?.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 0.8 ? 50 : 40;
    this.camera.updateProjectionMatrix();

    // Distance that keeps the table (~3.5m wide) and the wall (~2.2m tall) in frame.
    // Portrait screens crop the table edges a little and look down more steeply.
    const portrait = aspect < 0.8;
    const vfov = THREE.MathUtils.degToRad(this.camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const dist = Math.max((portrait ? 1.72 : 1.9) / Math.tan(hfov / 2), 2.05 / Math.tan(vfov / 2));
    this.controls.minDistance = dist * 0.55;
    this.controls.maxDistance = dist * 1.15;

    if (resetPosition) {
      // On tall screens the HUD covers the top, so aim a little higher to push the room down.
      this.controls.target.copy(TARGET);
      if (portrait) this.controls.target.y += 0.4;
      const dir = new THREE.Vector3(0.16, portrait ? 0.62 : 0.4, 1).normalize();
      this.camera.position.copy(this.controls.target).addScaledVector(dir, dist);
    } else {
      const dir = this.camera.position.clone().sub(this.controls.target);
      const len = THREE.MathUtils.clamp(dir.length(), this.controls.minDistance, this.controls.maxDistance);
      this.camera.position.copy(this.controls.target).addScaledVector(dir.normalize(), len);
    }
    this.controls.update();
  }

  // ---------------------------------------------------------------- frame

  private tick = () => {
    if (this.disposed) return;
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.05);
    const t = this.timer.getElapsed();
    const rm = this.opts.reducedMotion;

    // highlights
    (Object.keys(this.highlights) as HotspotId[]).forEach((id) => {
      const m = this.highlights[id]!;
      const mat = m.material as THREE.MeshBasicMaterial;
      const on = this.focus === id;
      const pulse = rm ? 0.7 : 0.55 + 0.45 * Math.sin(t * 3);
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, on ? 0.55 * pulse + 0.15 : 0.06, 0.1);
      if (m.userData.pulseScale && !rm) {
        const s = on ? 1 + 0.06 * Math.sin(t * 3) : 1;
        m.scale.setScalar(s);
      }
    });

    // door animation
    if (this.doorAnim) {
      this.doorAnim.t = Math.min(1, this.doorAnim.t + dt / 2.2);
      const k = easeInOut(this.doorAnim.t);
      this.doorOpen = this.doorAnim.from + (this.doorAnim.to - this.doorAnim.from) * k;
      this.applyDoor();
      if (this.doorAnim.t >= 1) this.doorAnim = null;
    }
    if (this.doorOpen > 0.99 && !rm) this.envelope.rotation.y = Math.sin(t * 1.2) * 0.08;

    // token pop
    if (this.tokenAnim >= 0 && this.tokenAnim < 1) {
      this.tokenAnim = Math.min(1, this.tokenAnim + dt / 0.9);
      const k = easeInOut(this.tokenAnim);
      this.token.position.y = 0.012 + Math.sin(k * Math.PI) * 0.35;
      this.token.rotation.z = k * Math.PI * 4;
    } else if (this.tokenAnim >= 1) {
      this.token.position.y = 0.012;
      this.token.rotation.z = 0;
    }

    // floating dust in the lamp beam
    if (!rm) {
      const pos = this.dust.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + dt * 0.03;
        if (y > 2.4) y = 0.1;
        pos.setY(i, y);
        pos.setX(i, pos.getX(i) + Math.sin(t * 0.3 + i) * dt * 0.01);
      }
      pos.needsUpdate = true;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.updatePins();
  };

  private applyDoor() {
    const k = this.doorOpen;
    this.door.rotation.y = -k * 2.35;
    this.handle.rotation.z = Math.min(1, k * 3) * -Math.PI / 2;
    this.dialMesh.rotation.z = k * Math.PI * 2;
    this.innerLight.intensity = k * 2.2;
    this.envelope.position.y = 0.22 + Math.max(0, k - 0.5) * 0.16;
  }

  private tmp = new THREE.Vector3();
  private updatePins() {
    const rect = this.canvas.getBoundingClientRect();
    (Object.keys(this.anchors) as HotspotId[]).forEach((id) => {
      const el = this.pins[id];
      if (!el) return;
      this.tmp.copy(this.anchors[id]).project(this.camera);
      const visible = this.tmp.z < 1 && Math.abs(this.tmp.x) < 1.1 && Math.abs(this.tmp.y) < 1.1;
      const x = (this.tmp.x * 0.5 + 0.5) * rect.width;
      const y = (-this.tmp.y * 0.5 + 0.5) * rect.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
      el.style.opacity = visible ? '' : '0';
    });
  }

  // ---------------------------------------------------------------- building

  private tag(o: THREE.Object3D, id: HotspotId) {
    o.userData.hotspot = id;
    this.hotspotMeshes.push(o);
  }

  private build() {
    const s = this.scene;
    const tex = (t: THREE.Texture) => {
      this.disposables.push(t);
      return t;
    };

    // ---- lights
    s.add(new THREE.HemisphereLight('#6d86b8', '#140d08', 0.55));
    const lamp = new THREE.SpotLight('#ffd9a0', 38, 7, 0.78, 0.55, 1.6);
    lamp.position.set(0.05, 2.75, 0.35);
    lamp.target.position.set(-0.15, 0, -0.1);
    lamp.castShadow = true;
    lamp.shadow.mapSize.setScalar(isMobile() ? 512 : 1024);
    lamp.shadow.bias = -0.0005;
    lamp.shadow.radius = 4;
    s.add(lamp, lamp.target);
    const rim = new THREE.DirectionalLight('#7cc4f0', 0.9);
    rim.position.set(-3, 3, -2.5);
    s.add(rim);
    const fill = new THREE.PointLight('#ffb070', 1.2, 5, 2);
    fill.position.set(1.8, 1.2, 1.6);
    s.add(fill);

    // ---- room
    const plaster = tex(plasterTexture());
    const wallMat = new THREE.MeshStandardMaterial({ color: '#27324a', map: plaster, roughness: 0.95 });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), wallMat);
    backWall.position.set(0, 1.6, -1.8);
    backWall.receiveShadow = true;
    s.add(backWall);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshStandardMaterial({ color: '#10151f', roughness: 0.9 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.95;
    floor.receiveShadow = true;
    s.add(floor);

    // ---- table
    const wood = tex(woodTexture());
    const woodMat = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.62, metalness: 0.05 });
    const top = new THREE.Mesh(new RoundedBoxGeometry(3.5, 0.09, 2.1, 3, 0.03), woodMat);
    top.position.set(-0.1, -0.045, -0.25);
    top.receiveShadow = true;
    top.castShadow = true;
    s.add(top);
    const legGeo = new THREE.BoxGeometry(0.1, 0.9, 0.1);
    [
      [-1.7, -1.2],
      [1.5, -1.2],
      [-1.7, 0.7],
      [1.5, 0.7],
    ].forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(x, -0.5, z);
      s.add(leg);
    });

    this.buildSafe();
    this.buildBag();
    this.buildWall();
    this.buildLamp();
    this.buildRope();
    this.buildProps();
    this.buildDust();
  }

  private highlightRing(id: HotspotId, radius: number, pos: THREE.Vector3) {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.86, radius, 64),
      new THREE.MeshBasicMaterial({
        color: ICE,
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.copy(pos);
    m.userData.pulseScale = true;
    this.scene.add(m);
    this.highlights[id] = m;
  }

  private buildSafe() {
    const brass = new THREE.MeshStandardMaterial({ color: '#b8864e', metalness: 0.95, roughness: 0.32 });
    const copper = new THREE.MeshStandardMaterial({ color: '#a8603a', metalness: 0.9, roughness: 0.38 });
    const dark = new THREE.MeshStandardMaterial({ color: '#1a1512', roughness: 0.8, metalness: 0.2 });
    const cream = new THREE.MeshStandardMaterial({ color: '#f3e6cc', roughness: 0.5 });
    const red = new THREE.MeshStandardMaterial({ color: '#e2483d', roughness: 0.4, emissive: '#5a0f0a' });

    const W = 0.95,
      H = 0.95,
      D = 0.8,
      T = 0.07;
    const safe = new THREE.Group();
    safe.position.set(0.35, 0.04, -0.15);
    this.scene.add(safe);
    this.tag(safe, 'safe');

    const panel = (w: number, h: number, d: number, x: number, y: number, z: number, mat = brass) => {
      const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.02), mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      safe.add(m);
      return m;
    };
    panel(W, H, T, 0, H / 2, -D / 2 + T / 2); // back
    panel(T, H, D, -W / 2 + T / 2, H / 2, 0); // left
    panel(T, H, D, W / 2 - T / 2, H / 2, 0); // right
    panel(W, T, D, 0, H - T / 2, 0); // top
    panel(W, T, D, 0, T / 2, 0); // bottom
    // interior lining
    const lining = new THREE.Mesh(
      new THREE.BoxGeometry(W - 2 * T, H - 2 * T, D - T),
      new THREE.MeshStandardMaterial({ color: '#2a1d2c', roughness: 1, side: THREE.BackSide }),
    );
    lining.position.set(0, H / 2, T / 2);
    safe.add(lining);
    // reinforcement bands
    [0.2, 0.75].forEach((y) => panel(W + 0.02, 0.05, D + 0.02, 0, y, -0.01, copper));
    // feet
    const footGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.05, 16);
    [
      [-0.38, -0.3],
      [0.38, -0.3],
      [-0.38, 0.3],
      [0.38, 0.3],
    ].forEach(([x, z]) => {
      const f = new THREE.Mesh(footGeo, dark);
      f.position.set(x, -0.015, z);
      safe.add(f);
    });

    // door, hinged on the left front edge
    this.door = new THREE.Group();
    this.door.position.set(-W / 2, 0, D / 2);
    safe.add(this.door);
    const doorSlab = new THREE.Mesh(new RoundedBoxGeometry(W, H, T, 3, 0.025), brass);
    doorSlab.position.set(W / 2, H / 2, T / 2);
    doorSlab.castShadow = true;
    this.door.add(doorSlab);
    const inset = new THREE.Mesh(new RoundedBoxGeometry(W - 0.16, H - 0.16, 0.02, 2, 0.01), copper);
    inset.position.set(W / 2, H / 2, T + 0.005);
    this.door.add(inset);
    // hinges
    [0.2, 0.75].forEach((y) => {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 16), dark);
      h.position.set(-0.005, y, T / 2);
      this.door.add(h);
    });
    // dial
    const dial = new THREE.Group();
    dial.position.set(W * 0.42, H * 0.55, T + 0.02);
    this.door.add(dial);
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.022, 16, 64), brass);
    dial.add(bezel);
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.03, 64), dark);
    face.rotation.x = Math.PI / 2;
    dial.add(face);
    const knob = new THREE.Group();
    const knobBody = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.05, 32), brass);
    knobBody.rotation.x = Math.PI / 2;
    knobBody.position.z = 0.03;
    knob.add(knobBody);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.008, i === 0 ? 0.04 : 0.025, 0.004), cream);
      tick.position.set(Math.sin(a) * 0.135, Math.cos(a) * 0.135, 0.018);
      tick.rotation.z = -a;
      knob.add(tick);
    }
    dial.add(knob);
    this.dialMesh = knob;
    const indicator = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.035, 3), red);
    indicator.position.set(0, 0.205, 0.01);
    indicator.rotation.z = Math.PI;
    dial.add(indicator);
    // 3-spoke handle
    const handle = new THREE.Group();
    handle.position.set(W * 0.78, H * 0.42, T + 0.03);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 20), brass);
    hub.rotation.x = Math.PI / 2;
    handle.add(hub);
    for (let i = 0; i < 3; i++) {
      const spoke = new THREE.Group();
      spoke.rotation.z = (i / 3) * Math.PI * 2;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 10), brass);
      rod.position.y = 0.06;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.02, 14, 14), copper);
      ball.position.y = 0.12;
      spoke.add(rod, ball);
      handle.add(spoke);
    }
    this.door.add(handle);
    this.handle = handle;
    // monogram plate
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.07, 0.01), cream);
    plate.position.set(W * 0.42, H * 0.2, T + 0.012);
    this.door.add(plate);
    const plateText = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.05), this.labelMaterial('S · L'));
    plateText.position.set(W * 0.42, H * 0.2, T + 0.018);
    this.door.add(plateText);

    // inside: warm light + invitation envelope
    this.innerLight = new THREE.PointLight('#ffd79a', 0, 1.6, 2);
    this.innerLight.position.set(0, H * 0.55, 0.1);
    safe.add(this.innerLight);
    this.envelope = new THREE.Group();
    const env = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.3, 0.015), cream);
    const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 24), red);
    seal.rotation.x = Math.PI / 2;
    seal.position.z = 0.012;
    this.envelope.add(env, seal);
    this.envelope.position.set(0, 0.22, -0.05);
    this.envelope.rotation.x = -0.15;
    safe.add(this.envelope);

    this.highlightRing('safe', 0.78, new THREE.Vector3(0.35, 0.004, -0.15));
  }

  private labelMaterial(text: string) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 56;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#2a1d10';
    ctx.font = '700 36px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 30);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    this.disposables.push(t);
    return new THREE.MeshBasicMaterial({ map: t, transparent: true });
  }

  private buildBag() {
    const bag = new THREE.Group();
    bag.position.set(-1.1, 0, 0.45);
    this.scene.add(bag);
    this.tag(bag, 'bag');
    const profile = [
      [0.0, 0],
      [0.15, 0.0],
      [0.19, 0.04],
      [0.2, 0.16],
      [0.19, 0.3],
      [0.17, 0.36],
      [0.175, 0.38],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const fabric = new THREE.MeshStandardMaterial({ color: '#2f6f8f', roughness: 0.95, side: THREE.DoubleSide });
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 40), fabric);
    body.castShadow = true;
    body.receiveShadow = true;
    bag.add(body);
    const rimMat = new THREE.MeshStandardMaterial({ color: '#f3e6cc', roughness: 1 });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.022, 12, 40), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.38;
    bag.add(rim);
    // chalk inside
    const chalk = new THREE.Mesh(
      new THREE.CircleGeometry(0.16, 32),
      new THREE.MeshStandardMaterial({ color: '#f7f4ee', roughness: 1 }),
    );
    chalk.rotation.x = -Math.PI / 2;
    chalk.position.y = 0.33;
    bag.add(chalk);
    // drawstring + toggle
    const cord = new THREE.Mesh(
      new THREE.TorusGeometry(0.19, 0.008, 8, 40),
      new THREE.MeshStandardMaterial({ color: '#e2483d', roughness: 0.7 }),
    );
    cord.rotation.x = Math.PI / 2;
    cord.position.y = 0.345;
    bag.add(cord);
    const toggle = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.018, 0.04, 4, 10),
      new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.5 }),
    );
    toggle.position.set(0.05, 0.3, 0.2);
    bag.add(toggle);
    // brush loop
    const brush = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.22, 10),
      new THREE.MeshStandardMaterial({ color: '#c89d62', roughness: 0.6 }),
    );
    brush.position.set(-0.19, 0.2, 0.06);
    brush.rotation.z = 0.12;
    bag.add(brush);
    // mountain token (hidden until found)
    this.token = new THREE.Group();
    const tokenMats = [
      new THREE.MeshStandardMaterial({ color: '#b8864e', metalness: 0.9, roughness: 0.35 }),
      new THREE.MeshStandardMaterial({ map: this.trackTex(tokenTexture()), metalness: 0.6, roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: '#b8864e', metalness: 0.9, roughness: 0.35 }),
    ];
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.018, 48), tokenMats);
    coin.castShadow = true;
    this.token.add(coin);
    this.token.position.set(-0.68, 0.012, 0.62);
    this.token.visible = false;
    this.scene.add(this.token);
    this.tag(this.token, 'bag');

    this.highlightRing('bag', 0.34, new THREE.Vector3(-1.1, 0.004, 0.45));
  }

  private trackTex<T extends THREE.Texture>(t: T): T {
    this.disposables.push(t);
    return t;
  }

  private buildWall() {
    const board = new THREE.Group();
    board.position.set(-1.1, 1.38, -1.74);
    this.scene.add(board);
    this.tag(board, 'wall');
    const w = 1.1,
      h = 1.54;
    const frameMat = new THREE.MeshStandardMaterial({ color: '#3a2a1c', roughness: 0.7 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.05), frameMat);
    frame.castShadow = true;
    board.add(frame);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: this.trackTex(wallTexture()), roughness: 0.8 }),
    );
    face.position.z = 0.027;
    board.add(face);
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(w + 0.34, h + 0.34),
      new THREE.MeshBasicMaterial({
        color: ICE,
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        map: this.trackTex(softDotTexture()),
      }),
    );
    glow.position.z = -0.03;
    board.add(glow);
    this.highlights.wall = glow;
    // bolt anchor where the rope starts
    const anchor = new THREE.Mesh(
      new THREE.TorusGeometry(0.035, 0.01, 10, 24),
      new THREE.MeshStandardMaterial({ color: '#c9ced6', metalness: 1, roughness: 0.25 }),
    );
    anchor.position.set(0.5, 0.72, 0.05);
    board.add(anchor);
  }

  private buildLamp() {
    const g = new THREE.Group();
    g.position.set(0.05, 2.85, 0.35);
    this.scene.add(g);
    const cord = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 1.5, 6),
      new THREE.MeshStandardMaterial({ color: '#111' }),
    );
    cord.position.y = 0.8;
    g.add(cord);
    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.26, 0.2, 32, 1, true),
      new THREE.MeshStandardMaterial({ color: '#b8864e', metalness: 0.9, roughness: 0.35, side: THREE.DoubleSide }),
    );
    g.add(shade);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 20, 20),
      new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffd79a', emissiveIntensity: 3 }),
    );
    bulb.position.y = -0.08;
    g.add(bulb);
  }

  private buildRope() {
    // A climbing rope from the wall's anchor down across the table to the safe's handle:
    // a literal path from the clue to the lock.
    const pts = [
      [-0.6, 2.1, -1.68],
      [-0.52, 1.4, -1.66],
      [-0.42, 0.55, -1.45],
      [-0.4, 0.03, -1.05],
      [-0.45, 0.025, -0.3],
      [-0.25, 0.025, 0.35],
      [0.2, 0.025, 0.52],
      [0.55, 0.06, 0.42],
      [0.66, 0.3, 0.33],
      [0.7, 0.44, 0.32],
    ].map(([x, y, z]) => new THREE.Vector3(x, y, z));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const rope = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 160, 0.014, 8, false),
      new THREE.MeshStandardMaterial({ color: '#5fb4e8', roughness: 0.55, emissive: '#0b2c44', emissiveIntensity: 0.6 }),
    );
    rope.castShadow = true;
    this.scene.add(rope);
    const carabiner = new THREE.Mesh(
      new THREE.TorusGeometry(0.045, 0.008, 10, 28),
      new THREE.MeshStandardMaterial({ color: '#d7dde6', metalness: 1, roughness: 0.2 }),
    );
    carabiner.scale.set(0.7, 1, 1);
    carabiner.position.set(0.7, 0.44, 0.32);
    carabiner.rotation.y = 0.4;
    this.scene.add(carabiner);

    // chalk dust trail from the bag toward the wall
    const dot = this.trackTex(softDotTexture());
    const chalkMat = new THREE.MeshBasicMaterial({ map: dot, transparent: true, opacity: 0.5, depthWrite: false });
    const trail = [
      [-0.95, 0.12],
      [-0.85, -0.12],
      [-0.9, -0.38],
      [-0.78, -0.62],
      [-0.86, -0.88],
      [-0.74, -1.1],
    ];
    trail.forEach(([x, z], i) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.1 + (i % 2) * 0.03, 0.14), chalkMat);
      p.rotation.x = -Math.PI / 2;
      p.rotation.z = i * 0.7;
      p.position.set(x, 0.003, z);
      this.scene.add(p);
    });
  }

  private buildProps() {
    // bag of Brazilian coffee (gift from the team in Brazil)
    const coffee = new THREE.Mesh(
      new RoundedBoxGeometry(0.26, 0.34, 0.12, 2, 0.03),
      [
        new THREE.MeshStandardMaterial({ color: '#1f5a3a', roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ color: '#1f5a3a', roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ color: '#1f5a3a', roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ color: '#1f5a3a', roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ map: this.trackTex(coffeeTexture()), roughness: 0.6 }),
        new THREE.MeshStandardMaterial({ color: '#1f5a3a', roughness: 0.7 }),
      ],
    );
    coffee.position.set(1.3, 0.17, 0.35);
    coffee.rotation.y = -0.45;
    coffee.castShadow = true;
    this.scene.add(coffee);

    const note = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.012, 0.52),
      new THREE.MeshStandardMaterial({ map: this.trackTex(notebookTexture()), roughness: 0.9 }),
    );
    note.position.set(1.28, 0.008, -0.45);
    note.rotation.y = 0.25;
    note.castShadow = true;
    note.receiveShadow = true;
    this.scene.add(note);
    const pencil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.4, 6),
      new THREE.MeshStandardMaterial({ color: '#e0a526', roughness: 0.6 }),
    );
    pencil.rotation.z = Math.PI / 2;
    pencil.rotation.y = 0.9;
    pencil.position.set(1.0, 0.012, -0.05);
    this.scene.add(pencil);

    // mug
    const mug = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.075, 0.18, 24),
      new THREE.MeshStandardMaterial({ color: '#e9dcc3', roughness: 0.4 }),
    );
    mug.position.set(-1.5, 0.09, -1.0);
    mug.castShadow = true;
    this.scene.add(mug);
    const mugHandle = new THREE.Mesh(
      new THREE.TorusGeometry(0.05, 0.012, 8, 20, Math.PI),
      mug.material as THREE.Material,
    );
    mugHandle.position.set(-1.58, 0.09, -1.0);
    mugHandle.rotation.z = Math.PI / 2;
    this.scene.add(mugHandle);
  }

  private buildDust() {
    const n = 90;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = Math.sqrt(Math.random()) * 0.9;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r - 0.1;
      pos[i * 3 + 1] = 0.1 + Math.random() * 2.3;
      pos[i * 3 + 2] = Math.sin(a) * r - 0.1;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.018,
        map: this.trackTex(softDotTexture()),
        color: '#ffe6bf',
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.scene.add(this.dust);
  }
}
