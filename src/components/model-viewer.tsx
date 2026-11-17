import { useEffect, useRef, useState } from "react";

// Radians per second of idle spin. Negative turns the side facing the viewer towards the left.
const IDLE_SPEED = -0.35;
const KEY_STEP = Math.PI / 12;

/**
 * A 3D model on a turntable: drag or use the arrow keys to turn it left and right,
 * and it turns slowly by itself while nobody is touching it.
 * three.js is loaded only when the viewer mounts, so pages without a model do not pay for it.
 */
export default function ModelViewer({ src, label }: { src: string; label: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

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
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.85;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.setAttribute("aria-hidden", "true");
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.55;

      const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
      const key = new THREE.DirectionalLight(0xffffff, 1.5);
      key.position.set(1.2, 5, 2);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.radius = 6;
      key.shadow.bias = -0.0005;
      scene.add(key);

      // Colours come from the exported material list; finish is chosen from the colour.
      const mtlText = await (await fetch(src.replace(/\.obj$/, ".mtl"))).text();
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

      let model: InstanceType<typeof THREE.Group>;
      try {
        model = await new OBJLoader().loadAsync(src);
      } catch {
        if (!disposed) setState("error");
        return;
      }
      if (disposed) return;

      model.traverse((child) => {
        const mesh = child as InstanceType<typeof THREE.Mesh>;
        if (!mesh.isMesh) return;
        // Smooth curved surfaces, keep hard edges hard.
        mesh.geometry = toCreasedNormals(mesh.geometry, Math.PI / 5);
        // The export is one mesh with a material per part, so the mesh carries a list.
        const finish = (m: InstanceType<typeof THREE.Material>) => materials.get(m.name) ?? m;
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(finish) : finish(mesh.material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      });

      // The model is exported Z-up in metres; stand it up, centre it on the turntable and rest it on the floor.
      model.rotation.x = -Math.PI / 2;
      const turntable = new THREE.Group();
      turntable.add(model);
      const box = new THREE.Box3().setFromObject(turntable);
      const centre = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      model.position.set(-centre.x, -box.min.y, -centre.z);
      scene.add(turntable);

      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(Math.max(size.x, size.z) * 1.6, 64),
        new THREE.ShadowMaterial({ opacity: 0.22 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      const radius = Math.max(size.x, size.z) * 0.9;
      key.shadow.camera.left = key.shadow.camera.bottom = -radius * 2;
      key.shadow.camera.right = key.shadow.camera.top = radius * 2;
      key.shadow.camera.updateProjectionMatrix();

      // Frame the whole model from slightly above, whatever the box's proportions.
      const fit = () => {
        const { clientWidth: w, clientHeight: h } = host;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
        const needed = Math.max(size.y / 2 / Math.tan(halfFov), radius / Math.tan(halfFov) / camera.aspect);
        const distance = needed * 1.08;
        camera.position.set(0, size.y * 0.5 + distance * 0.3, distance);
        camera.lookAt(0, size.y * 0.46, 0);
        camera.updateProjectionMatrix();
      };
      fit();
      const resize = new ResizeObserver(fit);
      resize.observe(host);

      // Turning: horizontal drag and arrow keys only, so the page still scrolls vertically.
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      turntable.rotation.y = -0.6;
      let dragging = false;
      let lastX = 0;
      let idleAfter = 0;
      const pause = () => (idleAfter = performance.now() + 2500);

      const down = (e: PointerEvent) => {
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
      const up = () => {
        dragging = false;
        pause();
      };
      const keydown = (e: KeyboardEvent) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        turntable.rotation.y += e.key === "ArrowLeft" ? -KEY_STEP : KEY_STEP;
        pause();
      };
      host.addEventListener("pointerdown", down);
      host.addEventListener("pointermove", move);
      host.addEventListener("pointerup", up);
      host.addEventListener("pointercancel", up);
      host.addEventListener("keydown", keydown);

      let visible = true;
      const watch = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
      watch.observe(host);

      let frame = 0;
      let last = performance.now();
      const tick = (now: number) => {
        frame = requestAnimationFrame(tick);
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        if (!visible) return;
        if (!reduceMotion && !dragging && now > idleAfter) turntable.rotation.y += IDLE_SPEED * dt;
        renderer.render(scene, camera);
      };
      frame = requestAnimationFrame(tick);
      setState("ready");

      cleanup = () => {
        cancelAnimationFrame(frame);
        resize.disconnect();
        watch.disconnect();
        host.removeEventListener("pointerdown", down);
        host.removeEventListener("pointermove", move);
        host.removeEventListener("pointerup", up);
        host.removeEventListener("pointercancel", up);
        host.removeEventListener("keydown", keydown);
        scene.traverse((o) => (o as InstanceType<typeof THREE.Mesh>).geometry?.dispose());
        materials.forEach((m) => m.dispose());
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [src]);

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={`${label}. Drag or use the left and right arrow keys to turn it.`}
      tabIndex={0}
      className="relative aspect-[4/5] w-full cursor-grab touch-pan-y select-none border bg-card active:cursor-grabbing [&>canvas]:absolute [&>canvas]:inset-0 [&>canvas]:size-full"
    >
      {state !== "ready" && (
        <p className="absolute inset-0 flex items-center justify-center font-mono text-xs text-muted-foreground">
          {state === "loading" ? "Loading 3D model…" : "The 3D model could not be loaded."}
        </p>
      )}
    </div>
  );
}
