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
/* Contact: a field of points moving like a carrier wave; the cursor drops a ripple in it. */

export const signalWave: SceneSetup = ({ scene, camera, renderer, pointer }) => {
  camera.position.set(0, 3.2, 12);
  camera.lookAt(0, -0.5, 0);
  const geometry = new THREE.PlaneGeometry(44, 18, 220, 90);
  geometry.rotateX(-Math.PI / 2);
  const uniforms = {
    uTime: { value: 0 },
    uPointer: { value: new THREE.Vector2() },
    uPixel: { value: renderer.getPixelRatio() },
    uMoss: { value: MOSS },
    uSignal: { value: SIGNAL },
  };
  scene.add(
    new THREE.Points(
      geometry,
      new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          uniform float uTime; uniform vec2 uPointer; uniform float uPixel;
          varying float vH; varying float vX; varying float vFade;
          void main() {
            vec3 p = position;
            float h = sin(p.x * 0.32 + uTime * 0.9) * 0.55 + sin(p.z * 0.55 - uTime * 0.6) * 0.35
                    + sin((p.x + p.z) * 0.9 + uTime * 1.6) * 0.08;
            float d = distance(p.xz, uPointer);
            h += exp(-d * d * 0.08) * sin(d * 2.2 - uTime * 4.0) * 0.7;
            p.y = h;
            vH = h; vX = p.x;
            vFade = smoothstep(9.0, 2.0, abs(p.z)) * smoothstep(22.0, 14.0, abs(p.x));
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = (1.0 + max(h, 0.0) * 1.6) * uPixel * (12.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uMoss; uniform vec3 uSignal;
          varying float vH; varying float vX; varying float vFade;
          void main() {
            float m = smoothstep(0.5, 0.05, length(gl_PointCoord - 0.5));
            vec3 col = mix(uMoss, uSignal, smoothstep(-12.0, 14.0, vX + vH * 4.0));
            gl_FragColor = vec4(col, m * vFade * (0.25 + clamp(vH, 0.0, 1.0) * 0.75));
          }`,
      }),
    ),
  );

  return {
    update(t) {
      uniforms.uTime.value = t;
      uniforms.uPointer.value.set(pointer.x * 16, -pointer.y * 6);
    },
  };
};
