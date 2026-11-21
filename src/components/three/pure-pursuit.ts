/** A differential-drive robot on the floor plane: position in x/z, heading in radians, forward = (cos, sin). */
export interface Pose {
  x: number;
  z: number;
  heading: number;
}

type Point = { x: number; z: number };

/**
 * One pure pursuit step along an open path. Finds the nearest path point (searching ahead of the
 * last one, so the robot never doubles back), takes the first point at least `lookahead` away as the
 * goal (where the lookahead circle meets the path), steers on the arc through it
 * (curvature = 2·lateral / distance²), and moves the pose. Near the end the goal stays on the last point.
 */
export function purePursuit(pose: Pose, path: Point[], from: number, lookahead: number, speed: number, dt: number) {
  const last = path.length - 1;
  const dist = (p: Point) => Math.hypot(p.x - pose.x, p.z - pose.z);

  let nearest = from;
  for (let i = from + 1; i <= Math.min(from + 40, last); i++) if (dist(path[i]) < dist(path[nearest])) nearest = i;
  let goal = nearest;
  while (goal < last && dist(path[goal]) < lookahead) goal++;

  const dx = path[goal].x - pose.x;
  const dz = path[goal].z - pose.z;
  const lateral = -Math.sin(pose.heading) * dx + Math.cos(pose.heading) * dz;
  const curvature = (2 * lateral) / Math.max(dx * dx + dz * dz, 1e-6);

  pose.heading += speed * curvature * dt;
  pose.x += speed * Math.cos(pose.heading) * dt;
  pose.z += speed * Math.sin(pose.heading) * dt;
  return { nearest, goal, curvature, done: nearest === last || dist(path[last]) < 0.3 };
}
