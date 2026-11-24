import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { AMR_PARTS } from "./amr-parts";

// Radians per second of idle spin. Negative turns the side facing the viewer towards the left.
const IDLE_SPEED = -0.35;
const KEY_STEP = Math.PI / 12;
// Seconds between the first and last part starting to move when the model assembles or comes apart.
const STAGGER = 0.6;

type Mode = "turntable" | "parts" | "expanded";

/**
 * A 3D model. Without `parts` it sits assembled on a turntable: drag or use the arrow keys to turn it.
 * With `parts` it is shown taken apart with each component named; pointing at it assembles it, moving away
 * takes it apart again. Clicking opens a large view that can be orbited and zoomed.
 * three.js is loaded only when a viewer mounts, so pages without a model do not pay for it.
 */
// shortcut: `parts` always uses the AMR layout in amr-parts.ts, give the layout its own prop once a second model needs one.
export default function ModelViewer({ src, label, parts = false }: { src: string; label: string; parts?: boolean }) {
  const [open, setOpen] = useState(false);
  if (!parts) return <ModelStage src={src} label={label} mode="turntable" />;

  return (
    <>
      <ModelStage src={src} label={label} mode="parts" onActivate={() => setOpen(true)} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="desk w-[94vw] max-w-6xl gap-0 rounded-none p-0 sm:rounded-none">
          <DialogTitle className="sr-only">{label}</DialogTitle>
          <DialogDescription className="sr-only">
            Point at the model to assemble it, move away to take it apart. Drag to orbit, scroll to zoom.
          </DialogDescription>
          {open && <ModelStage src={src} label={label} mode="expanded" />}
          <p className="border-t px-5 py-3 font-mono text-xs text-muted-foreground">
            Point at the robot to assemble it, move away to take it apart · drag to orbit · scroll to zoom. Motors,
            gearboxes, the board and the batteries are drawn in; the simulation model leaves them out.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ModelStage({ src, label, mode, onActivate }: { src: string; label: string; mode: Mode; onActivate?: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const activateRef = useRef(onActivate);
  activateRef.current = onActivate;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      const { toCreasedNormals } = await import("three/examples/jsm/utils/BufferGeometryUtils.js");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.85;
      renderer.shadowMap.enabled = true;
      renderer.domElement.setAttribute("aria-hidden", "true");
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.55;
      // Unmounting or failing mid-load must still free the GL context; the full cleanup below replaces this once loaded.
      const release = () => {
        pmrem.dispose();
        renderer.forceContextLoss();
        renderer.dispose();
        renderer.domElement.remove();
      };
      cleanup = release;

      const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
      const key = new THREE.DirectionalLight(0xffffff, 1.5);
      key.position.set(1.2, 5, 2);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.radius = 6;
      key.shadow.bias = -0.0005;
      scene.add(key);

      // Colours come from the exported material list; finish is chosen from the colour.
      // Without the .mtl the meshes keep the OBJ's own materials.
      const mtlText = await fetch(src.replace(/\.obj$/, ".mtl"))
        .then((r) => (r.ok ? r.text() : ""))
        .catch(() => "");
      const materials = new Map<string, InstanceType<typeof THREE.MeshStandardMaterial>>();
      let name = "";
      for (const line of mtlText.split("\n")) {
        const parts = line.trim().split(/\s+/);
        if (parts[0] === "newmtl") name = parts[1];
        if (parts[0] === "Kd") {
          const [r, g, b] = parts.slice(1).map(Number);
          const grey = Math.max(r, g, b) - Math.min(r, g, b) < 0.04;
          const metal = grey && r > 0.45;
          materials.set(
            name,
            new THREE.MeshStandardMaterial({
              color: new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace),
              metalness: metal ? 0.85 : 0,
              roughness: metal ? 0.35 : grey ? 0.6 : 0.42,
              // The export's faces do not all wind the same way; drawing both sides keeps walls solid.
              side: THREE.DoubleSide,
              shadowSide: THREE.DoubleSide,
            }),
          );
        }
      }

      let loaded: InstanceType<typeof THREE.Group>;
      try {
        loaded = await new OBJLoader().loadAsync(src);
      } catch {
        if (!disposed) setState("error");
        return;
      }
      if (disposed) return;

      // The export is one mesh with a material per part, Z-up in metres. Stand it up; `root` rests it on the floor.
      let source: InstanceType<typeof THREE.Mesh> | undefined;
      loaded.traverse((child) => {
        if (!source && (child as InstanceType<typeof THREE.Mesh>).isMesh) source = child as InstanceType<typeof THREE.Mesh>;
      });
      if (!source) {
        setState("error");
        return;
      }
      const geo = source.geometry;
      geo.rotateX(-Math.PI / 2);
      geo.computeBoundingBox();
      const box = geo.boundingBox!;
      const centre = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const turntable = new THREE.Group();
      const root = new THREE.Group();
      root.position.set(-centre.x, -box.min.y, -centre.z);
      turntable.add(root);
      scene.add(turntable);

      // One mesh per exported material.
      const sourceMaterials = Array.isArray(source.material) ? source.material : [source.material];
      const groups = geo.groups.length ? geo.groups : [{ start: 0, count: geo.attributes.position.count, materialIndex: 0 }];
      const pos = geo.attributes.position.array as Float32Array;
      const byMaterial = new Map<string, InstanceType<typeof THREE.Mesh>>();
      for (const group of groups) {
        const exported = sourceMaterials[group.materialIndex ?? 0];
        let piece = new THREE.BufferGeometry();
        piece.setAttribute("position", new THREE.BufferAttribute(pos.slice(group.start * 3, (group.start + group.count) * 3), 3));
        piece = toCreasedNormals(piece, Math.PI / 5); // smooth curved surfaces, keep hard edges hard
        byMaterial.set(exported.name, new THREE.Mesh(piece, materials.get(exported.name) ?? exported));
      }
      geo.dispose();

      // Components: each moves out by its own offset; the order follows height, so assembling builds from the floor up.
      const pieces: {
        holder: InstanceType<typeof THREE.Group>;
        offset: InstanceType<typeof THREE.Vector3>;
        anchor: InstanceType<typeof THREE.Vector3>;
        height: number;
        value: number;
        tag?: HTMLDivElement;
        tagWidth?: number;
        tagHeight?: number;
      }[] = [];
      const layout = mode === "turntable" ? [{ materials: Array.from(byMaterial.keys()), offset: [0, 0, 0] as [number, number, number] }] : AMR_PARTS;
      const used = new Set<string>();
      const labelLayer = document.createElement("div");
      labelLayer.className = "pointer-events-none absolute inset-0 overflow-hidden";
      labelLayer.setAttribute("aria-hidden", "true");
      host.appendChild(labelLayer);

      for (const part of layout) {
        const holder = new THREE.Group();
        for (const m of part.materials ?? []) {
          const mesh = byMaterial.get(m);
          if (!mesh) continue;
          holder.add(mesh);
          used.add(m);
        }
        if ("build" in part && part.build) holder.add(part.build(THREE));
        if (!holder.children.length) continue;
        holder.traverse((o) => {
          const mesh = o as InstanceType<typeof THREE.Mesh>;
          if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = true;
        });
        root.add(holder);
        turntable.updateMatrixWorld(true);
        const anchor = new THREE.Box3().setFromObject(holder).getCenter(new THREE.Vector3());
        root.worldToLocal(anchor);
        let tag: HTMLDivElement | undefined;
        if ("label" in part && part.label) {
          tag = document.createElement("div");
          tag.className = `absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap font-mono leading-tight ${
            mode === "expanded" ? "text-xs" : "text-[10px]"
          }`;
          tag.innerHTML = `<span class="size-1.5 shrink-0 rounded-full bg-signal"></span><span class="border-l border-signal/60 bg-background/70 px-1.5 py-0.5 text-foreground"></span>`;
          const text = tag.lastElementChild as HTMLSpanElement;
          text.textContent = part.label;
          if (part.detail) {
            const detail = document.createElement("span");
            detail.className = "block text-muted-foreground";
            detail.textContent = part.detail;
            text.appendChild(detail);
          }
          labelLayer.appendChild(tag);
        }
        pieces.push({
          holder,
          offset: new THREE.Vector3(...part.offset),
          anchor,
          height: anchor.y / size.y,
          value: mode === "turntable" ? 0 : 1.9,
          tag,
        });
      }
      // Anything the layout does not name stays where it is.
      byMaterial.forEach((mesh, m) => {
        if (!used.has(m)) root.add(mesh);
      });

      // Frame the taken-apart robot, so pieces never leave the picture while it turns.
      for (const p of pieces) p.holder.position.copy(p.offset);
      const frameBox = new THREE.Box3().setFromObject(turntable);
      for (const p of pieces) p.holder.position.set(0, 0, 0);
      const frameSize = frameBox.getSize(new THREE.Vector3());
      const reach = Math.max(
        Math.abs(frameBox.min.x),
        Math.abs(frameBox.max.x),
        Math.abs(frameBox.min.z),
        Math.abs(frameBox.max.z),
      );
      const radius = mode === "turntable" ? Math.max(frameSize.x, frameSize.z) * 0.9 : reach * 1.05;

      const floor = new THREE.Mesh(new THREE.CircleGeometry(radius * 1.8, 64), new THREE.ShadowMaterial({ opacity: 0.22 }));
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);
      key.shadow.camera.left = key.shadow.camera.bottom = -radius * 2;
      key.shadow.camera.right = key.shadow.camera.top = radius * 2;
      key.shadow.camera.updateProjectionMatrix();

      const lookY = frameSize.y * 0.46;
      const controls = mode === "expanded" ? new OrbitControls(camera, renderer.domElement) : null;
      let framed = false;
      // Frame the whole model from slightly above, whatever the box's proportions.
      const fit = () => {
        const { clientWidth: w, clientHeight: h } = host;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        if (controls && framed) return; // keep the viewer's own orbit and zoom
        const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
        const needed = Math.max(frameSize.y / 2 / Math.tan(halfFov), radius / Math.tan(halfFov) / camera.aspect);
        const distance = needed * 1.08;
        camera.position.set(0, frameSize.y * 0.5 + distance * 0.3, distance);
        camera.lookAt(0, lookY, 0);
        if (controls) {
          controls.target.set(0, lookY, 0);
          controls.minDistance = distance * 0.35;
          controls.maxDistance = distance * 2;
          controls.update();
        }
        framed = true;
      };
      fit();
      const resize = new ResizeObserver(fit);
      resize.observe(host);

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let resume = 0;
      if (controls) {
        controls.enableDamping = true;
        controls.enablePan = false;
        controls.maxPolarAngle = Math.PI * 0.49; // stay above the floor
        controls.autoRotate = !reduceMotion;
        controls.autoRotateSpeed = 0.8;
        controls.addEventListener("start", () => {
          controls.autoRotate = false;
          clearTimeout(resume);
        });
        controls.addEventListener("end", () => {
          resume = window.setTimeout(() => (controls.autoRotate = !reduceMotion), 3000);
        });
      }

      // Pointing at the viewer assembles the robot. Touch has no hover, so a tap in the large view toggles instead;
      // the keyboard toggles with Enter or Space there too.
      let pointing = false;
      let toggled = false;
      turntable.rotation.y = mode === "expanded" ? 0 : -0.6;
      let dragging = false;
      let lastX = 0;
      let pressAt = { x: 0, y: 0 };
      let idleAfter = 0;
      const pause = () => (idleAfter = performance.now() + 2500);

      const enter = (e: PointerEvent) => {
        if (e.pointerType !== "touch") pointing = true;
      };
      const leave = () => (pointing = false);
      const down = (e: PointerEvent) => {
        pressAt = { x: e.clientX, y: e.clientY };
        if (controls) return;
        dragging = true;
        lastX = e.clientX;
        host.setPointerCapture(e.pointerId);
      };
      const move = (e: PointerEvent) => {
        if (!dragging) return;
        turntable.rotation.y += ((e.clientX - lastX) / host.clientWidth) * Math.PI * 1.5;
        lastX = e.clientX;
        pause();
      };
      const up = (e: PointerEvent) => {
        const tap = Math.hypot(e.clientX - pressAt.x, e.clientY - pressAt.y) < 6;
        if (tap && mode === "parts") activateRef.current?.();
        if (tap && mode === "expanded" && e.pointerType === "touch") toggled = !toggled;
        dragging = false;
        pause();
      };
      const cancel = () => (dragging = false);
      const keydown = (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          if (mode === "parts") activateRef.current?.();
          else if (mode === "expanded") toggled = !toggled;
          else return;
          e.preventDefault();
          return;
        }
        if (controls || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
        e.preventDefault();
        turntable.rotation.y += e.key === "ArrowLeft" ? -KEY_STEP : KEY_STEP;
        pause();
      };
      host.addEventListener("pointerenter", enter);
      host.addEventListener("pointerleave", leave);
      host.addEventListener("pointerdown", down);
      host.addEventListener("pointermove", move);
      host.addEventListener("pointerup", up);
      host.addEventListener("pointercancel", cancel);
      host.addEventListener("keydown", keydown);

      let visible = true;
      const watch = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
      watch.observe(host);

      let target = -1;
      let changedAt = 0;
      let frame = 0;
      let last = performance.now();
      const projected = new THREE.Vector3();
      const tick = (now: number) => {
        frame = requestAnimationFrame(tick);
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        if (!visible) return;

        const want = mode === "turntable" || pointing || toggled ? 0 : 1;
        if (want !== target) {
          target = want;
          changedAt = now;
        }
        const t = now / 1000;
        const { clientWidth: w, clientHeight: h } = host;
        pieces.forEach((p, i) => {
          const order = target === 0 ? p.height : 1 - p.height;
          if (reduceMotion) p.value = target;
          else if ((now - changedAt) / 1000 > order * STAGGER) p.value += (target - p.value) * (1 - Math.exp(-dt * 6));
          const apart = Math.min(p.value, 1);
          p.holder.position.copy(p.offset).multiplyScalar(p.value);
          if (!reduceMotion) p.holder.position.y += Math.sin(t * 1.4 + i * 1.7) * size.y * 0.006 * apart;
        });

        if (controls) controls.update();
        else if (!reduceMotion && !dragging && now > idleAfter) turntable.rotation.y += IDLE_SPEED * dt;
        turntable.updateMatrixWorld();

        // Labels follow their piece on screen and fade out as the robot closes up.
        const placed: { tag: HTMLDivElement; left: number; y: number; h: number; right: boolean }[] = [];
        for (const p of pieces) {
          if (!p.tag) continue;
          projected.copy(p.anchor).add(p.holder.position);
          root.localToWorld(projected).project(camera);
          const x = (projected.x * 0.5 + 0.5) * w;
          const y = (-projected.y * 0.5 + 0.5) * h;
          const right = x >= w / 2;
          p.tag.style.flexDirection = right ? "row" : "row-reverse";
          // Keep the whole label inside the panel; its text never changes, so its size is read once.
          const tw = (p.tagWidth ||= p.tag.offsetWidth);
          const left = right ? Math.min(x - 3, w - tw - 4) : Math.max(x + 3, tw + 4) - tw;
          const opacity = Math.max(0, Math.min(1, (Math.min(p.value, 1) - 0.55) / 0.4));
          p.tag.style.opacity = String(opacity);
          placed.push({ tag: p.tag, left, y, h: (p.tagHeight ||= p.tag.offsetHeight), right });
        }
        // Labels on the same side never stack on each other: each is pushed below the one above it.
        for (const side of [true, false]) {
          const column = placed.filter((l) => l.right === side).sort((a, b) => a.y - b.y);
          column.forEach((l, i) => {
            if (i) l.y = Math.max(l.y, column[i - 1].y + (column[i - 1].h + l.h) / 2 + 2);
          });
        }
        for (const l of placed) l.tag.style.transform = `translate(${l.left}px, ${l.y}px) translateY(-50%)`;
        renderer.render(scene, camera);
      };
      frame = requestAnimationFrame(tick);
      setState("ready");

      cleanup = () => {
        cancelAnimationFrame(frame);
        clearTimeout(resume);
        resize.disconnect();
        watch.disconnect();
        controls?.dispose();
        host.removeEventListener("pointerenter", enter);
        host.removeEventListener("pointerleave", leave);
        host.removeEventListener("pointerdown", down);
        host.removeEventListener("pointermove", move);
        host.removeEventListener("pointerup", up);
        host.removeEventListener("pointercancel", cancel);
        host.removeEventListener("keydown", keydown);
        labelLayer.remove();
        scene.traverse((o) => {
          const mesh = o as InstanceType<typeof THREE.Mesh>;
          mesh.geometry?.dispose();
          if (mesh.isMesh && !Array.isArray(mesh.material)) mesh.material.dispose();
        });
        materials.forEach((m) => m.dispose());
        release();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [src, mode]);

  const hint =
    mode === "turntable"
      ? "Drag or use the left and right arrow keys to turn it."
      : mode === "parts"
        ? "Shown taken apart with each component named; point at it to assemble it. Press Enter or click to open a large view."
        : "Point at it to assemble it, or press Enter. Drag to orbit, scroll to zoom.";

  return (
    <div
      ref={hostRef}
      role={mode === "parts" ? "button" : "img"}
      aria-label={`${label}. ${hint}`}
      tabIndex={0}
      className={`relative w-full select-none [&>canvas]:absolute [&>canvas]:inset-0 [&>canvas]:size-full ${
        mode === "expanded"
          ? "h-[78vh] cursor-grab touch-none bg-card active:cursor-grabbing"
          : `aspect-[4/5] touch-pan-y border bg-card ${mode === "parts" ? "cursor-zoom-in" : "cursor-grab active:cursor-grabbing"}`
      }`}
    >
      {state !== "ready" && (
        <p
          className={`absolute inset-0 flex items-center justify-center font-mono text-xs text-muted-foreground ${
            state === "loading" ? "animate-pulse bg-primary/5 motion-reduce:animate-none" : ""
          }`}
        >
          {state === "loading" ? "Loading 3D model…" : "The 3D model could not be loaded."}
        </p>
      )}
      {state === "ready" && mode === "parts" && (
        <span className="pointer-events-none absolute bottom-3 left-3 border bg-background/70 px-2 py-1 font-mono text-xs text-muted-foreground backdrop-blur">
          Point to assemble · click to enlarge
        </span>
      )}
    </div>
  );
}
