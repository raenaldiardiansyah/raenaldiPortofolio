import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Boxes, Pause, Play, Route } from "lucide-react";
import ModelViewer from "./model-viewer";
import { ThreeCanvas } from "./three/three-canvas";
import { MOSS, SIGNAL, navigationScene, type NavControl, type NavStats } from "./three/scenes";

// The legend and readouts use the scene's own colours, so they match it on any page theme.
const moss = `#${MOSS.getHexString()}`;
const signal = `#${SIGNAL.getHexString()}`;

type View = "hardware" | "navigation";
const VIEWS: { id: View; label: string; icon: ReactNode }[] = [
  { id: "hardware", label: "Hardware", icon: <Boxes className="size-4" aria-hidden="true" /> },
  { id: "navigation", label: "Navigation", icon: <Route className="size-4" aria-hidden="true" /> },
];

/**
 * The robot two ways: its hardware taken apart, and its navigation loop running (LiDAR SLAM building the
 * map while pure pursuit steers along the route). Tabs switch between them; only the open one is on the GPU.
 */
// `wide` turns both panels landscape from md up, for a page that gives them the full content width.
// `fill` lets the panel take the height of its grid row from lg up, so it lines up with the text beside it.
export function RobotViews({
  model,
  wide = false,
  fill = false,
}: {
  model: { src: string; label: string };
  wide?: boolean;
  fill?: boolean;
}) {
  const [view, setView] = useState<View>("hardware");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  // Left and right move between the tabs, as in any tab list.
  const onKey = (e: KeyboardEvent) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (VIEWS.findIndex((v) => v.id === view) + step + VIEWS.length) % VIEWS.length;
    setView(VIEWS[next].id);
    tabs.current[next]?.focus();
  };

  return (
    <figure className={fill ? "lg:flex lg:h-full lg:flex-col" : undefined}>
      <div role="tablist" aria-label="How to look at the robot" onKeyDown={onKey} className="grid grid-cols-2 border border-b-0">
        {VIEWS.map((v, i) => {
          const on = v.id === view;
          return (
            <button
              key={v.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              id={`robot-tab-${v.id}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`robot-panel-${v.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => setView(v.id)}
              className={`relative inline-flex h-11 cursor-pointer items-center justify-center gap-2 text-sm transition-colors duration-150 ${
                on ? "text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {on && (
                <motion.span
                  layoutId="robot-view"
                  aria-hidden="true"
                  className="absolute inset-0 bg-foreground"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                />
              )}
              <span className="relative inline-flex items-center gap-2">
                {v.icon}
                {v.label}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={view}
          id={`robot-panel-${view}`}
          role="tabpanel"
          aria-labelledby={`robot-tab-${view}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={fill ? "lg:min-h-80 lg:flex-1 lg:[&>div]:aspect-auto lg:[&>div]:h-full" : undefined}
        >
          {view === "hardware" ? <ModelViewer src={model.src} label={model.label} parts wide={wide} /> : <NavigationView wide={wide} />}
        </motion.div>
      </AnimatePresence>

      {/* The hardware view needs no caption; the navigation one says it is a simulation, not a recording. */}
      {view !== "hardware" && (
        <figcaption className="max-w-2xl pt-3 text-xs leading-relaxed text-muted-foreground">
          The navigation loop, simulated: the LiDAR maps a warehouse aisle while pure pursuit steers towards a goal point on
          the route. An illustration of the algorithm, not a recording. Drag to turn the view.
        </figcaption>
      )}
    </figure>
  );
}

function NavigationView({ wide }: { wide: boolean }) {
  const still = useReducedMotion() ?? false;
  const [paused, setPaused] = useState(false);
  const [stats, setStats] = useState<NavStats>({ mapped: 0, curvature: 0, progress: 0 });
  // Seen from above with the aisle running left to right, a positive curvature turns the robot to its right.
  // The scene reads `paused` every frame and reports a few times a second; one object for the life of the view.
  const control = useRef<NavControl>({ paused: false, report: setStats }).current;
  const setup = useMemo(() => navigationScene(control), [control]);

  const toggle = () => {
    control.paused = !paused;
    setPaused(!paused);
  };
  const pct = Math.round(stats.mapped * 100);

  return (
    <div className={`relative aspect-[4/5] w-full border bg-card ${wide ? "md:aspect-video md:max-h-[calc(100svh-7rem)]" : ""}`}>
      <ThreeCanvas setup={setup} className="absolute inset-0" />

      {/* Readouts: what the robot knows right now. */}
      <dl className="pointer-events-none absolute left-3 top-3 w-40 space-y-2 border bg-background/70 p-2.5 font-mono text-xs backdrop-blur">
        <div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">SLAM map</dt>
            <dd className="tabular-nums">{pct}%</dd>
          </div>
          <div className="mt-1 h-1" style={{ background: `${moss}55` }} aria-hidden="true">
            <div className="h-full" style={{ width: `${pct}%`, background: signal }} />
          </div>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Route</dt>
          <dd className="tabular-nums">{Math.round(stats.progress * 100)}%</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Steering</dt>
          <dd className="tabular-nums">
            {Math.abs(stats.curvature) < 0.02
              ? "straight"
              : `${stats.curvature > 0 ? "right" : "left"} ${Math.abs(stats.curvature).toFixed(2)}`}
          </dd>
        </div>
      </dl>

      {!still && (
        <button
          type="button"
          onClick={toggle}
          aria-label={paused ? "Play the simulation" : "Pause the simulation"}
          aria-pressed={paused}
          className="absolute right-3 top-3 inline-flex size-11 cursor-pointer items-center justify-center border bg-background/70 text-foreground backdrop-blur transition-colors hover:border-signal hover:text-signal"
        >
          {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
        </button>
      )}

      {/* Legend: a shape and a word for every mark, so colour is never the only cue. */}
      <ul className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap gap-x-3 gap-y-1.5 border bg-background/70 px-2.5 py-2 font-mono text-xs text-muted-foreground backdrop-blur">
        <Key label="Route">
          <line x1="1" y1="6" x2="13" y2="6" stroke={moss} strokeWidth="1.5" />
        </Key>
        <Key label="Lookahead">
          <circle cx="7" cy="6" r="4.5" fill="none" stroke={signal} strokeWidth="1.2" />
        </Key>
        <Key label="Goal">
          <circle cx="7" cy="6" r="2.5" fill={signal} />
        </Key>
        <Key label="Map points">
          <circle cx="3" cy="4" r="1" fill={moss} />
          <circle cx="7" cy="8" r="1" fill={moss} />
          <circle cx="11" cy="5" r="1" fill={signal} />
        </Key>
      </ul>
    </div>
  );
}

function Key({ label, children }: { label: string; children: ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden="true">
        {children}
      </svg>
      {label}
    </li>
  );
}
