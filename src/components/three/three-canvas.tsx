import { useEffect, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { cn } from "../../lib/utils";

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  host: HTMLDivElement;
  /** Pointer position over the host, -1..1 on both axes, y up. Eased, so scenes can use it directly. */
  pointer: THREE.Vector2;
  reduceMotion: boolean;
}

export interface SceneHandle<Api = unknown> {
  /** `t` stands still under reduced motion, so ambient movement stops while interaction still works. */
  update: (t: number, dt: number) => void;
  dispose?: () => void;
  api?: Api;
}

export type SceneSetup<Api = unknown> = (ctx: SceneContext) => SceneHandle<Api>;

/**
 * Hosts one three.js scene: renderer, resize, pointer, and a render loop that runs only while
 * the canvas is on screen. Everything the scene put on the GPU is freed when it unmounts.
 */
export function ThreeCanvas<Api>({
  setup,
  className = "",
  apiRef,
}: {
  setup: SceneSetup<Api>;
  className?: string;
  apiRef?: MutableRefObject<Api | null>;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const setupRef = useRef(setup);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      return; // No WebGL: the page reads fine without the decoration.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    const pointer = new THREE.Vector2();
    const target = new THREE.Vector2();
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduceMotion = motionQuery.matches;
    // Ambient movement follows the setting live, if someone turns it on while the page is open.
    let still = reduceMotion;
    const onMotion = (e: MediaQueryListEvent) => (still = e.matches);
    motionQuery.addEventListener("change", onMotion);

    const handle = setupRef.current({ scene, camera, renderer, host, pointer, reduceMotion });
    if (apiRef) apiRef.current = handle.api ?? null;

    const fit = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    fit();
    const resize = new ResizeObserver(fit);
    resize.observe(host);

    // Tracked on the window so a canvas behind text still follows the cursor.
    const onPointer = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      target.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
      target.clampScalar(-1.5, 1.5);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    let visible = false;
    const watch = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), { rootMargin: "100px" });
    watch.observe(host);

    const clock = new THREE.Clock();
    let t = 0;
    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!visible || document.hidden) return;
      if (!still) t += dt;
      pointer.lerp(target, 1 - Math.exp(-dt * 4));
      handle.update(t, dt);
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      watch.disconnect();
      window.removeEventListener("pointermove", onPointer);
      motionQuery.removeEventListener("change", onMotion);
      handle.dispose?.();
      if (apiRef) apiRef.current = null;
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        for (const material of materials) {
          for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
          if (material instanceof THREE.ShaderMaterial) {
            for (const u of Object.values(material.uniforms)) if (u.value instanceof THREE.Texture) u.value.dispose();
          }
          material.dispose();
        }
      });
      renderer.forceContextLoss(); // dispose() alone keeps the context alive; Chrome caps live contexts at ~16
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [apiRef]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={cn("relative [&>canvas]:absolute [&>canvas]:inset-0 [&>canvas]:size-full", className)}
    />
  );
}
