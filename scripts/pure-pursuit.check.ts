// Self-check: the robot follows the hero's slalom route to the end, stays near it, and keeps clear of the crates.
import assert from "node:assert";
import { purePursuit, type Pose } from "../src/components/three/pure-pursuit.ts";

// Same waypoints and crates as the hero (keep in sync with scenes.ts), densified by straight segments.
const wp = [[-13.5, 0], [-11.5, 0.6], [-9, 2.3], [-7, 0], [-5, -2.3], [-3, 0], [-1, 2.3], [1, 0], [3, -2.3], [5, 0], [7, 2.3], [9.5, 0.4], [13, 0]];
const crates = [[-9, -0.8], [-5, 0.8], [-1, -0.8], [3, 0.8], [7, -0.8]];
const path: { x: number; z: number }[] = [];
for (let i = 0; i < wp.length - 1; i++) {
  const [a, b] = [wp[i], wp[i + 1]];
  for (let s = 0; s < 30; s++) path.push({ x: a[0] + (b[0] - a[0]) * (s / 30), z: a[1] + (b[1] - a[1]) * (s / 30) });
}
path.push({ x: 13, z: 0 });

const pose: Pose = { x: path[0].x, z: path[0].z, heading: 0 };
let i = 0, worst = 0, closest = Infinity, done = false, steps = 0;
for (; steps < 60 * 60 && !done; steps++) {
  const r = purePursuit(pose, path, i, 2, 1.6, 1 / 60);
  i = r.nearest;
  done = r.done;
  worst = Math.max(worst, Math.min(...path.map((p) => Math.hypot(p.x - pose.x, p.z - pose.z))));
  // Crates are 1.1 square; distance from the robot centre to the crate's edge.
  for (const [cx, cz] of crates) closest = Math.min(closest, Math.max(Math.abs(pose.x - cx), Math.abs(pose.z - cz)) - 0.55);
}
assert(done, "never reached the end");
assert(worst < 0.7, `drifted ${worst.toFixed(2)} from the path`);
// The robot is about 0.8 wide in scene units, so 0.65 from its centre still leaves a gap.
assert(closest > 0.65, `came within ${closest.toFixed(2)} of a crate`);
console.log(`ok: end in ${(steps / 60).toFixed(1)} s, max cross-track ${worst.toFixed(2)}, closest crate ${closest.toFixed(2)}`);
