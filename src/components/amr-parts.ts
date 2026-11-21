import type * as THREE_NS from "three";

type Three = typeof THREE_NS;
type Vec = [number, number, number];

/**
 * How the AMR comes apart. Coordinates are the model's own: metres, Y up, X towards the front.
 * `materials` picks pieces of the exported model; `build` adds a piece the simulation model does not have
 * (motors, gearboxes, the controller board and the batteries), drawn simply at the place it sits in the robot.
 * Only one piece of a pair carries the label, so the picture is not labelled twice.
 */
export interface AmrPart {
  label?: string;
  detail?: string;
  materials?: string[];
  build?: (THREE: Three) => THREE_NS.Object3D;
  /** Where the piece moves to when the robot is taken apart, relative to where it sits. */
  offset: Vec;
}

function box(THREE: Three, size: Vec, at: Vec, color: number, metal = 0, roughness = 0.6) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshStandardMaterial({ color, metalness: metal, roughness }),
  );
  mesh.position.set(...at);
  return mesh;
}

// A cylinder lying along Z (the axle direction).
function axle(THREE: Three, radius: number, length: number, at: Vec, color: number, metal = 0.8) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 32).rotateX(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: 0.35 }),
  );
  mesh.position.set(...at);
  return mesh;
}

const motor = (side: 1 | -1) => (THREE: Three) => {
  const g = new THREE.Group();
  g.add(axle(THREE, 0.02, 0.075, [0, 0.075, side * 0.065], 0x9aa0a6));
  g.add(axle(THREE, 0.021, 0.008, [0, 0.075, side * 0.03], 0x2a2d31, 0.2)); // end cap
  return g;
};

const gearbox = (side: 1 | -1) => (THREE: Three) => {
  const g = new THREE.Group();
  g.add(box(THREE, [0.05, 0.05, 0.05], [0, 0.075, side * 0.13], 0x6b6f75, 0.7, 0.4));
  g.add(axle(THREE, 0.005, 0.014, [0, 0.075, side * 0.162], 0xc9ccd1)); // output shaft
  return g;
};

// 12 V sealed lead-acid block, about 151 x 94 x 65 mm, with its two terminals.
const battery = (z: number) => (THREE: Three) => {
  const g = new THREE.Group();
  g.add(box(THREE, [0.151, 0.088, 0.062], [-0.05, 0.192, z], 0x1c1e21, 0, 0.7));
  g.add(box(THREE, [0.151, 0.006, 0.062], [-0.05, 0.239, z], 0x3a3e44, 0, 0.6));
  g.add(box(THREE, [0.012, 0.01, 0.012], [-0.105, 0.247, z], 0xc2412d, 0.3, 0.5));
  g.add(box(THREE, [0.012, 0.01, 0.012], [0.005, 0.247, z], 0x111111, 0.3, 0.5));
  return g;
};

const pcbMount = (THREE: Three) => box(THREE, [0.16, 0.008, 0.12], [0.42, 0.16, 0], 0x2b2e33, 0.2, 0.7);

const pcb = (THREE: Three) => {
  const g = new THREE.Group();
  g.add(box(THREE, [0.13, 0.0016, 0.095], [0.42, 0.172, 0], 0x1f6b3a, 0, 0.5));
  g.add(box(THREE, [0.022, 0.004, 0.022], [0.41, 0.175, 0], 0x111214, 0, 0.4)); // MCU
  g.add(box(THREE, [0.012, 0.003, 0.03], [0.45, 0.175, 0.025], 0x111214, 0, 0.4)); // driver
  g.add(box(THREE, [0.012, 0.003, 0.03], [0.45, 0.175, -0.025], 0x111214, 0, 0.4));
  g.add(box(THREE, [0.006, 0.008, 0.07], [0.365, 0.177, 0], 0x0d0d0e, 0, 0.5)); // header
  return g;
};

// Jetson Orin Nano Developer Kit (100 × 79 mm carrier, module under a finned heatsink and fan), on its own
// plate beside the controller PCB in the front bay.
const JZ = -0.115;
const jetson = (THREE: Three) => {
  const g = new THREE.Group();
  g.add(box(THREE, [0.11, 0.008, 0.09], [0.42, 0.16, JZ], 0x2b2e33, 0.2, 0.7)); // plate
  g.add(box(THREE, [0.1, 0.0016, 0.079], [0.42, 0.172, JZ], 0x16191b, 0, 0.5)); // carrier board
  g.add(box(THREE, [0.07, 0.006, 0.045], [0.425, 0.176, JZ - 0.008], 0x2a5a3a, 0, 0.5)); // module
  for (let i = 0; i < 7; i++) g.add(box(THREE, [0.064, 0.016, 0.003], [0.425, 0.187, JZ - 0.026 + i * 0.006], 0x0d0d0e, 0.6, 0.4)); // fins
  const fan = new THREE.Mesh(
    new THREE.CylinderGeometry(0.017, 0.017, 0.006, 32),
    new THREE.MeshStandardMaterial({ color: 0x1b1c1e, metalness: 0.3, roughness: 0.5 }),
  );
  fan.position.set(0.425, 0.198, JZ - 0.008);
  g.add(fan);
  g.add(box(THREE, [0.016, 0.014, 0.015], [0.372, 0.18, JZ + 0.02], 0xb8bcc2, 0.8, 0.3)); // USB
  g.add(box(THREE, [0.016, 0.014, 0.015], [0.372, 0.18, JZ], 0xb8bcc2, 0.8, 0.3));
  g.add(box(THREE, [0.018, 0.013, 0.016], [0.372, 0.18, JZ - 0.022], 0xb8bcc2, 0.8, 0.3)); // Ethernet
  return g;
};

export const AMR_PARTS: AmrPart[] = [
  { label: "Chassis", materials: ["$Material_1", "$Material_2"], offset: [0, 0, 0] },
  { label: "Battery bay lid", detail: "lifts off", materials: ["$Material_3"], offset: [0, 0.62, 0] },
  { label: "12 V battery ×2", detail: "in series, 24 V to the motors", build: battery(-0.07), offset: [0, 0.34, -0.12] },
  { build: battery(0), offset: [0, 0.34, 0] },
  { label: "12 V battery", detail: "controller supply", build: battery(0.07), offset: [0, 0.48, 0.12] },
  { label: "Controller PCB", detail: "STM32F407", build: pcb, offset: [0.32, 0.3, 0] },
  { label: "PCB mount", detail: "front bay", build: pcbMount, offset: [0.32, 0.12, 0] },
  { label: "Jetson Orin Nano", detail: "Developer Kit", build: jetson, offset: [0.32, 0.42, -0.1] },
  { label: "Drive wheel ×2", materials: ["$Material_13"], offset: [0, 0, 0.4] },
  { materials: ["$Material_12"], offset: [0, 0, -0.4] },
  { label: "Gearbox ×2", build: gearbox(1), offset: [0, 0, 0.28] },
  { build: gearbox(-1), offset: [0, 0, -0.28] },
  { label: "DC motor ×2", build: motor(1), offset: [0, 0, 0.19] },
  { build: motor(-1), offset: [0, 0, -0.19] },
  { label: "Caster wheel ×2", materials: ["$Material_15"], offset: [0.12, 0, 0.06] },
  { materials: ["$Material_14"], offset: [0.12, 0, -0.06] },
  { label: "Mast", materials: ["$Material_4", "$Material_5"], offset: [0, 0.08, 0] },
  { materials: ["$Material_6"], offset: [0, 0.08, -0.1] },
  { materials: ["$Material_7"], offset: [0, 0.08, 0.1] },
  { label: "2D LiDAR", detail: "RPLIDAR", materials: ["$Material_8", "$Material_9"], offset: [0, 0.26, 0] },
  {
    label: "Kinect camera",
    materials: ["$Material_10", "$Material_11", "$Material_16", "$Material_17", "$Material_18"],
    offset: [0.24, 0.04, 0],
  },
];
