import * as THREE from "three";
import type { SceneSetup } from "./three-canvas";
import { label, pickable } from "./kit";
import { MOSS, SIGNAL } from "./scenes";

/** One project on the timeline. Months are counted from January of the first year shown. */
export interface TimelineItem {
  slug: string;
  title: string;
  lane: number;
  start: number;
  end: number;
  ongoing: boolean;
}
export interface TimelineApi {
  select(slug: string): void;
  filter(lane: number | null): void;
  onPick: (slug: string) => void;
}

const UNIT = 1; // scene units per month
const ROW = 1.05; // depth of one row of bars
const GAP = 1.1; // space between lanes
const IDLE = new THREE.Color("#1c2420"); // bar fill when not picked, a step above the page
const GREY = "#8f978f";
const NAME = 0.8; // height of a project name; a mono character is about 0.37 of that wide
const WHITE = new THREE.Color(1, 1, 1);

/**
 * The projects as bars on a tilted Gantt board: time runs left to right, one lane per category, and
 * projects that overlap in time take separate rows. The picked bar lifts and lights; the whole board always stays in frame.
 */
export const workTimeline =
  (items: TimelineItem[], lanes: string[], firstYear: number, months: number, now: number): SceneSetup<TimelineApi> =>
  ({ scene, camera, host, pointer }) => {
    camera.position.set(0, 12, 8);
    const x0 = (-months * UNIT) / 2;
    const xOf = (m: number) => x0 + m * UNIT;

    // Rows first: a project takes the first row in its lane that is free when it starts. Its name can run
    // past a short bar, so the row stays taken until the name ends too.
    const rowEnds: number[][] = lanes.map(() => []);
    const placed = [...items]
      .sort((a, b) => a.start - b.start)
      .map((item) => {
        const rows = rowEnds[item.lane];
        let row = rows.findIndex((end) => end < item.start);
        if (row < 0) row = rows.length;
        rows[row] = Math.max(item.end, item.start + Math.ceil((item.title.length * NAME * 0.37 + 0.6) / UNIT));
        return { item, row };
      });

    // Lanes stacked front to back, each as deep as its rows, centred on the board.
    const depth = rowEnds.map((r) => Math.max(r.length, 1) * ROW + 0.4);
    const total = depth.reduce((a, b) => a + b, 0) + GAP * (lanes.length - 1);
    const laneTop: number[] = [];
    depth.reduce((z, d, i) => ((laneTop[i] = z), z + d + GAP), -total / 2);

    lanes.forEach((name, lane) => {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(months * UNIT, depth[lane]).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: MOSS, transparent: true, opacity: 0.08, depthWrite: false }),
      );
      strip.position.set(0, 0, laneTop[lane] + depth[lane] / 2);
      const tag = label(name, GREY, 0.85);
      tag.center.set(0, 0);
      tag.position.set(x0, 0.05, laneTop[lane] - 0.15);
      scene.add(strip, tag);
    });

    // The time axis along the front edge: a tick per month, the year at each January.
    const front = total / 2 + 0.4;
    const ticks: THREE.Vector3[] = [new THREE.Vector3(xOf(0), 0, front), new THREE.Vector3(xOf(months), 0, front)];
    for (let m = 0; m <= months; m++) {
      const h = m % 12 === 0 ? 0.35 : 0.12;
      ticks.push(new THREE.Vector3(xOf(m), 0, front), new THREE.Vector3(xOf(m), 0, front + h));
      if (m % 12 === 0) {
        const year = label(String(firstYear + m / 12), GREY, 0.62);
        year.center.set(0, 1);
        year.position.set(xOf(m) + 0.1, 0, front + 0.45);
        scene.add(year);
      }
    }
    scene.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(ticks),
        new THREE.LineBasicMaterial({ color: MOSS, transparent: true, opacity: 0.7 }),
      ),
    );

    // Today, a line across every lane.
    const nowX = xOf(now + 1);
    scene.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(nowX, 0.01, -total / 2 - 0.3), new THREE.Vector3(nowX, 0.01, front)]),
        new THREE.LineBasicMaterial({ color: SIGNAL, transparent: true, opacity: 0.7 }),
      ),
    );
    const nowTag = label("now", "#c5cf8a", 0.7);
    nowTag.center.set(0.5, 0);
    nowTag.position.set(nowX, 0.05, -total / 2 - 0.35);
    scene.add(nowTag);

    const bars = placed.map(({ item, row }) => {
      const len = (item.end - item.start + 1) * UNIT - 0.12;
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(len, 0.22, ROW - 0.22),
        new THREE.MeshBasicMaterial({ color: IDLE.clone(), transparent: true, opacity: 0.95 }),
      );
      body.userData.id = item.slug;
      body.add(
        new THREE.LineSegments(
          new THREE.EdgesGeometry(body.geometry),
          new THREE.LineBasicMaterial({ color: MOSS, transparent: true, opacity: 0.9 }),
        ),
      );
      const z = laneTop[item.lane] + 0.2 + row * ROW + ROW / 2;
      body.position.set(xOf(item.start) + len / 2 + 0.06, 0.12, z);
      // The name sits at the start of the bar on its own dark plate, so it reads whether the bar is lit or runs short.
      const name = label(item.title, "#ffffff", NAME, "rgba(12,14,13,0.82)");
      name.userData.id = item.slug;
      name.center.set(0, 0.5);
      name.position.set(xOf(item.start) + 0.15, 0.4, z);
      scene.add(body, name);
      return { item, body, name };
    });

    // How far right the board reaches, counting names that run past the last month.
    const reach = Math.max(months * UNIT / 2, ...placed.map(({ item }) => xOf(item.start) + 0.15 + item.title.length * NAME * 0.37));

    let selected = "";
    let lane: number | null = null;
    const api: TimelineApi = {
      onPick: () => {},
      select: (slug) => (selected = slug),
      filter: (l) => (lane = l),
    };
    const stop = pickable(host, camera, () => bars.flatMap((b) => [b.body, b.name]), (id) => api.onPick(id));

    return {
      api,
      update(t, dt) {
        const k = 1 - Math.exp(-dt * 6);
        for (const { item, body, name } of bars) {
          const on = item.slug === selected;
          const dim = lane !== null && item.lane !== lane;
          const material = body.material as THREE.MeshBasicMaterial;
          material.color.lerp(on ? SIGNAL : IDLE, k);
          material.opacity += ((dim ? 0.2 : 0.95) - material.opacity) * k;
          const text = name.material as THREE.SpriteMaterial;
          text.opacity += ((dim ? 0.15 : on ? 1 : 0.85) - text.opacity) * k;
          text.color.lerp(on ? SIGNAL : WHITE, k);
          // The picked bar lifts; a project still under way breathes a little.
          const y = 0.12 + (on ? 0.4 : 0) + (item.ongoing ? Math.sin(t * 3) * 0.03 : 0);
          body.position.y += (y - body.position.y) * k;
          name.position.y = body.position.y + 0.28;
        }
        // Back off on narrow screens (a tablet held upright) so the whole board stays in frame.
        const fit = Math.max(1, (2 * reach + 12) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect * 14.4));
        camera.position.lerp(new THREE.Vector3(pointer.x * 0.4, 12 * fit + pointer.y * 0.4, 8 * fit), 1 - Math.exp(-dt * 2));
        camera.lookAt(0, 0, 0.6);
      },
      dispose: stop,
    };
  };
