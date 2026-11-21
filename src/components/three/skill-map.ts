import * as THREE from "three";
import type { SceneSetup } from "./three-canvas";
import { disposeTree, label, pickable } from "./kit";
import { ICE, MOSS, SIGNAL } from "./scenes";

export interface MapNode {
  id: string;
  text: string;
  /** How many choices lie behind this node; drawn as small satellites so a layer previews the next one. */
  count?: number;
}
/** One level of the map: the choices on it, and which one (if any) was taken. */
export interface MapLayer {
  nodes: MapNode[];
  selected: string | null;
}
export interface SkillMapApi {
  show(layers: MapLayer[]): void;
  onPick: (id: string) => void;
}

const DEPTH = 14; // more than the camera's distance, so the layer you left is behind you
const HEX = { ice: "#e6e2d6", signal: "#c5cf8a", muted: "#8f978f" };

/**
 * The skill map as layers going away from the viewer: the outer shell holds the skill groups, and each
 * choice opens the next layer further in, centred on the node you picked, with the camera flying to it.
 * The chain of choices so far stays drawn as one line, so you can see the way you came.
 */
export const skillMap: SceneSetup<SkillMapApi> = ({ scene, camera, host, pointer }) => {
  const world = new THREE.Group();
  scene.add(world);
  const targets: THREE.Object3D[] = [];
  const goal = new THREE.Vector3();
  const look = new THREE.Vector3();
  camera.position.set(0, 0.8, 10);

  const api: SkillMapApi = {
    onPick: () => {},
    show(layers) {
      disposeTree(world);
      targets.length = 0;

      // Where each layer's choices sit: in a ring around a centre that moves towards the last pick.
      const centre = new THREE.Vector2();
      const placed = layers.map((layer, depth) => {
        const n = layer.nodes.length;
        const r = n < 2 ? 0 : Math.min(1.5 + n * 0.3, 3.4);
        const at = layer.nodes.map((node, i) => {
          const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
          return { node, pos: new THREE.Vector3(centre.x + Math.cos(a) * r * 1.15, centre.y + Math.sin(a) * r * 0.75, -depth * DEPTH) };
        });
        const ringCentre = new THREE.Vector3(centre.x, centre.y, -depth * DEPTH);
        const pick = at.find((p) => p.node.id === layer.selected);
        if (pick) centre.set(pick.pos.x * 0.55, pick.pos.y * 0.55);
        return { layer, at, ringCentre, r };
      });

      placed.forEach(({ layer, at, ringCentre, r }, depth) => {
        const last = depth === placed.length - 1;
        // The shell of each layer, so the depth reads as rooms you pass through.
        const shell = new THREE.Mesh(
          new THREE.RingGeometry(r * 1.15 + 0.9, r * 1.15 + 0.93, 96),
          new THREE.MeshBasicMaterial({ color: MOSS, transparent: true, opacity: last ? 0.5 : 0.18, depthWrite: false }),
        );
        shell.scale.y = (r * 0.75 + 0.9) / (r * 1.15 + 0.9);
        shell.position.copy(ringCentre);
        world.add(shell);

        for (const { node, pos } of at) {
          const chosen = node.id === layer.selected;
          if (!last && !chosen) continue;
          const dot = new THREE.Mesh(
            new THREE.SphereGeometry(chosen ? 0.13 : 0.09, 20, 12),
            new THREE.MeshBasicMaterial({ color: chosen ? SIGNAL : ICE }),
          );
          dot.position.copy(pos);
          dot.userData.id = node.id;
          const text = label(node.text, chosen ? HEX.signal : last ? HEX.ice : HEX.muted, 0.42);
          text.position.set(pos.x, pos.y + 0.38, pos.z);
          text.userData.id = node.id;
          world.add(dot, text);
          if (last) targets.push(dot, text);
          if (last && !chosen) {
            for (let s = 0; s < (node.count ?? 0); s++) {
              const a = -Math.PI / 2 + (s - (node.count! - 1) / 2) * 0.42; // an arc under the node, clear of its label
              const moon = new THREE.Mesh(
                new THREE.SphereGeometry(0.045, 8, 6),
                new THREE.MeshBasicMaterial({ color: ICE, transparent: true, opacity: 0.5 }),
              );
              moon.position.set(pos.x + Math.cos(a) * 0.4, pos.y + Math.sin(a) * 0.4, pos.z);
              world.add(moon);
            }
          }
        }

        // Fan out from the previous pick to every choice on the newest layer.
        if (last && depth > 0) {
          const from = placed[depth - 1].at.find((p) => p.node.id === placed[depth - 1].layer.selected)?.pos;
          if (from) {
            const fan = at.flatMap(({ pos }) => [from, pos]);
            world.add(
              new THREE.LineSegments(
                new THREE.BufferGeometry().setFromPoints(fan),
                new THREE.LineBasicMaterial({ color: MOSS, transparent: true, opacity: 0.5 }),
              ),
            );
          }
        }
      });

      // The way you came: one line through every pick.
      const chain = placed.map(({ layer, at }) => at.find((p) => p.node.id === layer.selected)?.pos).filter(Boolean) as THREE.Vector3[];
      if (chain.length > 1) {
        world.add(
          new THREE.Line(new THREE.BufferGeometry().setFromPoints(chain), new THREE.LineBasicMaterial({ color: SIGNAL })),
        );
      }

      goal.copy(placed[placed.length - 1].ringCentre);
    },
  };

  const stop = pickable(host, camera, () => targets, (id) => api.onPick(id));
  look.copy(goal);

  return {
    api,
    update(t, dt) {
      const k = 1 - Math.exp(-dt * 3);
      look.lerp(goal, k);
      camera.position.lerp(new THREE.Vector3(goal.x + pointer.x * 0.8, goal.y + 0.8 + pointer.y * 0.4, goal.z + 10), k);
      camera.lookAt(look);
      world.position.y = Math.sin(t * 0.6) * 0.05;
    },
    dispose: stop,
  };
};
