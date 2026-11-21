import * as THREE from "three";

const FONT = '500 44px "IBM Plex Mono", ui-monospace, monospace';

/** A text label that always faces the camera. `height` is in scene units; the width follows the text. `plate` fills behind it. */
export function label(text: string, color: string, height = 0.5, plate?: string) {
  const canvas = document.createElement("canvas");
  canvas.height = 72;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  const draw = () => {
    const ctx = canvas.getContext("2d")!;
    ctx.font = FONT;
    const width = Math.ceil(ctx.measureText(text).width) + 16;
    if (canvas.width !== width) {
      canvas.width = width;
      texture.dispose(); // an uploaded texture cannot change size; the next render allocates a new one
    } else ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = FONT; // resizing the canvas resets the context
    if (plate) {
      ctx.fillStyle = plate;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.fillStyle = color;
    ctx.fillText(text, 8, 50);
    texture.needsUpdate = true;
    sprite.scale.set((canvas.width / canvas.height) * height, height, 1);
  };
  draw();
  document.fonts?.load(FONT).then(draw, () => {});
  return sprite;
}

/** Calls `onPick` with the `userData.id` of the object clicked in `targets`, and shows a pointer over them. */
export function pickable(host: HTMLElement, camera: THREE.Camera, targets: () => THREE.Object3D[], onPick: (id: string) => void) {
  const ray = new THREE.Raycaster();
  const at = new THREE.Vector2();
  const hit = (e: PointerEvent | MouseEvent) => {
    const r = host.getBoundingClientRect();
    at.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    ray.setFromCamera(at, camera);
    const found = ray.intersectObjects(targets(), false).find((h) => h.object.userData.id);
    return found?.object.userData.id as string | undefined;
  };
  const click = (e: MouseEvent) => {
    const id = hit(e);
    if (id) onPick(id);
  };
  const move = (e: PointerEvent) => (host.style.cursor = hit(e) ? "pointer" : "");
  host.addEventListener("click", click);
  host.addEventListener("pointermove", move);
  return () => {
    host.removeEventListener("click", click);
    host.removeEventListener("pointermove", move);
  };
}

/** Frees what a group of objects put on the GPU, for scenes that rebuild part of themselves. */
export function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const m of materials) {
      (m as THREE.SpriteMaterial).map?.dispose();
      m.dispose();
    }
  });
  root.clear();
}
