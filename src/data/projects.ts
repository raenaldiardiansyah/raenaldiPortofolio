// Single source of truth for the portfolio's projects, newest first.
// To add a project: append an entry here. The home index and /work/:slug pick it up.

export type ProjectStatus = "In development" | "Live" | "Prototype" | "Completed";
export type ProjectCategory = "Robotics & IoT" | "Web";

export interface Project {
  slug: string;
  title: string;
  summary: string;
  category: ProjectCategory;
  status: ProjectStatus;
  year: string;
  timeline: string;
  role: string;
  context: string;
  stack: string[];
  links: { label: string; href: string }[];
  image?: { src: string; alt: string; caption: string; width: number; height: number };
  overview: string[];
  highlights: string[];
  log?: { date: string; text: string }[];
}

const GH = "https://github.com/raenaldiardiansyah";

export const projects: Project[] = [
  {
    slug: "amr",
    title: "Autonomous Mobile Robot",
    summary:
      "A warehouse robot that maps with 2D LiDAR and drives itself to rack positions. Now being scaled up to a larger chassis.",
    category: "Robotics & IoT",
    status: "In development",
    year: "2026",
    timeline: "Sep 2026 — now",
    role: "Firmware and ROS 2 integration",
    context: "Team project, Telkom University",
    stack: ["ROS 2 Jazzy", "Nav2", "SLAM Toolbox", "STM32F407", "FreeRTOS", "RPLIDAR", "C", "Python"],
    links: [{ label: "Source", href: `${GH}/AMR` }],
    image: {
      src: "/images/amr-map.webp",
      alt: "Black and white occupancy grid map showing two long corridors meeting at a corner, with rooms along one side.",
      caption: "Occupancy grid of a building corridor, built by the robot's LiDAR SLAM.",
      width: 1000,
      height: 775,
    },
    overview: [
      "The robot builds an occupancy map of its surroundings with a 2D LiDAR, localises by fusing wheel encoders, an IMU and laser odometry through an EKF, and navigates to goals with Nav2. An STM32F407 runs the motor control loop and talks to the ROS 2 computer over UART. A web control panel lets an operator send the robot to a rack from any device on the network.",
      "The navigation stack was first built by the team on a small prototype. My part is moving it onto a larger robot: new wheels and gearing, higher-current motor drivers, and the firmware and bridge changes the new hardware needs.",
    ],
    highlights: [
      "Re-derived the robot model for the new chassis — 150 mm wheels, 456 mm wheelbase, 2400 encoder ticks per revolution — and wrote a PI gain calculator for the new constants.",
      "Rewrote the motor output stage for two BTS7960 drivers on TIM8 (four PWM channels).",
      "Firmware fixes: UART receive recovers after an overrun, and the watchdog is refreshed while the IMU initialises.",
      "Added a /cmd_vel timeout to the serial bridge so the robot stops when commands stop arriving.",
      "Scaffolded a vision package for a Kinect v1 with YOLO11n detection and AprilTag markers.",
    ],
    log: [
      { date: "Nov 2026", text: "Serial bridge scales linear and angular velocity for the open-loop firmware; teleop capped at 0.45 m/s." },
      { date: "Nov 2026", text: "Vision package scaffold: Kinect v1, YOLO11n, AprilTag." },
      { date: "Oct 2026", text: "Firmware moved to the large-robot base; motor output for 2× BTS7960." },
      { date: "Oct 2026", text: "UART RX recovery after overrun; watchdog refresh during IMU init." },
      { date: "Oct 2026", text: "New chassis dimensions: 150 mm wheels, 456 mm wheelbase, 2400 ticks/rev." },
    ],
  },
  {
    slug: "kai-rams",
    title: "KAI RAMS Insight Dashboard",
    summary:
      "Predictive-maintenance dashboard for train fleets: alarms, health scores and telemetry in one operator view.",
    category: "Web",
    status: "Live",
    year: "2026",
    timeline: "Jul — Sep 2026",
    role: "Frontend development",
    context: "KAI challenge, team project",
    stack: ["Next.js", "TypeScript", "MapLibre GL", "Recharts", "Zustand", "FastAPI", "PostgreSQL"],
    links: [
      { label: "Live site", href: "https://kai-challange-frontend.vercel.app" },
      { label: "Source", href: `${GH}/KAI-challange` },
    ],
    overview: [
      "RAMS (Rail Assets Monitoring System) collects sensor data from trainsets. This dashboard is the part people look at. An operator opens the overview to see what needs attention first: active alarms, trainsets with a low health score, and the recommended action. A technician opens a single car to inspect its BP/BC telemetry against thresholds.",
    ],
    highlights: [
      "Screens for overview, alarm centre, live monitoring, trainset and car detail, predictive maintenance, work orders and reports.",
      "A service layer that switches between dummy data and the backend API with one environment flag, so the interface could be built before the API existed.",
      "Fleet map with MapLibre GL and trend charts with Recharts, responsive down to mobile.",
      "Login backed by a FastAPI authentication service on PostgreSQL, with access and refresh tokens and Argon2 password hashing.",
    ],
  },
  {
    slug: "gizantara",
    title: "Gizantara",
    summary:
      "A blockchain-backed audit trail for Indonesia's free school meals programme, built for GEMASTIK 2026.",
    category: "Web",
    status: "Live",
    year: "2026",
    timeline: "Apr — Aug 2026",
    role: "Full-stack development",
    context: "GEMASTIK 2026, software development division, team of three",
    stack: ["Next.js", "Express", "Solidity", "Hardhat", "ethers.js", "MapLibre GL", "Turborepo"],
    links: [
      { label: "Live site", href: "https://gemastik-2026-ai-service.vercel.app" },
      { label: "Source", href: `${GH}/GEMASTIK-2026` },
    ],
    image: {
      src: "/images/boga-dashboard.webp",
      alt: "Government dashboard with tiles for active disputes, pending vendors, on-time rate, portions and spending, above a distribution trend chart.",
      caption: "Government auditor dashboard: on-time delivery rate, portions served and spending.",
      width: 1440,
      height: 900,
    },
    overview: [
      "The Makan Bergizi Gratis programme moves very large budgets through thousands of kitchen units, and supplier price mark-ups are a known risk. Gizantara (first named B.O.G.A, Blockchain Operasional Gizi Akuntabel) records supplier verification, payments and deliveries so each step can be audited by someone who does not have to trust the party before them.",
    ],
    highlights: [
      "Separate portals for each role: government auditor dashboard, supplier verification, payment verification, distribution monitoring, food audit and feedback from schools.",
      "A vendor registry smart contract (Solidity, OpenZeppelin) deployed with Hardhat and called from an Express API through ethers.js.",
      "Delivery monitoring on a map, QR code scanning, and a supplier reputation dashboard.",
      "One Turborepo monorepo for the web app, API, contracts and a small Python service.",
    ],
  },
  {
    slug: "tautin",
    title: "TautIn",
    summary:
      "Prototype of a professional network built around projects, where every contribution carries its evidence.",
    category: "Web",
    status: "Prototype",
    year: "2026",
    timeline: "Jul 2026",
    role: "Product design and frontend",
    context: "BRIN competition",
    stack: ["Next.js", "TypeScript", "GSAP", "Motion", "pnpm workspaces"],
    links: [
      { label: "Live site", href: "https://tautin-web.vercel.app" },
      { label: "Source", href: `${GH}/BRIN-Competition` },
    ],
    overview: [
      "TautIn is a network organised around projects rather than job titles. People show what they contributed, attach evidence for it, and find collaborators through matching they can inspect instead of having to take on faith.",
    ],
    highlights: [
      "One AI hub with entry points from a project, a profile or an organisation: collaboration matching, novelty checker, research gap and funding recommendations.",
      "Every AI result shows its reason, evidence, confidence, data gaps and limitations. A claim without evidence can never be marked verified.",
      "Free, Pro and Organisation tiers simulated in the prototype, with limitation notices and upgrade prompts instead of dead pages.",
      "Monorepo with a Next.js frontend, a separate API and shared type contracts.",
    ],
  },
  {
    slug: "rw25-cimahi",
    title: "RW 25 Cimahi Resident System",
    summary:
      "Administration system for a neighbourhood unit: resident records, family cards, requests and social-aid data in one place.",
    category: "Web",
    status: "Live",
    year: "2026",
    timeline: "Apr — Jul 2026",
    role: "Full-stack development",
    context: "Community service programme, team project",
    stack: ["Next.js", "Hono", "Drizzle ORM", "PostgreSQL", "better-auth", "Zod"],
    links: [
      { label: "Live site", href: "https://abdimas-rw-25-cimahi.vercel.app" },
      { label: "Source", href: `${GH}/ABDIMAS_RW_25_CIMAHI` },
    ],
    overview: [
      "Built as a community service (Abdimas) project for RW 25 in Cimahi. Administrators manage residents, family cards, move-in and move-out records, social aid, activities and document requests. Residents get their own portal for services, schedules and submitting aspirations.",
    ],
    highlights: [
      "Admin area covering resident data, family cards, mutations, social aid, election data, activities, requests, reports and access rights.",
      "Resident portal: register, wait for verification, then manage the household, request services and follow schedules.",
      "Hono API with Zod contracts shared between frontend and backend, plus PDF and Excel export for reports.",
      "Authentication with better-auth and Drizzle on serverless Postgres.",
    ],
  },
  {
    slug: "ec-tracker",
    title: "EC Tracker",
    summary: "Real-time map and telemetry for an electric car: position, speed and battery over MQTT.",
    category: "Robotics & IoT",
    status: "Live",
    year: "2026",
    timeline: "Mar 2026",
    role: "Design and development",
    context: "IoT monitoring",
    stack: ["React", "TypeScript", "MQTT", "Leaflet", "Supabase"],
    links: [
      { label: "Live site", href: "https://electriccartracker.vercel.app" },
      { label: "Source", href: `${GH}/EC-Tracker` },
    ],
    overview: [
      "A monitoring page for an electric car. The vehicle publishes its position, speed and battery level over MQTT, and the web app shows them live on a map with a side panel for the current readings.",
    ],
    highlights: [
      "Live position on a Leaflet map with speed and battery readouts.",
      "MQTT over WebSocket, so the browser subscribes to the broker directly.",
      "A built-in MQTT simulator page for testing the dashboard without the vehicle.",
    ],
  },
  {
    slug: "bojong-travel",
    title: "Bojong Travel",
    summary: "Bus schedules, route simulation on a satellite map, and a location-based guide for food and places.",
    category: "Web",
    status: "Live",
    year: "2026",
    timeline: "2026",
    role: "Project lead",
    context: "Web application",
    stack: ["React", "TypeScript", "Leaflet", "Mapbox", "Supabase"],
    links: [
      { label: "Live site", href: "https://bojong-travel.vercel.app" },
      { label: "Source", href: `${GH}/Bojong-Travel` },
    ],
    overview: [
      "A bus schedule platform with interactive satellite map simulation and a location-based chatbot for culinary and tourism recommendations.",
    ],
    highlights: [
      "Route data, arrival simulation and satellite map in one view, grouped so bus positions and nearby points of interest can be read quickly.",
      "Users can simulate bus arrivals and explore routes interactively.",
      "A rule-based chatbot recommends food and places from the user's current location with minimal input.",
    ],
  },
  {
    slug: "agv-line-follower",
    title: "Line-Following AGV",
    summary: "A compact automated guided vehicle that carries up to 5 kg, with a web dashboard for live monitoring.",
    category: "Robotics & IoT",
    status: "Completed",
    year: "2025–26",
    timeline: "2025 — 2026",
    role: "Project lead",
    context: "Hardware and web",
    stack: ["ESP32", "MQTT", "C/C++", "KiCad", "React", "React Three Fiber"],
    links: [
      { label: "Dashboard", href: "https://agv-iot-dashboard.vercel.app" },
      { label: "Firmware", href: `${GH}/AGV-IDE` },
      { label: "Dashboard source", href: `${GH}/agv-iot-dashboard` },
    ],
    image: {
      src: "/images/agv-dashboard.webp",
      alt: "Dark monitoring dashboard with gauges for load weight and light intensity, a battery level indicator and a start button.",
      caption: "Monitoring dashboard: load weight, light intensity, battery and engine control over MQTT.",
      width: 1600,
      height: 737,
    },
    overview: [
      "A compact automated guided vehicle designed to transport payloads of up to 5 kg, with an emphasis on mechanical stability, space efficiency and reliable operation.",
      "The dashboard presents battery level, system status and load in real time. Operation is largely automated, so interaction is limited to monitoring and starting or stopping the vehicle.",
    ],
    highlights: [
      "Line-following firmware driving dual TB6612FNG motor drivers.",
      "HX711 load cell for payload weight and an I2C LCD on the vehicle.",
      "Custom PCB designed in KiCad.",
      "Web dashboard connected to the vehicle through an MQTT broker.",
    ],
  },
  {
    slug: "smart-lock",
    title: "Smart-Lock Door",
    summary: "An ESP32 door lock with password access, presence detection and remote unlock from a web dashboard.",
    category: "Robotics & IoT",
    status: "Completed",
    year: "2025",
    timeline: "2025",
    role: "Project lead",
    context: "Embedded system",
    stack: ["ESP32", "C/C++", "MQTT", "Blynk", "Wokwi"],
    links: [{ label: "Simulation", href: "https://wokwi.com/projects/449679932330601473" }],
    image: {
      src: "/images/smart-lock.webp",
      alt: "Circuit diagram: an ESP32 wired to a 4×4 keypad, LCD, PIR sensor, ultrasonic sensor, servo, buzzer and LED on a breadboard.",
      caption: "The circuit in the Wokwi simulator: keypad and LCD for entry, PIR and ultrasonic sensors for presence, a servo for the latch.",
      width: 1239,
      height: 894,
    },
    overview: [
      "A smart door lock that combines automated locking, password access with multiple stored credentials, and human presence detection.",
    ],
    highlights: [
      "Keypad entry with LCD feedback; a servo drives the latch.",
      "Up to five access passwords can be managed.",
      "The door can be unlocked remotely from the web interface.",
      "Real-time view of door status, access events and outside conditions.",
    ],
  },
];

export const categories: ProjectCategory[] = ["Robotics & IoT", "Web"];

export function getProject(slug: string) {
  const index = projects.findIndex((p) => p.slug === slug);
  if (index === -1) return undefined;
  return {
    project: projects[index],
    number: index + 1,
    previous: projects[index - 1],
    next: projects[index + 1],
  };
}
