import * as THREE from "three";
import type { SceneSetup } from "./three-canvas";
import { purePursuit, type Pose } from "./pure-pursuit";

// The desktop grade, after Fuji Eterna: green-grey shadows, bone highlights, one lichen signal. Same values as the .desk tokens in index.css.
export const MOSS = new THREE.Color("#65857a");
export const SIGNAL = new THREE.Color("#c5cf8a");
export const ICE = new THREE.Color("#e6e2d6");

/* ------------------------------------------------------------------ */
/* Hero: the AMR exploring a warehouse aisle with pure pursuit, weaving left and right past crates
   and building its map as it goes. The lookahead circle, goal point and steering arc are drawn. */

const RANGE = 9;
const LOOKAHEAD = 2;
// Crates in the aisle, 1.1 square, and the route that weaves past them (keep in sync with the
// pure pursuit self-check).
const CRATES = [[-9, -0.8], [-5, 0.8], [-1, -0.8], [3, 0.8], [7, -0.8]];
const ROUTE = new THREE.CatmullRomCurve3(
  [[-13.5, 0], [-11.5, 0.6], [-9, 2.3], [-7, 0], [-5, -2.3], [-3, 0], [-1, 2.3], [1, 0], [3, -2.3], [5, 0], [7, 2.3], [9.5, 0.4], [13, 0]].map(
    ([x, z]) => new THREE.Vector3(x, 0.03, z),
  ),
).getSpacedPoints(300);

export const lidarScene: SceneSetup = ({ scene, camera, renderer, pointer, reduceMotion }) => {
  const points: number[] = [];
  const rand: number[] = [];
  const push = (x: number, y: number, z: number) => {
    points.push(x, y, z);
    rand.push(Math.random());
  };

  // Racks, crates and walls: only their faces return light.
  const box = (cx: number, cz: number, w: number, d: number, h: number, density: number) => {
    const faces = [
      [cx - w / 2, cz, 0, d],
      [cx + w / 2, cz, 0, d],
      [cx, cz - d / 2, w, 0],
      [cx, cz + d / 2, w, 0],
    ];
    for (const [fx, fz, fw, fd] of faces) {
      const n = Math.floor((fw + fd) * h * density);
      for (let i = 0; i < n; i++) {
        const s = Math.random() - 0.5;
        push(fx + s * fw, Math.random() * h, fz + s * fd);
      }
    }
  };
  for (const x of [-10.5, -5.5, -0.5, 4.5, 9.5]) {
    box(x, -6, 3.6, 1.2, 2.2 + Math.random() * 1.2, 90);
    box(x, 6, 3.6, 1.2, 2.2 + Math.random() * 1.2, 90);
  }
  for (const [x, z] of CRATES) box(x, z, 1.1, 1.1, 1 + Math.random() * 0.4, 160);
  box(0, 0, 30, 16, 3, 14);

  const seen = new Float32Array(rand.length).fill(reduceMotion ? 1 : 0);
  const seenAttr = new THREE.BufferAttribute(seen, 1);
  const cloud = new THREE.BufferGeometry();
  cloud.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  cloud.setAttribute("aRand", new THREE.Float32BufferAttribute(rand, 1));
  cloud.setAttribute("aSeen", seenAttr);

  const uniforms = {
    uSweep: { value: 0 },
    uHeading: { value: 0 },
    uOrigin: { value: new THREE.Vector3() },
    uPixel: { value: renderer.getPixelRatio() },
    uMoss: { value: MOSS },
    uSignal: { value: SIGNAL },
  };
  const range = RANGE.toFixed(1);

  scene.add(
    new THREE.Points(
      cloud,
      new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          uniform float uSweep; uniform float uHeading; uniform vec3 uOrigin; uniform float uPixel;
          attribute float aRand; attribute float aSeen;
          varying float vGlow; varying float vAlpha;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vec3 d = position - uOrigin;
            // The beam turns with the robot, so its world angle is the sweep plus the heading.
            float since = mod(uSweep + uHeading - atan(d.z, d.x), 6.2831853);
            vGlow = exp(-since * 1.4) * smoothstep(${range}, ${range} - 2.5, length(d.xz));
            // Mapped points stay on, dimly; the beam lights up whatever it is hitting now.
            vAlpha = (aSeen * 0.32 + vGlow) * smoothstep(22.0, 8.0, length(position.xz));
            gl_PointSize = (1.6 + vGlow * 2.6 + aRand * 0.9) * uPixel * (18.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uMoss; uniform vec3 uSignal;
          varying float vGlow; varying float vAlpha;
          void main() {
            float m = smoothstep(0.5, 0.05, length(gl_PointCoord - 0.5));
            gl_FragColor = vec4(mix(uMoss, uSignal, vGlow), m * vAlpha);
          }`,
      }),
    ),
  );

  // The planned route, drawn on the floor.
  scene.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(ROUTE),
      new THREE.LineBasicMaterial({ color: MOSS, transparent: true, opacity: 0.6 }),
    ),
  );

  // The robot carries its LiDAR beam and range rings, and pure pursuit's lookahead circle.
  const robot = new THREE.Group();
  const placeholder = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.2, 0.45, 0.8).translate(0, 0.25, 0)),
    new THREE.LineBasicMaterial({ color: ICE }),
  );
  robot.add(placeholder);
  const floorGeo = new THREE.CircleGeometry(RANGE, 128);
  floorGeo.rotateX(-Math.PI / 2);
  robot.add(
    new THREE.Mesh(
      floorGeo,
      new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          varying vec3 vPos;
          void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uSweep; uniform vec3 uMoss; uniform vec3 uSignal;
          varying vec3 vPos;
          void main() {
            float r = length(vPos.xz);
            float d = mod(uSweep - atan(vPos.z, vPos.x), 6.2831853);
            float fade = smoothstep(${range}, 1.0, r);
            float beam = (exp(-d * 5.0) * 0.3 + exp(-d * 60.0) * 0.5) * fade;
            float ring = smoothstep(0.46, 0.5, abs(fract(r * 0.25) - 0.5)) * 0.12 * fade;
            gl_FragColor = vec4(uSignal * beam + uMoss * ring, beam + ring);
          }`,
      }),
    ),
  );
  robot.add(
    new THREE.Mesh(
      new THREE.RingGeometry(LOOKAHEAD - 0.025, LOOKAHEAD + 0.025, 128).rotateX(-Math.PI / 2).translate(0, 0.04, 0),
      new THREE.MeshBasicMaterial({ color: SIGNAL, transparent: true, opacity: 0.6, depthWrite: false }),
    ),
  );
  scene.add(robot);

  // The AMR model from the project page: a dark body with its edges drawn, so it reads against the points.
  let disposed = false;
  (async () => {
    const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
    const loaded = await new OBJLoader().loadAsync("/models/amr.obj");
    let source: THREE.Mesh | undefined;
    loaded.traverse((child) => {
      if (!source && (child as THREE.Mesh).isMesh) source = child as THREE.Mesh;
    });
    if (disposed || !source) return;
    // The export is Z-up in metres with X to the front; stand it up, rest it on the floor, size it to the scene.
    const geo = source.geometry;
    geo.rotateX(-Math.PI / 2);
    geo.computeBoundingBox();
    const bounds = geo.boundingBox!;
    const centre = bounds.getCenter(new THREE.Vector3());
    geo.translate(-centre.x, -bounds.min.y, -centre.z);
    const s = 1.2 / bounds.getSize(new THREE.Vector3()).x;
    geo.scale(s, s, s);
    geo.clearGroups();
    robot.remove(placeholder);
    placeholder.geometry.dispose();
    (placeholder.material as THREE.Material).dispose();
    robot.add(
      new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x0d110f, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })),
      new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), new THREE.LineBasicMaterial({ color: ICE, transparent: true, opacity: 0.9 })),
    );
  })().catch(() => {}); // If the model fails to load, the outline stays.

  // Pure pursuit's goal point and the arc the robot is steering along to reach it.
  const goalMark = new THREE.Mesh(
    new THREE.CircleGeometry(0.14, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: SIGNAL, depthWrite: false }),
  );
  scene.add(goalMark);
  const ARC = 32;
  const arcPos = new THREE.Float32BufferAttribute(new Float32Array((ARC + 1) * 3), 3);
  scene.add(
    new THREE.Line(
      new THREE.BufferGeometry().setAttribute("position", arcPos),
      new THREE.LineBasicMaterial({ color: SIGNAL, transparent: true, opacity: 0.8 }),
    ),
  );

  const start = (): Pose => ({ x: ROUTE[0].x, z: ROUTE[0].z, heading: 0 });
  let pose = start();
  let along = 0;
  let lastT = 0;
  let finishedAt = -1;
  let focus = pose.x;
  const mapRange2 = (RANGE - 1.5) ** 2;

  return {
    update(t) {
      const dt = Math.min(Math.max(t - lastT, 0), 0.05);
      lastT = t;

      // At the end of the aisle, hold a moment, then start a fresh exploration with an empty map.
      if (finishedAt >= 0 && t - finishedAt > 1.5) {
        pose = start();
        along = 0;
        finishedAt = -1;
        focus = pose.x;
        if (!reduceMotion) {
          seen.fill(0);
          seenAttr.needsUpdate = true;
        }
      }
      const step = purePursuit(pose, ROUTE, along, LOOKAHEAD, 1.6, finishedAt >= 0 ? 0 : dt);
      along = step.nearest;
      if (step.done && finishedAt < 0) finishedAt = t;

      robot.position.set(pose.x, 0, pose.z);
      robot.rotation.y = -pose.heading;
      const goal = ROUTE[step.goal];
      goalMark.position.set(goal.x, 0.05, goal.z);

      // The steering arc: tangent to the heading, curving by pure pursuit's curvature, ending at the goal.
      const k = step.curvature;
      const chord = Math.hypot(goal.x - pose.x, goal.z - pose.z);
      const length = Math.abs(k) < 1e-4 ? chord : (2 * Math.asin(Math.min(1, (chord * Math.abs(k)) / 2))) / Math.abs(k);
      const [c, sn] = [Math.cos(pose.heading), Math.sin(pose.heading)];
      for (let j = 0; j <= ARC; j++) {
        const s = (length * j) / ARC;
        const fwd = Math.abs(k) < 1e-4 ? s : Math.sin(k * s) / k;
        const left = Math.abs(k) < 1e-4 ? 0 : (1 - Math.cos(k * s)) / k;
        arcPos.setXYZ(j, pose.x + c * fwd - sn * left, 0.05, pose.z + sn * fwd + c * left);
      }
      arcPos.needsUpdate = true;

      uniforms.uSweep.value = t * 2.4 + 1.2;
      uniforms.uHeading.value = pose.heading;
      uniforms.uOrigin.value.set(pose.x, 0, pose.z);

      // Mapping: anything that has come within range stays on the map.
      let grew = false;
      for (let i = 0; i < seen.length; i++) {
        if (seen[i]) continue;
        const dx = points[i * 3] - pose.x;
        const dz = points[i * 3 + 2] - pose.z;
        if (dx * dx + dz * dz < mapRange2) {
          seen[i] = 1;
          grew = true;
        }
      }
      if (grew) seenAttr.needsUpdate = true;

      // The camera follows the robot down the aisle.
      focus += (pose.x - focus) * Math.min(1, dt * 2);
      const orbit = 0.45 + pointer.x * 0.25;
      const dist = 16;
      camera.position.set(focus + Math.sin(orbit) * dist, 9 + pointer.y * 1.2, Math.cos(orbit) * dist);
      // Looking past the robot puts it on the right, clear of the headline.
      const side = new THREE.Vector3(-Math.cos(orbit), 0, Math.sin(orbit)).multiplyScalar(5.5);
      camera.lookAt(focus + side.x, -0.8, side.z);
    },
    dispose() {
      disposed = true;
    },
  };
};

/* ------------------------------------------------------------------ */
/* Contact: a humanoid robot, head and shoulders, drawn in points: camera eyes whose pupils follow the cursor,
   a sensor bar, PCB traces on the cheeks, gears at the ears, cables down the neck, and a chassis with a board on
   the chest. Pointing at it opens it a little (plates lift off a lit core, the gears speed up); moving away puts
   it back together. Built here, no model to load, about 9k points. */

export const robotHead: SceneSetup = ({ scene, camera, renderer, pointer, reduceMotion }) => {
  camera.position.set(0, 0, 12);
  camera.lookAt(0, 0, 0);

  type V3 = [number, number, number];
  const shell = ICE.clone().multiplyScalar(0.62);
  const dim = ICE.clone().multiplyScalar(0.42);
  const trace = SIGNAL.clone().multiplyScalar(0.75);
  const r = (a: number) => (Math.random() * 2 - 1) * a;
  const PLATE = 0;
  const CORE = 1; // hidden when shut, lit when open
  const PUPIL = 2; // follows the cursor

  const uniforms = { uOpen: { value: 0 }, uPixel: { value: renderer.getPixelRatio() }, uLook: { value: new THREE.Vector2() } };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec3 aOffset; attribute vec3 aColor; attribute float aRand; attribute float aKind;
      uniform float uOpen; uniform float uPixel; uniform vec2 uLook;
      varying vec3 vColor; varying float vAlpha;
      void main() {
        float core = step(0.5, aKind) * step(aKind, 1.5);
        float pupil = step(1.5, aKind);
        // Each point leaves a little after the last. Plates only lift off part of their offset and points stray
        // just a little, so the robot stays readable while open.
        float o = smoothstep(aRand * 0.35, aRand * 0.35 + 0.65, uOpen);
        vec3 drift = (vec3(fract(aRand * 13.7), fract(aRand * 29.3), fract(aRand * 47.1)) - 0.5) * 0.05;
        vec3 p = position + vec3(uLook * pupil, 0.0) + (aOffset * 0.55 + drift) * o;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.8 + core * 1.5 * uOpen + pupil * 0.8) * uPixel * (12.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
        vColor = aColor;
        vAlpha = mix(0.9, 0.1 + 0.9 * uOpen, core);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor; varying float vAlpha;
      void main() {
        float m = smoothstep(0.5, 0.05, length(gl_PointCoord - 0.5));
        gl_FragColor = vec4(vColor, m * vAlpha);
      }`,
  });

  // A point buffer for one moving part: the robot itself, and each gear (they turn on their own axis).
  const part = () => {
    const pos: number[] = [];
    const off: number[] = [];
    const col: number[] = [];
    const rnd: number[] = [];
    const kind: number[] = [];
    const add = ([x, y, z]: V3, o: V3, c: THREE.Color, k = PLATE) => {
      pos.push(x, y, z);
      off.push(...o);
      col.push(c.r, c.g, c.b);
      rnd.push(Math.random());
      kind.push(k);
    };
    const line = (a: V3, b: V3, n: number, o: V3, c: THREE.Color) => {
      for (let i = 0; i <= n; i++) add([a[0] + (b[0] - a[0]) * (i / n), a[1] + (b[1] - a[1]) * (i / n), a[2] + (b[2] - a[2]) * (i / n)], o, c);
    };
    const ring = (n: number, at: (a: number) => V3, o: V3, c: THREE.Color, k = PLATE) => {
      for (let i = 0; i < n; i++) add(at((i / n) * Math.PI * 2), o, c, k);
    };
    const points = () => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("aOffset", new THREE.Float32BufferAttribute(off, 3));
      g.setAttribute("aColor", new THREE.Float32BufferAttribute(col, 3));
      g.setAttribute("aRand", new THREE.Float32BufferAttribute(rnd, 1));
      g.setAttribute("aKind", new THREE.Float32BufferAttribute(kind, 1));
      return new THREE.Points(g, material);
    };
    return { add, line, ring, points };
  };
  const body = part();
  const { add, line, ring } = body;

  // The skull: an egg that narrows towards the jaw. Half sizes in scene units.
  const [RX, RY, RZ] = [0.98, 1.22, 1.08];
  const taper = (y: number) => (y < 0 ? 1 - 0.28 * (-y / RY) : 1);
  const surface = (nx: number, ny: number, nz: number): V3 => [nx * RX * taper(ny * RY), ny * RY, nz * RZ * taper(ny * RY * 0.6)];
  const CAP: V3 = [0, 0.85, 0];
  const FACE: V3 = [0, 0, 0.6];
  const BACK: V3 = [0, 0, -0.5];
  const SIDE = (s: number): V3 => [s * 0.6, 0, 0];
  for (let i = 0; i < 4000; i++) {
    const n = new THREE.Vector3(r(1), r(1), r(1)).normalize();
    // Each point rides with the plate it sits on: cap on top, face in front, back, or one side.
    const o: V3 = n.y > 0.45 ? CAP : n.z > 0.35 ? FACE : n.z < -0.3 ? BACK : SIDE(Math.sign(n.x));
    add(surface(n.x, n.y, n.z), o, shell);
  }
  // Seams between the plates, a little brighter, so the head reads as built from parts.
  for (let i = 0; i < 220; i++) {
    const a = (i / 220) * Math.PI * 2;
    const n = new THREE.Vector3(Math.cos(a) * 0.89, 0.45, Math.sin(a) * 0.89);
    add(surface(n.x, n.y, n.z), CAP, ICE.clone().multiplyScalar(0.8));
  }

  // The face, on the front plate. `front` puts a point just proud of the skin at (x, y).
  const front = (x: number, y: number, lift = 0.03): V3 => {
    const k = 1 - (x / (RX * taper(y))) ** 2 - (y / RY) ** 2;
    return [x, y, Math.sqrt(Math.max(k, 0.02)) * RZ * taper(y * 0.6) + lift];
  };
  // Sensor bar across the forehead: a rail with five lit pads.
  for (let i = 0; i <= 50; i++) add(front(-0.5 + i * 0.02, 0.52), FACE, dim);
  for (let k = 0; k < 5; k++) ring(10, (a) => front(-0.36 + k * 0.18 + Math.cos(a) * 0.03, 0.52 + Math.sin(a) * 0.02, 0.04), FACE, SIGNAL);
  // Camera eyes: housing, lens, and an iris that moves inside the lens to follow the cursor.
  const EYE_Y = 0.12;
  for (const x of [-0.36, 0.36]) {
    ring(80, (a) => front(x + Math.cos(a) * 0.21, EYE_Y + Math.sin(a) * 0.19), [0, 0, 0.7], ICE);
    ring(56, (a) => front(x + Math.cos(a) * 0.14, EYE_Y + Math.sin(a) * 0.13, 0.05), [0, 0, 0.7], MOSS);
    ring(36, (a) => front(x + Math.cos(a) * 0.06, EYE_Y + Math.sin(a) * 0.06, 0.08), [0, 0, 0.75], SIGNAL, PUPIL);
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * 0.035;
      add(front(x + Math.cos(a) * d, EYE_Y + Math.sin(a) * d, 0.09), [0, 0, 0.75], SIGNAL, PUPIL);
    }
  }
  // Nose ridge, a speaker grille for a mouth, and the jaw line.
  for (let i = 0; i <= 18; i++) add(front(0, -0.08 - i * 0.02, 0.03 + Math.sin((i / 18) * Math.PI) * 0.06), FACE, ICE);
  for (let k = 0; k < 4; k++) for (let i = 0; i <= 22; i++) add(front(-0.24 + i * 0.022, -0.56 - k * 0.07), FACE, k % 2 ? dim : ICE);
  for (let i = 0; i <= 30; i++) add(front(-0.45 + i * 0.03, -1.02 + Math.abs(-0.45 + i * 0.03) * 0.25), FACE, MOSS);

  // PCB traces on each side plate: right-angle runs ending in vias. Given as (z, y) on the skull's side.
  const sideAt = (s: number, z: number, y: number): V3 => {
    const k = 1 - (y / RY) ** 2 - (z / (RZ * taper(y * 0.6))) ** 2;
    return [s * RX * taper(y) * Math.sqrt(Math.max(k, 0.04)) + s * 0.02, y, z];
  };
  const runs: [number, number][][] = [
    [[0.42, 0.45], [0.05, 0.45], [-0.15, 0.35], [-0.5, 0.35]],
    [[0.45, 0.2], [0.45, -0.25], [0.2, -0.45], [-0.2, -0.45]],
    [[-0.5, 0.15], [-0.5, -0.3], [-0.65, -0.42]],
    [[0.3, -0.6], [-0.35, -0.6]],
  ];
  for (const s of [-1, 1]) {
    for (const run of runs) {
      for (let j = 1; j < run.length; j++) {
        const [z0, y0] = run[j - 1];
        const [z1, y1] = run[j];
        const n = Math.ceil(Math.hypot(z1 - z0, y1 - y0) / 0.015);
        for (let i = 0; i <= n; i++) add(sideAt(s, z0 + ((z1 - z0) * i) / n, y0 + ((y1 - y0) * i) / n), SIDE(s), trace);
      }
      for (const [z, y] of [run[0], run[run.length - 1]]) ring(12, (a) => sideAt(s, z + Math.cos(a) * 0.035, y + Math.sin(a) * 0.035), SIDE(s), SIGNAL);
    }
    // Ear housing the gears sit in.
    ring(64, (a) => [s * (RX + 0.03), 0.02 + Math.cos(a) * 0.38, -0.05 + Math.sin(a) * 0.38], [s * 0.8, 0, 0], MOSS);
  }

  // Neck: segmented rings, a piston each side, and a cable bundle from the back of the head to the chassis.
  for (let k = 0; k < 6; k++) {
    const y = -1.15 - k * 0.15;
    const rr = 0.36 + (k % 2) * 0.05;
    ring(48, (a) => [Math.cos(a) * rr, y, -0.1 + Math.sin(a) * rr], [0, -0.3, 0], k % 2 ? MOSS : dim);
  }
  for (const s of [-1, 1]) {
    line([s * 0.32, -1.05, 0.12], [s * 0.5, -2.15, 0.15], 50, [0, -0.3, 0], ICE);
    line([s * 0.36, -1.05, 0.12], [s * 0.54, -2.15, 0.15], 50, [0, -0.3, 0], dim);
  }
  const cables: [V3[], THREE.Color][] = [
    [[[-0.35, -0.7, -0.75], [-0.55, -1.4, -0.7], [-0.75, -2.2, -0.35]], MOSS],
    [[[0, -0.8, -0.85], [0.05, -1.5, -0.7], [0.25, -2.2, -0.35]], SIGNAL],
    [[[0.35, -0.7, -0.75], [0.6, -1.4, -0.7], [0.75, -2.2, -0.35]], MOSS],
    [[[-1.05, -0.3, -0.05], [-1.25, -1.2, 0], [-1.35, -2.2, 0]], dim],
    [[[1.05, -0.3, -0.05], [1.25, -1.2, 0], [1.35, -2.2, 0]], dim],
  ];
  for (const [path, c] of cables) {
    const curve = new THREE.CatmullRomCurve3(path.map((v) => new THREE.Vector3(...v)));
    for (const v of curve.getPoints(110)) add([v.x + r(0.015), v.y, v.z + r(0.015)], [0, -0.2, -0.3], c);
  }

  // Chassis: a shoulder frame drawn by its edges, shoulder joints, a board on the chest with chips and traces, vents.
  const CH: V3 = [0, -0.35, 0];
  const [T, B, TW, BW, D] = [-2.25, -3.5, 1.35, 1.0, 0.5];
  const box: V3[] = [
    [-TW, T, D], [TW, T, D], [BW, B, D], [-BW, B, D],
    [-TW, T, -D], [TW, T, -D], [BW, B, -D], [-BW, B, -D],
  ];
  const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (const [a, b] of edges) line(box[a], box[b], 60, CH, a < 4 && b < 4 ? ICE : dim);
  for (let i = 0; i < 900; i++) {
    const v = Math.random();
    const w = TW + (BW - TW) * v;
    add([r(w), T + (B - T) * v, D * (Math.random() < 0.5 ? 1 : -1)], CH, ICE.clone().multiplyScalar(0.3));
  }
  for (const s of [-1, 1]) {
    ring(48, (a) => [s * (TW + 0.12), T - 0.15 + Math.cos(a) * 0.28, Math.sin(a) * 0.28], [s * 0.4, -0.35, 0], MOSS);
    ring(24, (a) => [s * (TW + 0.16), T - 0.15 + Math.cos(a) * 0.12, Math.sin(a) * 0.12], [s * 0.4, -0.35, 0], SIGNAL);
  }
  const PCB: V3 = [0, -0.35, 0.35];
  const z = D + 0.03;
  const rect = (x0: number, y0: number, x1: number, y1: number, c: THREE.Color) => {
    const nx = Math.ceil((x1 - x0) / 0.02);
    const ny = Math.ceil((y0 - y1) / 0.02);
    line([x0, y0, z], [x1, y0, z], nx, PCB, c);
    line([x1, y0, z], [x1, y1, z], ny, PCB, c);
    line([x1, y1, z], [x0, y1, z], nx, PCB, c);
    line([x0, y1, z], [x0, y0, z], ny, PCB, c);
  };
  rect(-0.72, -2.45, 0.72, -3.15, MOSS);
  rect(-0.5, -2.6, -0.1, -2.95, ICE);
  rect(0.15, -2.6, 0.45, -2.8, ICE);
  for (let k = 0; k < 5; k++) line([-0.1, -2.65 - k * 0.07, z], [0.15, -2.65 - k * 0.07, z], 12, PCB, trace);
  for (let k = 0; k < 4; k++) line([-0.45 + k * 0.1, -2.95, z], [-0.45 + k * 0.1, -3.1, z], 8, PCB, trace);
  line([0.3, -2.8, z], [0.3, -3.05, z], 12, PCB, trace);
  line([0.3, -3.05, z], [0.6, -3.05, z], 15, PCB, trace);
  for (const [x, y] of [[0.6, -3.05], [-0.65, -2.52], [0.65, -2.52]]) ring(12, (a) => [x + Math.cos(a) * 0.035, y + Math.sin(a) * 0.035, z], PCB, SIGNAL);
  for (let k = 0; k < 4; k++) line([-0.5, -3.27 - k * 0.055, D], [0.5, -3.27 - k * 0.055, D], 50, CH, dim);

  // The core: hidden by the plates when shut, lit when they open.
  for (let i = 0; i < 380; i++) {
    const v = new THREE.Vector3(r(1), r(1), r(1)).normalize().multiplyScalar(0.5 * Math.cbrt(Math.random()));
    add([v.x * 1.1, v.y + 0.25, v.z], [0, 0, 0], SIGNAL, CORE);
  }

  // Gears in each ear: a big one and a small one meshing below it, turning on the ear's axis.
  const gear = (R: number, teeth: number) => {
    const g = part();
    for (let i = 0; i < 220; i++) {
      const a = (i / 220) * Math.PI * 2;
      const tooth = ((a / (Math.PI * 2)) * teeth) % 1 < 0.5;
      const rr = R + (tooth ? 0.05 : 0);
      g.add([0, Math.cos(a) * rr, Math.sin(a) * rr], [0, 0, 0], MOSS);
    }
    g.ring(28, (a) => [0, Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3], [0, 0, 0], SIGNAL);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      g.line([0, Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3], [0, Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95], 14, [0, 0, 0], dim);
    }
    return g.points();
  };
  const robot = new THREE.Group();
  robot.add(body.points());
  const gears: { mesh: THREE.Points; speed: number }[] = [];
  for (const s of [-1, 1]) {
    const big = gear(0.26, 12);
    big.position.set(s * (RX + 0.07), 0.08, -0.02);
    const small = gear(0.13, 7);
    small.position.set(s * (RX + 0.05), -0.32, -0.3);
    robot.add(big, small);
    gears.push({ mesh: big, speed: 0.6 * s }, { mesh: small, speed: -1.1 * s });
  }
  scene.add(robot);

  const halfH = 12 * Math.tan(THREE.MathUtils.degToRad(20));
  const SIZE = 1.6;
  const look = new THREE.Vector2();
  let open = 0;
  let spin = 0;
  return {
    update(t, dt) {
      // Centred in its own canvas between the title and the buttons. The robot runs from the top of the skull
      // (y 1.3) to the bottom of the chassis (y -3.5), so it is raised by half of that to sit in the middle.
      const halfW = halfH * camera.aspect;
      robot.scale.setScalar(SIZE);
      robot.position.set(0, 1.1 * SIZE + Math.sin(t * 0.8) * 0.06, 0);
      // Where the cursor is, relative to the head (the robot's origin).
      const dx = pointer.x * halfW - robot.position.x;
      const dy = pointer.y * halfH - robot.position.y;
      // Open while the cursor is over the robot (a tap on touch screens), shut again when it leaves.
      const over = Math.abs(dx) < 1.5 * SIZE && dy < 1.5 * SIZE && dy > -3.6 * SIZE;
      const ease = (rate: number) => (reduceMotion ? 1 : 1 - Math.exp(-dt * rate));
      open += (Number(over) - open) * ease(5);
      uniforms.uOpen.value = open;
      // The pupils move inside the lens towards the cursor; the head turns a little too.
      look.set(THREE.MathUtils.clamp(dx / (2.5 * SIZE), -1, 1) * 0.07, THREE.MathUtils.clamp(dy / (2.5 * SIZE), -1, 1) * 0.06);
      uniforms.uLook.value.lerp(look, ease(8));
      robot.rotation.y += (THREE.MathUtils.clamp(dx * 0.04, -0.18, 0.18) - robot.rotation.y) * ease(3);
      robot.rotation.x += (0.06 - THREE.MathUtils.clamp(pointer.y, -1, 1) * 0.08 - robot.rotation.x) * ease(3);
      // Gears idle slowly and speed up while open; they stand still under reduced motion.
      if (!reduceMotion) spin += dt * (0.6 + open * 2.4);
      for (const g of gears) g.mesh.rotation.x = spin * g.speed;
    },
  };
};
