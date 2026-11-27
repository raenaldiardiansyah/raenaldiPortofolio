import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactElement, ReactNode, SVGProps } from 'react'
import { AnimatePresence, LazyMotion, animate, domAnimation, m, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { AppWindow, Cable, CircuitBoard, Cpu } from 'lucide-react'
import { cn } from '@/lib/utils'

// Recomposed from the Syntra hero block: the stack now shows what Raenaldi builds, layer by layer.
// Block stylesheet, inlined because the component is a single file.
const BLOCK_CSS = `
/* Tokens are the site's own (.desk), so the hero follows the theme instead of carrying a palette. */
.n3-root {
  --color-n3-page: hsl(var(--background));
  --color-n3-ink: hsl(var(--foreground));
  --color-n3-grey: hsl(var(--muted-foreground));
  --color-n3-line: hsl(var(--border));
  --color-n3-accent: hsl(var(--signal));
  --n3-nav-space: 3.5rem; /* the site header, h-14 */
}

/* svh, like the rest of the site: the hero fills what the header leaves. */
.n3-hero {
  min-height: max(30rem, calc(100svh - var(--n3-nav-space)));
}

@media (max-width: 1023px) {
  .n3-hero {
    min-height: 0;
  }
}

/* ---------- Background: one soft light behind the visual ---------- */
.n3-bg {
  background:
    radial-gradient(ellipse 55% 65% at 74% 52%, hsl(var(--foreground) / 0.05) 0%, transparent 70%),
    radial-gradient(ellipse 40% 45% at 78% 58%, hsl(var(--signal) / 0.06) 0%, transparent 70%),
    var(--color-n3-page);
}

.n3-halo {
  border-radius: 9999px;
  background: radial-gradient(closest-side, hsl(var(--foreground) / 0.05), transparent);
}

/* The floor grid runs under the whole hero: clearest beneath the visual and along the bottom,
   dissolving toward the top left so the headline sits on a clean ground. */
.n3-floor,
.n3-floor-lit {
  --n3-floor-area: radial-gradient(ellipse 75% 80% at 72% 70%, #000 20%, transparent 100%);
  --n3-floor-edges:
    linear-gradient(to left, transparent 0%, #000 22%), linear-gradient(to top, transparent 0%, #000 28%);
  -webkit-mask-image: var(--n3-floor-area), var(--n3-floor-edges);
  mask-image: var(--n3-floor-area), var(--n3-floor-edges);
  -webkit-mask-composite: source-in;
  mask-composite: intersect;
}

.n3-floor {
  opacity: 0.5;
}

/* The spotlight: a soft round window onto a signal-green copy of the grid. Both move by transform
   only (see HeroFloor), so following the cursor costs no repaints. */
.n3-floor-spot {
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0;
  transition: opacity 400ms ease;
  will-change: transform, opacity;
  -webkit-mask-image: radial-gradient(closest-side, #000 0%, transparent 100%);
  mask-image: radial-gradient(closest-side, #000 0%, transparent 100%);
}

.n3-floor-lit {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
}

[data-spot='on'] > .n3-floor-spot {
  opacity: 0.5;
}

@media (max-width: 1023px) {
  .n3-floor,
  .n3-floor-lit {
    --n3-floor-area: radial-gradient(ellipse 90% 60% at 50% 75%, #000 20%, transparent 100%);
  }
}

/* The orbits and construction lines dissolve toward the copy instead of running under it. */
.n3-fade-edge {
  -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 14%);
  mask-image: linear-gradient(to right, transparent 0%, #000 14%);
}

@media (max-width: 1023px) {
  .n3-fade-edge {
    -webkit-mask-image: none;
    mask-image: none;
  }
}

/* ---------- Intro: CSS, so the visual plays in from the first paint ---------- */
.n3-enter {
  animation: n3-enter 1100ms cubic-bezier(0.22, 1, 0.36, 1) 250ms backwards;
}

@keyframes n3-enter {
  from {
    opacity: 0;
    scale: 0.97;
  }
}

/* ---------- Core motion: all of it slow, none of it on the same property as a script ---------- */
@keyframes n3-float {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(calc(var(--n3-float, 6) * -1px));
  }
}

.n3-float {
  animation: n3-float var(--n3-float-seconds, 6.5s) ease-in-out infinite alternate;
}

@keyframes n3-seam {
  from {
    opacity: 0.78;
  }
  to {
    opacity: 1;
  }
}

.n3-seam-pulse {
  animation: n3-seam 4.8s ease-in-out infinite alternate;
}

@media (prefers-reduced-motion: reduce) {
  .n3-enter,
  .n3-float,
  .n3-seam-pulse {
    animation: none;
  }
}

/* ---------- Stage cards: dark glass that hides the lines behind the type ---------- */
.n3-stage-card {
  border: 1px solid hsl(var(--foreground) / 0.09);
  border-radius: 1em;
  background: hsl(var(--card) / 0.84);
  box-shadow:
    0 1px 2px rgb(0 0 0 / 0.3),
    0 14px 34px -18px rgb(0 0 0 / 0.8),
    inset 0 1px 0 hsl(var(--foreground) / 0.05);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  transition:
    border-color 300ms ease,
    box-shadow 300ms ease;
}

.n3-stage-card-lit {
  border-color: hsl(var(--signal) / 0.45);
  box-shadow:
    0 1px 2px rgb(0 0 0 / 0.3),
    0 18px 38px -18px hsl(var(--signal) / 0.35),
    inset 0 1px 0 hsl(var(--foreground) / 0.05);
}
`

// ───── components/motionuikit/sections/syntra/geometry.ts ─────
/**
 * Shared isometric geometry. Everything on the core is a rounded square in a flat plane,
 * projected with the same 2:1 isometric matrix, so faces, seams and inlays all agree.
 */

const ISO_X = 0.866
const ISO_Y = 0.5

const CX = 500
const CY = 500

// Isometric ring flattening (true isometric circle height / width).
const RING_FLATTEN = 0.57

// Horizontal radii of the two orbits around the core, inner and outer.
const RING_RX = [400, 530] as const

type SlabType = {
  // half the side length of the square footprint
  half: number

  // corner radius of the footprint
  radius: number

  // screen y of the top face centre
  top: number

  // vertical thickness
  depth: number
}

// Stack, bottom to top. Each slab sits `gap` above the one below it; the gap is where the light lives.
const BASE: SlabType = { half: 168, radius: 40, top: 475, depth: 34 }
const SEAM_GAP = 9
const MID: SlabType = { half: 151, radius: 36, top: BASE.top - SEAM_GAP - 28, depth: 28 }
const CAP: SlabType = { half: 101, radius: 28, top: MID.top - 14, depth: 14 }

type Point = [number, number]

// Server and browser can disagree in the last float digit, which React reports as a hydration mismatch.
const round = (n: number) => Math.round(n * 100) / 100

const project = (x: number, y: number, cx = CX, cy = CY): Point => {
  return [cx + (x - y) * ISO_X, cy + (x + y) * ISO_Y]
}

// Rounded square in plane coordinates, walked once around.
const footprint = (half: number, radius: number, steps = 14): Point[] => {
  const r = Math.min(radius, half)
  const c = half - r

  const corners: [number, number, number][] = [
    [c, c, 0],
    [-c, c, 90],
    [-c, -c, 180],
    [c, -c, 270]
  ]

  const pts: Point[] = []

  for (const [ox, oy, start] of corners) {
    for (let i = 0; i <= steps; i++) {
      const a = ((start + (90 * i) / steps) * Math.PI) / 180

      pts.push([ox + r * Math.cos(a), oy + r * Math.sin(a)])
    }
  }

  return pts
}

const toPath = (pts: Point[]) => `M${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}Z`

const topPath = (slab: SlabType, inset = 0, cx = CX, dy = 0) => {
  const half = slab.half - inset
  const radius = Math.max(slab.radius - inset, 1)

  return toPath(footprint(half, radius).map(([x, y]) => project(x, y, cx, slab.top + dy)))
}

// A vertically extruded convex shape is the convex hull of its top and bottom outlines.
const hull = (points: Point[]): Point[] => {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

  const build = (list: Point[]) => {
    const out: Point[] = []

    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop()
      out.push(p)
    }

    out.pop()

    return out
  }

  return [...build(pts), ...build([...pts].reverse())]
}

const bodyPath = (slab: SlabType, inset = 0) => {
  const half = slab.half - inset
  const radius = Math.max(slab.radius - inset, 1)
  const outline = footprint(half, radius)
  const upper = outline.map(([x, y]) => project(x, y, CX, slab.top))
  const lower = outline.map(([x, y]) => project(x, y, CX, slab.top + slab.depth))

  return toPath(hull([...upper, ...lower]))
}

// A point on one of the two visible side faces. u runs along the face, v down its thickness.
const facePoint = (slab: SlabType, side: 'left' | 'right', u: number, v: number): Point => {
  const { half, top, depth } = slab

  if (side === 'left') {
    const [x, y] = project(-half + 2 * half * u, half, CX, top)

    return [x, y + depth * v]
  }

  const [x, y] = project(half, half - 2 * half * u, CX, top)

  return [x, y + depth * v]
}

// Transform that lays a local (x, y) rectangle onto a side face, or onto a top plane.
const FACE_MATRIX = {
  left: `${ISO_X} ${ISO_Y} 0 1`,
  right: `${ISO_X} ${-ISO_Y} 0 1`,
  top: `${ISO_X} ${ISO_Y} ${-ISO_X} ${ISO_Y}`
}

const ringPoint = (rx: number, angleDeg: number): Point => {
  const a = (angleDeg * Math.PI) / 180

  return [round(CX + rx * Math.cos(a)), round(CY + rx * RING_FLATTEN * Math.sin(a))]
}

const ringPath = (rx: number) => {
  const ry = rx * RING_FLATTEN

  return `M${CX + rx} ${CY}A${rx} ${ry} 0 1 1 ${CX - rx} ${CY}A${rx} ${ry} 0 1 1 ${CX + rx} ${CY}Z`
}

// ───── the R monogram (the favicon's mark), in place of the syntra leaves ─────
// One stroke path in a 64-unit box, centred and scaled to the footprint the leaves had on the cap.
const MARK_R = 'M21 50V15h13.5a9 9 0 0 1 0 18H21M33 33l12 17'

type MarkRProps = { color: string; width?: number }

// The mark on its own, for drawing inside another SVG (the core's top plate).
const MarkR = ({ color, width = 6.5 }: MarkRProps) => {
  return (
    <path
      d={MARK_R}
      transform='scale(1.45) translate(-33 -32.5)'
      fill='none'
      stroke={color}
      strokeWidth={width}
      strokeLinejoin='round'
    />
  )
}

// ───── assets/motionuikit/svg/syntra-core-parts.tsx ─────
/**
 * The parts the resting core and its exploded view are both drawn from. Each slab is a rounded
 * square in an isometric plane; depth comes from the extruded side faces, bevels, and gradients
 * that assume light from the upper left.
 */

const ORANGE = '#C5CF88'

type FaceProps = { slab: SlabType; side: 'left' | 'right'; u: number; v: number }

const FaceMark = ({
  slab,
  side,
  u,
  v,
  w,
  h,
  fill,
  glow
}: FaceProps & { w: number; h: number; fill: string; glow?: boolean }) => {
  // Vars
  const [x, y] = facePoint(slab, side, u, v)

  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) matrix(${FACE_MATRIX[side]} 0 0)`}>
      {glow && (
        <rect
          x={-w / 2 - 2}
          y={-h / 2 - 3}
          width={w + 4}
          height={h + 6}
          rx={h}
          fill={fill}
          filter='url(#n3-blur-sm)'
          opacity='0.75'
        />
      )}
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={fill} />
    </g>
  )
}

type PanelLineProps = {
  slab: SlabType
  side: 'left' | 'right'
  v: number
  from?: number
  to?: number
}

// A thin panel line running along a side face.
const PanelLine = ({ slab, side, v, from = 0.14, to = 0.86 }: PanelLineProps) => {
  // Vars
  const [x1, y1] = facePoint(slab, side, from, v)
  const [x2, y2] = facePoint(slab, side, to, v)

  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke='#2A2F2C' strokeWidth='0.9' opacity='0.55' />
}

type FastenerProps = { slab: SlabType; x: number; y: number }

// A round fastener sunk into a top face, laid in the plane.
const Fastener = ({ slab, x, y }: FastenerProps) => {
  // Vars
  const [px, py] = project(x, y, CX, slab.top)

  return (
    <g transform={`translate(${px.toFixed(2)} ${py.toFixed(2)}) matrix(${FACE_MATRIX.top} 0 0)`}>
      <circle r='6.5' fill='url(#n3-hole)' stroke='#313734' strokeWidth='1' />
    </g>
  )
}

const SlabBody = ({ slab }: { slab: SlabType }) => {
  return (
    <g>
      <path d={bodyPath(slab)} fill='url(#n3-side)' />
      <path d={bodyPath(slab)} fill='url(#n3-side-shade)' />
      <path d={bodyPath(slab)} fill='none' stroke='#323936' strokeWidth='1' opacity='0.85' />
    </g>
  )
}

const SlabTop = ({ slab, groove }: { slab: SlabType; groove?: number }) => {
  return (
    <g>
      <path d={topPath(slab)} fill='url(#n3-bevel)' stroke='#353C39' strokeWidth='1' />
      <path d={topPath(slab, 4.5)} fill='url(#n3-top)' stroke='#404542' strokeWidth='1' opacity='1' />
      {groove !== undefined && <path d={topPath(slab, groove)} fill='none' stroke='#353C38' strokeWidth='1.2' />}
    </g>
  )
}

// Side colours of the mark's extrusion, bottom layer first: darker where it meets the plate.
const LOGO_SIDE = ['#96A053', '#A0AB5D', '#A7B069', '#ACB472', '#B1BA77', '#B6BF7C']
const LOGO_SCALE = 1.42

/**
 * The mark as a small solid object standing on a top face at (x, y): a stepped extrusion, a top
 * face lit from the upper left with a fine bright rim, and a soft neutral contact shadow. No glow,
 * so the mark stays crisp.
 */
const CoreLogo = ({ x, y }: { x: number; y: number }) => {
  // Vars
  const plane = (lift: number) => `translate(${x} ${y - lift}) matrix(${FACE_MATRIX.top} 0 0) scale(${LOGO_SCALE})`
  const top = LOGO_SIDE.length

  return (
    <g>
      <g transform={`${plane(0)} translate(2.4 2.4)`} opacity='0.22' filter='url(#n3-blur-sm)'>
        <MarkR color='#000000' />
      </g>
      {LOGO_SIDE.map((fill, k) => (
        <g key={fill} transform={plane(k)}>
          <MarkR color={fill} />
        </g>
      ))}
      <g transform={plane(top)}>
        <MarkR color='#F1F3E2' />
        <MarkR color='url(#n3-logo-top)' width={5.3} />
      </g>
    </g>
  )
}

const CoreDefs = () => {
  return (
    <defs>
      <linearGradient id='n3-side' x1='0' y1='0' x2='1' y2='0'>
        <stop offset='0' stopColor='#3B423F' />
        <stop offset='0.46' stopColor='#38403C' />
        <stop offset='0.5' stopColor='#353C38' />
        <stop offset='1' stopColor='#373E3A' />
      </linearGradient>
      <linearGradient id='n3-side-shade' x1='0' y1='0' x2='0' y2='1'>
        <stop offset='0.45' stopColor='#202422' stopOpacity='0' />
        <stop offset='1' stopColor='#202422' stopOpacity='0.16' />
      </linearGradient>
      <linearGradient id='n3-bevel' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stopColor='#404542' />
        <stop offset='1' stopColor='#383F3B' />
      </linearGradient>
      <linearGradient id='n3-top' x1='0.1' y1='0' x2='0.9' y2='1'>
        <stop offset='0' stopColor='#404542' />
        <stop offset='1' stopColor='#3B423E' />
      </linearGradient>
      <linearGradient id='n3-inlay' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stopColor='#3A413D' />
        <stop offset='1' stopColor='#404542' />
      </linearGradient>
      <linearGradient id='n3-seam' x1='0' y1='0' x2='1' y2='0'>
        <stop offset='0' stopColor='#ECEFD8' />
        <stop offset='0.5' stopColor={ORANGE} />
        <stop offset='1' stopColor='#DCE1B6' />
      </linearGradient>
      <linearGradient id='n3-slot' x1='0' y1='0' x2='0' y2='1'>
        <stop offset='0' stopColor='#1A1E1C' />
        <stop offset='1' stopColor='#242927' />
      </linearGradient>
      <linearGradient id='n3-logo-top' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stopColor='#E0E5BF' />
        <stop offset='0.55' stopColor='#CCD496' />
        <stop offset='1' stopColor='#C1CB80' />
      </linearGradient>
      <radialGradient id='n3-hole' cx='0.5' cy='0.4' r='0.7'>
        <stop offset='0' stopColor='#353B38' />
        <stop offset='1' stopColor='#3B423F' />
      </radialGradient>
      <filter id='n3-blur-sm' x='-40%' y='-40%' width='180%' height='180%'>
        <feGaussianBlur stdDeviation='3.5' />
      </filter>
      <filter id='n3-blur-glow' x='-40%' y='-40%' width='180%' height='180%'>
        <feGaussianBlur stdDeviation='9' />
      </filter>
      <filter id='n3-blur-spill' x='-40%' y='-40%' width='180%' height='180%'>
        <feGaussianBlur stdDeviation='18' />
      </filter>
    </defs>
  )
}

// ───── assets/motionuikit/svg/syntra-core-object.tsx ─────
const ORANGE2 = '#C5CF88'

/**
 * The core at rest: three ceramic slabs (base, mid, cap), each a rounded square laid in an isometric
 * plane, with a light seam between the base and mid slabs and the mark inlaid on the cap.
 */
const SyntraCoreObject = (props: SVGProps< SVGSVGElement>) => {
  // Vars
  const seam: SlabType = {
    half: MID.half - 2,
    radius: MID.radius - 2,
    top: MID.top + MID.depth - 1,
    depth: SEAM_GAP + 1
  }

  const spillDy = BASE.top - MID.top
  const [logoX, logoY] = [CX, CAP.top]

  return (
    <svg viewBox='0 0 1000 1000' role='img' aria-label='A stacked enclosure with an R monogram on its lid' {...props}>
      <CoreDefs />

      {/* Base slab, a tray the others sit in. */}
      <SlabBody slab={BASE} />
      <SlabTop slab={BASE} groove={10} />
      <PanelLine slab={BASE} side='left' v={0.3} />
      <PanelLine slab={BASE} side='right' v={0.3} />
      <FaceMark slab={BASE} side='right' u={0.5} v={0.62} w={4.5} h={4.5} fill='url(#n3-slot)' />
      <FaceMark slab={BASE} side='right' u={0.58} v={0.62} w={4.5} h={4.5} fill='url(#n3-slot)' />
      <FaceMark slab={BASE} side='right' u={0.66} v={0.62} w={4.5} h={4.5} fill='url(#n3-slot)' />
      <FaceMark slab={BASE} side='left' u={0.32} v={0.62} w={4.5} h={4.5} fill='url(#n3-slot)' />
      <FaceMark slab={BASE} side='left' u={0.4} v={0.62} w={4.5} h={4.5} fill='url(#n3-slot)' />

      {/* Light from the seam spills onto the tray and out along its own edge. */}
      <g className='n3-seam-pulse'>
        <path d={topPath(MID, 4, CX, spillDy)} fill={ORANGE2} opacity='0.24' filter='url(#n3-blur-spill)' />
        <path d={bodyPath(seam)} fill={ORANGE2} opacity='0.6' filter='url(#n3-blur-glow)' />
      </g>
      <path d={bodyPath(seam)} fill='url(#n3-seam)' />

      {/* Mid slab. */}
      <SlabBody slab={MID} />
      <SlabTop slab={MID} groove={11} />
      <PanelLine slab={MID} side='left' v={0.78} />
      <PanelLine slab={MID} side='right' v={0.78} />
      <FaceMark slab={MID} side='left' u={0.62} v={0.42} w={34} h={7.5} fill='url(#n3-slot)' />
      <FaceMark slab={MID} side='left' u={0.34} v={0.42} w={5} h={5} fill='url(#n3-slot)' />
      <FaceMark slab={MID} side='left' u={0.42} v={0.42} w={5} h={5} fill='url(#n3-slot)' />
      <FaceMark slab={MID} side='right' u={0.44} v={0.42} w={5} h={5} fill='url(#n3-slot)' />
      <FaceMark slab={MID} side='right' u={0.52} v={0.42} w={5} h={5} fill='url(#n3-slot)' />
      <FaceMark slab={MID} side='right' u={0.68} v={0.42} w={22} h={4.5} fill='url(#n3-slot)' />
      <g className='n3-seam-pulse'>
        <FaceMark slab={MID} side='left' u={0.2} v={0.42} w={7} h={2.6} fill={ORANGE2} glow />
      </g>

      <Fastener slab={MID} x={0} y={-MID.half + 28} />
      <Fastener slab={MID} x={-MID.half + 28} y={0} />
      <Fastener slab={MID} x={MID.half - 28} y={0} />
      <Fastener slab={MID} x={0} y={MID.half - 28} />

      {/* Cap slab and its inlaid mark. */}
      <SlabBody slab={CAP} />
      <SlabTop slab={CAP} />
      <path d={topPath(CAP, 19)} fill='url(#n3-inlay)' stroke='#363D39' strokeWidth='1.2' />
      <path d={topPath(CAP, 20.5)} fill='none' stroke='#404542' strokeWidth='1' opacity='0.9' />

      <CoreLogo x={logoX} y={logoY} />
    </svg>
  )
}

// ───── assets/motionuikit/svg/syntra-core-shadow.tsx ─────
// The soft contact shadow under the core, laid on the floor plane below the base slab.
const SyntraCoreShadow = (props: SVGProps< SVGSVGElement>) => {
  // Vars
  const floor = { ...BASE, top: BASE.top + BASE.depth + 30 }

  return (
    <svg viewBox='0 0 1000 1000' aria-hidden {...props}>
      <defs>
        <filter id='n3-blur-lg' x='-30%' y='-30%' width='160%' height='160%'>
          <feGaussianBlur stdDeviation='26' />
        </filter>
        <filter id='n3-blur-md' x='-30%' y='-30%' width='160%' height='160%'>
          <feGaussianBlur stdDeviation='9' />
        </filter>
      </defs>
      <path d={topPath(floor, -14)} fill='#000000' opacity='0.2' filter='url(#n3-blur-lg)' />
      <path d={topPath(floor, 6)} fill='#000000' opacity='0.22' filter='url(#n3-blur-md)' />
    </svg>
  )
}

// ───── assets/motionuikit/svg/syntra-depth-backdrop.tsx ─────
/**
 * Layers of quiet depth behind the stack: two panes of glass
 * standing behind, and a few loose nodes. All of it very low contrast.
 */
const NODES: [number, number][] = [
  [118, 132],
  [318, 82],
  [690, 96],
  [884, 188],
  [936, 470],
  [70, 512],
  [150, 858],
  [850, 846]
]

const SyntraDepthBackdrop = (props: SVGProps< SVGSVGElement>) => {
  return (
    <svg viewBox='0 0 1000 1000' aria-hidden {...props}>
      <defs>
        <linearGradient id='n3-glass' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0' stopColor='#404542' stopOpacity='0.7' />
          <stop offset='1' stopColor='#404542' stopOpacity='0.12' />
        </linearGradient>
      </defs>

      <g fill='url(#n3-glass)' stroke='#373E3B' strokeWidth='1' opacity='0.35'>
        <rect width='290' height='250' rx='22' transform='matrix(0.866 -0.5 0 1 232 300)' />
        <rect width='290' height='250' rx='22' transform='matrix(0.866 0.5 0 1 520 150)' />
      </g>

      <g fill='#404542' stroke='#323936' strokeWidth='1'>
        {NODES.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 4 : 3} opacity='0.85' />
        ))}
      </g>
    </svg>
  )
}

// ───── components/motionuikit/sections/syntra/config.ts ─────
// The dials: everything a designer is likely to tune lives here, in plain units.

const EASE = [0.22, 1, 0.36, 1] as const


const MOTION = {
  // Vertical drift of the core, in px of the 1000-unit artboard. Larger = more bob.
  floatDistance: 10,

  // Seconds for one float cycle. Larger = calmer.
  floatSeconds: 6.5,

  // Maximum tilt of the core toward the cursor, in degrees. Keep under ~4.
  tiltDegrees: 3.5,

  // How far the rings and dots slide against the core, in px. 0 = no depth.
  ringParallax: 12,
  backdropParallax: 5,

  // Seconds for one lap of the inner (clockwise) and outer (counter-clockwise) orbit. Larger = stiller.
  orbitSeconds: [70, 95],

  // How visible the orbits and their beads stay while the stack is open. 0 = gone, 1 = unchanged.
  orbitOpenOpacity: 0.15
}

const ARTBOARD = 1000

/**
 * The exploded view, bottom to top: from the circuit board up to the browser. Each stage names its icon
 * and its tools. Every tool is copied word for word from the skill list (skills in src/pages/Home.tsx),
 * so the stack never claims a skill that list does not; change both together.
 */
const STAGES = [
  {
    title: 'Circuit boards',
    tools: ['PCB design', 'Sensors & actuators', 'KiCad'],
    icon: 'board',
    side: 'right'
  },
  {
    title: 'Firmware',
    tools: ['STM32', 'ESP32', 'Arduino', 'C/C++'],
    icon: 'firmware',
    side: 'left'
  },
  {
    title: 'Robotics',
    tools: ['ROS 2', 'NVIDIA Jetson', 'Python'],
    side: 'right',
    main: true
  },
  {
    title: 'Data links',
    tools: ['MQTT', 'Supabase', 'PostgreSQL'],
    icon: 'link',
    side: 'left'
  },
  {
    title: 'Web interfaces',
    tools: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS'],
    icon: 'screen',
    side: 'right'
  }
] as const

type Stage = (typeof STAGES)[number]

// The AI layer is the main one: its card carries a "Main layer" tag and its apps on a row of their own.
const isMain = (stage: Stage) => 'main' in stage && stage.main

const EXPLODE = {
  // Spring that drives the whole reveal. Lower stiffness = slower, softer; higher damping = less settle.
  spring: { stiffness: 105, damping: 25, mass: 1 },

  // Distance between neighbouring plates once apart, in artboard units. Larger = a taller stack.
  gap: 94,

  // How far the AI plate rides above the rest of the stack, in artboard units.
  aiLift: 12,

  // Height of the top plate's face when apart. Raise to move the whole stack down.
  topPlateY: 230,

  // Later plates start a beat behind the AI plate. 0 = all move together; ~0.1 = a clear ripple.
  stagger: 0.05,

  /**
   * Size of each plate when apart, bottom to top, as a fraction of its stacked size.
   * Chosen so every plate's corner sits about the same distance from the centre, which gives
   * every card-to-plate connector the same length. Kept under 1 at the bottom so they clear the cards.
   */
  scales: [0.63, 0.62, 0.7, 1.07, 1.06]
}

/**
 * The stage cards, positioned in percentages of the visual's width per side. The inner edge
 * (edge + width) must clear the opened plates' corners (see EXPLODE.scales); a negative edge
 * overhangs the visual, which only the left side has room for, so it holds the longest title.
 */
const STAGE_CARDS = {
  left: { edge: -2, width: 31 },
  right: { edge: 0, width: 29 },

  /**
   * Cards only show while the stack is open. They start this many px toward the core and ease
   * out to this many px past their spot.
   */
  restInset: 10,
  outward: 2,

  // Seconds for a bead to run from a card to its plate while the stack is open.
  beadSeconds: 1.6
}

// ───── components/motionuikit/sections/syntra/explode-layout.ts ─────
/**
 * The five plates, one per stage, bottom to top, cut from the three stacked slabs so that,
 * together, they are the resting object exactly: the base is two plates, the mid slab is the AI
 * plate, the cap is two.
 */
const PLATE_SLABS: SlabType[] = [
  { ...BASE, top: BASE.top + 17, depth: 17 },
  { ...BASE, top: BASE.top, depth: 17 },
  MID,
  { ...CAP, top: CAP.top + 7, depth: 7 },
  { ...CAP, top: CAP.top, depth: 7 }
]

const AI_PLATE = 2

// Where each plate's top face sits once apart, and how far it travels to get there.
const TARGET_TOPS = PLATE_SLABS.map(
  (_, i) => EXPLODE.topPlateY + (PLATE_SLABS.length - 1 - i) * EXPLODE.gap - (i === AI_PLATE ? EXPLODE.aiLift : 0)
)

const TRAVEL = PLATE_SLABS.map((slab, i) => TARGET_TOPS[i] - slab.top)

const clamp = (v: number) => Math.min(1, Math.max(0, v))

// Progress of one plate, 0 stacked to 1 apart. The AI plate leads; the rest follow at a stagger.
const plateProgress = (i: number, p: number) => {
  const delay = Math.abs(i - AI_PLATE) * EXPLODE.stagger

  return clamp((p - delay) / (1 - delay))
}

const plateY = (i: number, p: number) => TRAVEL[i] * plateProgress(i, p)
const plateScale = (i: number, p: number) => 1 + (EXPLODE.scales[i] - 1) * plateProgress(i, p)

// Screen x of a plate's left/right corner tip once apart (rounded corners pull the tip in).
const tipOffset = (i: number) => {
  const { half, radius } = PLATE_SLABS[i]

  return 0.866 * (2 * half - 0.586 * radius) * EXPLODE.scales[i]
}

const tipX = (i: number, side: 'left' | 'right') => CX + (side === 'right' ? 1 : -1) * tipOffset(i)

// Screen y of the side corners (half way down the plate) once apart.
const cornerY = (i: number) => TARGET_TOPS[i] + PLATE_SLABS[i].depth / 2

// ───── assets/motionuikit/svg/syntra-exploded-core.tsx ─────

const ORANGE3 = '#C5CF88'

const clamp2 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * Extra side thickness each plate grows once it is apart, bottom to top. The thin cap plates gain
 * the most; at rest it is zero, so the stack still matches the resting object exactly.
 */
const SKIRT = [0, 4, 0, 10, 10]

type PlateProps = {
  index: number
  progress: MotionValue< number>
  children: ReactNode
}

const Plate = ({ index, progress, children }: PlateProps) => {
  // Hooks
  const y = useTransform(progress, v => plateY(index, v))
  const scale = useTransform(progress, v => plateScale(index, v))
  const apart = useTransform(progress, v => plateProgress(index, v))
  const shadow = useTransform(apart, v => v * 0.16)

  // Vars
  const slab = PLATE_SLABS[index]
  const skirt = SKIRT[index]

  return (
    <m.g style={{ y, scale }}>
      {/* A soft shadow the plate casts on the one below it as they part. */}
      {index > 0 && (
        <m.path
          d={topPath(slab, -6, CX, slab.depth + 34)}
          fill='#000000'
          filter='url(#n3-blur-spill)'
          style={{ opacity: shadow }}
        />
      )}
      {skirt > 0 && (
        <m.g style={{ opacity: apart }}>
          <SlabBody slab={{ ...slab, top: slab.top + slab.depth - 1, depth: skirt + 1 }} />
        </m.g>
      )}
      {children}
    </m.g>
  )
}

type PlateNumberProps = { slab: SlabType; n: number; main?: boolean }

/**
 * The stage number engraved into a plate's top face near its front corner, laid flat in the
 * surface so it reads as part of the ceramic: a soft groove with light catching its lower lip.
 */
const PlateNumber = ({ slab, n, main = false }: PlateNumberProps) => {
  // Vars
  const k = slab.half * 0.56
  const [x, y] = project(k, k, CX, slab.top)
  const plane = `matrix(${FACE_MATRIX.top} 0 0) rotate(-45)`
  const label = String(n).padStart(2, '0')

  const text = {
    textAnchor: 'middle' as const,
    dominantBaseline: 'central' as const,
    fontSize: 25,
    fontWeight: 500,
    letterSpacing: 2.5
  }

  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`} aria-hidden>
      <text {...text} transform={`translate(0 0.9) ${plane}`} fill='#404542' opacity='0.95'>
        {label}
      </text>
      <text {...text} transform={plane} fill={main ? '#D0D79E' : '#313835'}>
        {label}
      </text>
    </g>
  )
}

// A little light coming up on the AI plate: a ring and core in its plane.
const AiEmphasis = ({ progress }: { progress: MotionValue< number> }) => {
  // Hooks
  const on = useTransform(progress, v => clamp2((v - 0.5) / 0.4))
  const rim = useTransform(on, v => v * 0.9)
  const halo = useTransform(on, v => v * 0.55)
  const spill = useTransform(halo, v => v * 0.35)

  return (
    <g transform={`translate(${CX} ${MID.top}) matrix(${FACE_MATRIX.top} 0 0)`}>
      <m.circle r='86' fill={ORANGE3} filter='url(#n3-blur-spill)' style={{ opacity: spill }} />
      <m.circle r='56' fill='none' stroke={ORANGE3} strokeWidth='1.4' style={{ opacity: rim }} />
      <m.circle r='38' fill='none' stroke={ORANGE3} strokeWidth='1' strokeDasharray='3 6' style={{ opacity: halo }} />
      <m.circle r='9' fill={ORANGE3} style={{ opacity: rim }} />
    </g>
  )
}

type SyntraExplodedCoreProps = SVGProps< SVGSVGElement> & { progress: MotionValue< number> }

/**
 * The core taken apart into its five stage plates, driven by `progress`. The AI plate's underglow
 * strengthens as the stack opens, on top of the resting glow.
 */
const SyntraExplodedCore = ({ progress, ...props }: SyntraExplodedCoreProps) => {
  // Hooks
  const strongGlow = useTransform(progress, v => clamp2((v - 0.4) / 0.5) * 0.6)

  // Vars
  const seam = { half: MID.half - 2, radius: MID.radius - 2, top: MID.top + MID.depth - 1, depth: SEAM_GAP + 1 }

  const inlay = (slab: (typeof PLATE_SLABS)[number]) => (
    <>
      <path d={topPath(slab, 19)} fill='url(#n3-inlay)' stroke='#363D39' strokeWidth='1.2' />
      <path d={topPath(slab, 20.5)} fill='none' stroke='#404542' strokeWidth='1' opacity='0.9' />
    </>
  )

  return (
    <svg viewBox='0 0 1000 1000' aria-hidden {...props}>
      <CoreDefs />

      <Plate index={0} progress={progress}>
        <SlabBody slab={PLATE_SLABS[0]} />
        <SlabTop slab={PLATE_SLABS[0]} groove={10} />
        <PlateNumber slab={PLATE_SLABS[0]} n={1} />
        <FaceMark slab={BASE} side='right' u={0.5} v={0.62} w={4.5} h={4.5} fill='url(#n3-slot)' />
        <FaceMark slab={BASE} side='right' u={0.58} v={0.62} w={4.5} h={4.5} fill='url(#n3-slot)' />
        <FaceMark slab={BASE} side='right' u={0.66} v={0.62} w={4.5} h={4.5} fill='url(#n3-slot)' />
        <FaceMark slab={BASE} side='left' u={0.32} v={0.62} w={4.5} h={4.5} fill='url(#n3-slot)' />
        <FaceMark slab={BASE} side='left' u={0.4} v={0.62} w={4.5} h={4.5} fill='url(#n3-slot)' />
      </Plate>

      <Plate index={1} progress={progress}>
        <SlabBody slab={PLATE_SLABS[1]} />
        <SlabTop slab={PLATE_SLABS[1]} groove={10} />
        <PlateNumber slab={PLATE_SLABS[1]} n={2} />
        <PanelLine slab={BASE} side='left' v={0.3} />
        <PanelLine slab={BASE} side='right' v={0.3} />
      </Plate>

      <Plate index={AI_PLATE} progress={progress}>
        <g className='n3-seam-pulse'>
          <path d={topPath(MID, 4, CX, BASE.top - MID.top)} fill={ORANGE3} opacity='0.24' filter='url(#n3-blur-spill)' />
          <path d={bodyPath(seam)} fill={ORANGE3} opacity='0.6' filter='url(#n3-blur-glow)' />
        </g>
        <m.path d={bodyPath(seam)} fill={ORANGE3} filter='url(#n3-blur-glow)' style={{ opacity: strongGlow }} />
        <path d={bodyPath(seam)} fill='url(#n3-seam)' />
        <SlabBody slab={MID} />
        <SlabTop slab={MID} groove={11} />
        <PlateNumber slab={MID} n={3} main />
        <PanelLine slab={MID} side='left' v={0.78} />
        <PanelLine slab={MID} side='right' v={0.78} />
        <FaceMark slab={MID} side='left' u={0.62} v={0.42} w={34} h={7.5} fill='url(#n3-slot)' />
        <FaceMark slab={MID} side='left' u={0.34} v={0.42} w={5} h={5} fill='url(#n3-slot)' />
        <FaceMark slab={MID} side='left' u={0.42} v={0.42} w={5} h={5} fill='url(#n3-slot)' />
        <FaceMark slab={MID} side='right' u={0.44} v={0.42} w={5} h={5} fill='url(#n3-slot)' />
        <FaceMark slab={MID} side='right' u={0.52} v={0.42} w={5} h={5} fill='url(#n3-slot)' />
        <FaceMark slab={MID} side='right' u={0.68} v={0.42} w={22} h={4.5} fill='url(#n3-slot)' />
        <g className='n3-seam-pulse'>
          <FaceMark slab={MID} side='left' u={0.2} v={0.42} w={7} h={2.6} fill={ORANGE3} glow />
        </g>
        <Fastener slab={MID} x={0} y={-MID.half + 28} />
        <Fastener slab={MID} x={-MID.half + 28} y={0} />
        <Fastener slab={MID} x={MID.half - 28} y={0} />
        <Fastener slab={MID} x={0} y={MID.half - 28} />
        <AiEmphasis progress={progress} />
      </Plate>

      <Plate index={3} progress={progress}>
        <SlabBody slab={PLATE_SLABS[3]} />
        <SlabTop slab={PLATE_SLABS[3]} />
        {inlay(PLATE_SLABS[3])}
        <PlateNumber slab={PLATE_SLABS[3]} n={4} />
      </Plate>

      <Plate index={4} progress={progress}>
        <SlabBody slab={PLATE_SLABS[4]} />
        <SlabTop slab={PLATE_SLABS[4]} />
        {inlay(CAP)}
        <CoreLogo x={CX} y={CAP.top} />
      </Plate>
    </svg>
  )
}

// ───── assets/motionuikit/svg/syntra-orbital-system.tsx ─────
// Two orbits around the core. Their nodes ride them in opposite directions (see syntra-particles).
const SyntraOrbitalSystem = (props: SVGProps< SVGSVGElement>) => {
  return (
    <svg viewBox='0 0 1000 1000' aria-hidden {...props}>
      <g fill='none' stroke='#353C39' strokeWidth='1'>
        <ellipse cx={CX} cy={CY} rx={RING_RX[0]} ry={RING_RX[0] * RING_FLATTEN} opacity='0.8' />
        <ellipse cx={CX} cy={CY} rx={RING_RX[1]} ry={RING_RX[1] * RING_FLATTEN} opacity='0.65' />
      </g>
    </svg>
  )
}

// ───── assets/motionuikit/svg/syntra-particles.tsx ─────
type NodeType = { ring: 0 | 1; angle: number; size: number }

/**
 * Small crystal beads spaced evenly around each orbit: four on the inner, five on the outer. Every
 * bead on an orbit shares its lap time, so they keep their spacing; the inner orbit runs
 * clockwise and the outer one against it.
 */
const NODES2: NodeType[] = [
  { ring: 0, angle: 20, size: 7 },
  { ring: 0, angle: 110, size: 5.5 },
  { ring: 0, angle: 200, size: 8 },
  { ring: 0, angle: 290, size: 6 },
  { ring: 1, angle: 60, size: 6 },
  { ring: 1, angle: 132, size: 8 },
  { ring: 1, angle: 204, size: 5.5 },
  { ring: 1, angle: 276, size: 7 },
  { ring: 1, angle: 348, size: 6.5 }
]

/**
 * A small sphere of amber glass: light at the upper left deepening to orange at the lower right,
 * a rim that is bright on top and darker below, a crisp specular highlight, and light gathered
 * at the bottom where it passes through the glass.
 */
const Crystal = ({ size }: { size: number }) => {
  return (
    <g filter='url(#n3-crystal-shadow)'>
      <circle r={size * 1.55} fill='url(#n3-crystal-halo)' />
      <circle r={size} fill='url(#n3-crystal-body)' />
      <circle r={size} fill='url(#n3-crystal-refract)' />
      <circle r={size - 0.5} fill='none' stroke='url(#n3-crystal-rim)' strokeWidth='1' />
      <ellipse
        cx={-size * 0.32}
        cy={-size * 0.4}
        rx={size * 0.36}
        ry={size * 0.2}
        transform={`rotate(-30 ${-size * 0.32} ${-size * 0.4})`}
        fill='#404542'
        opacity='0.95'
      />
      <circle cx={size * 0.34} cy={-size * 0.5} r={Math.max(0.7, size * 0.07)} fill='#404542' opacity='0.85' />
    </g>
  )
}

/**
 * The nodes are drawn twice, once behind the core and once in front, each clipped to its half of
 * the artboard, so a node passing the back of an orbit slips behind the object instead of over it.
 * `paused` freezes the beads where they are; they carry on from there when it clears.
 */
type SyntraParticlesProps = SVGProps< SVGSVGElement> & { half: 'back' | 'front'; animate: boolean; paused?: boolean }

const SyntraParticles = ({ half, animate, paused = false, ...props }: SyntraParticlesProps) => {
  // Refs
  const ref = useRef< SVGSVGElement>(null)

  // Vars
  const clipId = `n3-clip-${half}`

  // The beads run on this SVG's own animation clock, so pausing the clock stops them all at once.
  useEffect(() => {
    const svg = ref.current

    if (!svg) return

    if (paused) svg.pauseAnimations()
    else svg.unpauseAnimations()
  }, [paused])

  return (
    <svg ref={ref} viewBox='0 0 1000 1000' aria-hidden {...props}>
      <defs>
        <clipPath id={clipId}>
          {half === 'back' ? (
            <rect x='-200' y='-200' width='1400' height={CY + 200} />
          ) : (
            <rect x='-200' y={CY} width='1400' height='700' />
          )}
        </clipPath>
        <linearGradient id='n3-crystal-body' x1='0.15' y1='0.1' x2='0.85' y2='0.95'>
          <stop offset='0' stopColor='#F1F3E2' stopOpacity='0.9' />
          <stop offset='0.5' stopColor='#DBE1B5' stopOpacity='0.88' />
          <stop offset='1' stopColor='#B8C278' stopOpacity='0.95' />
        </linearGradient>
        <radialGradient id='n3-crystal-refract' cx='0.6' cy='0.78' r='0.45'>
          <stop offset='0' stopColor='#F1F3E2' stopOpacity='0.85' />
          <stop offset='1' stopColor='#F1F3E2' stopOpacity='0' />
        </radialGradient>
        <linearGradient id='n3-crystal-rim' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stopColor='#404542' stopOpacity='0.95' />
          <stop offset='1' stopColor='#A2AE56' stopOpacity='0.55' />
        </linearGradient>
        <radialGradient id='n3-crystal-halo' cx='0.5' cy='0.5' r='0.5'>
          <stop offset='0.5' stopColor='#C5CF88' stopOpacity='0.12' />
          <stop offset='1' stopColor='#C5CF88' stopOpacity='0' />
        </radialGradient>
        <filter id='n3-crystal-shadow' x='-80%' y='-80%' width='260%' height='260%'>
          <feDropShadow dx='0' dy='2.5' stdDeviation='2.5' floodColor='#889051' floodOpacity='0.25' />
        </filter>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {NODES2.map((node, i) => {
          const rx = RING_RX[node.ring]
          const [x, y] = ringPoint(rx, node.angle)
          const dur = MOTION.orbitSeconds[node.ring]
          const reverse = node.ring === 1

          // The ring path starts at angle 0 and runs clockwise; a reversed lap starts from the far end.
          const start = node.angle / 360
          const begin = -dur * (reverse ? 1 - start : start)

          return (
            <g key={i} transform={animate ? undefined : `translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
              <Crystal size={node.size} />
              {animate && (
                <animateMotion
                  dur={`${dur}s`}
                  begin={`${begin}s`}
                  repeatCount='indefinite'
                  path={ringPath(rx)}
                  {...(reverse && { keyPoints: '1;0', keyTimes: '0;1', calcMode: 'linear' })}
                />
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}

// ───── assets/motionuikit/svg/syntra-technical-backdrop.tsx ─────
/**
 * Construction geometry behind the core: quiet enough that the eye only finds it on a second look.
 * Deterministic scatter, so server and client render the same dots.
 */
const DOTS = Array.from({ length: 26 }, (_, i) => {
  const a = (i * 137.5 * Math.PI) / 180
  const r = 160 + ((i * 53) % 340)

  return [
    round(CX + r * Math.cos(a) * 1.02),
    round(CY + r * Math.sin(a) * RING_FLATTEN * 1.6),
    0.8 + (i % 3) * 0.5
  ] as const
})

const SyntraTechnicalBackdrop = (props: SVGProps< SVGSVGElement>) => {
  return (
    <svg viewBox='0 0 1000 1000' aria-hidden {...props}>
      <defs>
        <linearGradient id='n3-axis-v' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stopColor='#313834' stopOpacity='0' />
          <stop offset='0.5' stopColor='#313834' stopOpacity='0.45' />
          <stop offset='1' stopColor='#313834' stopOpacity='0' />
        </linearGradient>
        <linearGradient id='n3-axis-h' x1='0' y1='0' x2='1' y2='0'>
          <stop offset='0' stopColor='#313834' stopOpacity='0' />
          <stop offset='0.5' stopColor='#313834' stopOpacity='0.7' />
          <stop offset='1' stopColor='#313834' stopOpacity='0' />
        </linearGradient>
      </defs>

      <rect x={CX - 0.5} y='110' width='1' height='780' fill='url(#n3-axis-v)' />
      <rect x='70' y={CY - 0.5} width='860' height='1' fill='url(#n3-axis-h)' />

      <g fill='#313834'>
        {DOTS.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} opacity={0.35 + (i % 4) * 0.12} />
        ))}
      </g>

      <g stroke='#313834' strokeWidth='1' opacity='0.5'>
        {(
          [
            [212, 292],
            [790, 690],
            [860, 430],
            [150, 560]
          ] as const
        ).map(([x, y]) => (
          <path key={`${x}-${y}`} d={`M${x - 5} ${y}h10M${x} ${y - 5}v10`} />
        ))}
      </g>
    </svg>
  )
}

// ───── stage card body ─────
// The small signal-green mark under each stage number.
const STAGE_ICONS = {
  board: CircuitBoard,
  firmware: Cpu,
  link: Cable,
  screen: AppWindow
}

/**
 * Number and stage icon each centred in a box one line tall, so they line up with their text; under the
 * title, the skills that layer is built with. The main layer swaps its icon for a "Main layer" tag and
 * sets its skills in the signal colour. Sized in em, so the card scales with its font size.
 */
const StageCardBody = ({ index }: { index: number }) => {
  // Vars
  const stage = STAGES[index]
  const main = isMain(stage)
  const Icon = 'icon' in stage ? STAGE_ICONS[stage.icon] : null

  return (
    <div className='grid grid-cols-[1.35em_minmax(0,1fr)] items-start gap-x-[0.5em]'>
      {/* One title line tall (1.05em type at 1.25 leading), in this span's own 0.8em units. */}
      <span className='text-(color:--color-n3-grey) col-start-1 row-start-1 flex h-[1.64em] items-center font-mono text-[0.8em] tabular-nums'>
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className='col-start-2 row-start-1 flex flex-wrap items-baseline justify-between gap-x-[0.6em]'>
        <p className='text-(color:--color-n3-ink) text-[1.05em] leading-[1.25] font-semibold tracking-[-0.015em] md:whitespace-nowrap'>
          {stage.title}
        </p>
        {main && (
          <span className='text-(color:--color-n3-accent) shrink-0 font-mono text-[0.72em] tracking-[0.12em] uppercase'>
            Main layer
          </span>
        )}
      </div>

      {/* The skills' first line: 0.8em type at 1.45 leading. */}
      {Icon && (
        <span className='col-start-1 row-start-2 mt-[0.4em] flex h-[1.16em] items-center'>
          <Icon className='text-(color:--color-n3-accent) size-[1.15em]' strokeWidth={1.7} aria-hidden />
        </span>
      )}
      {/* Text, not chips: chips wrap to several rows in a narrow card and crowd the next one. */}
      <p
        className={cn(
          'col-start-2 row-start-2 mt-[0.4em] font-mono text-[0.8em] leading-[1.45]',
          main ? 'text-(color:--color-n3-accent)' : 'text-(color:--color-n3-ink)/80'
        )}
      >
        <span className='sr-only'>Built with </span>
        {stage.tools.join(' · ')}
      </p>
    </div>
  )
}

// ───── components/motionuikit/sections/syntra/stage-cards.tsx ─────

const pct = (n: number) => `${(n / ARTBOARD) * 100}%`

// Cards ease away from the core: left cards to the left, right cards to the right.
const cardDirection = (index: number) => (STAGES[index].side === 'left' ? -1 : 1)

type StageCardProps = {
  index: number
  progress: MotionValue< number>
  open: boolean
  lit: boolean
  onHover: (index: number | null) => void
  onSelect: () => void
}

// One stage card beside its plate. Hidden at rest; it fades in and eases outward as the stack opens.
const StageCard = ({ index, progress, open, lit, onHover, onSelect }: StageCardProps) => {
  // Hooks
  const opacity = useTransform(progress, [0.35, 0.9], [0, 1])

  const x = useTransform(
    progress,
    [0, 1],
    [-cardDirection(index) * STAGE_CARDS.restInset, cardDirection(index) * STAGE_CARDS.outward]
  )

  // Vars
  const stage = STAGES[index]
  const { edge, width } = STAGE_CARDS[stage.side]
  const left = stage.side === 'left' ? edge : 100 - edge - width

  const handlePointerEnter = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse') onHover(index)
  }

  const handlePointerLeave = () => {
    onHover(null)
  }

  return (
    <li
      style={{ top: pct(cornerY(index)), left: `${left}%`, width: `${width}%` }}
      className='absolute -translate-y-1/2'
    >
      <m.div
        style={{ opacity, x }}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        // Pointer only: the core's button is the keyboard route to the same place.
        onClick={onSelect}
        className={cn(
          'n3-stage-card cursor-pointer px-[0.9em] py-[0.85em]',
          open && 'pointer-events-auto',
          lit && 'n3-stage-card-lit'
        )}
      >
        <StageCardBody index={index} />
      </m.div>
    </li>
  )
}

type StageCardsProps = {
  progress: MotionValue< number>
  open: boolean
  hovered: number | null
  onHover: (index: number | null) => void
  onSelect: () => void
}

/**
 * The five stages as floating cards beside their plates, from tablet up. Font size follows the
 * visual's width (cqw), so the cards keep their place against the plates at every size.
 */
const StageCards = ({ progress, open, hovered, onHover, onSelect }: StageCardsProps) => {
  return (
    <ul
      aria-label='What I build, from circuit board to browser'
      aria-hidden={!open}
      className='pointer-events-none absolute inset-0 m-0 hidden list-none p-0 text-[clamp(0.625rem,1.7cqw,0.9375rem)] md:block'
    >
      {STAGES.map((stage, i) => (
        <StageCard
          key={stage.title}
          index={i}
          progress={progress}
          open={open}
          lit={hovered === i}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
    </ul>
  )
}

// ───── assets/motionuikit/svg/syntra-stage-connector.tsx ─────

const ORANGE4 = '#C5CF88'

/**
 * plate: x of the plate's corner tip; card: x of the card's inner edge; y: the line's height.
 * All in artboard units.
 */
type SyntraStageConnectorProps = {
  className?: string
  plate: number
  card: number
  y: number
  side: 'left' | 'right'
  index: number
  main: boolean
  lit: boolean
  active: boolean
  progress: MotionValue< number>
}

// Where the line meets the plate's corner and the card's node, in artboard units.
const lineEnds = (plate: number, card: number, side: 'left' | 'right') => {
  const dir = side === 'right' ? 1 : -1

  return { plateX: plate + dir * 7, nodeX: card - dir * 10 }
}

// Card → orange node → hairline → the corner of its plate. A bead runs the line while the stack is open.
const SyntraStageConnector = ({
  plate,
  card,
  y,
  side,
  index,
  main,
  lit,
  active,
  progress,
  className
}: SyntraStageConnectorProps) => {
  // Hooks
  const show = useTransform(progress, [0.55, 0.9], [0, 1])
  const t = useMotionValue(0)

  const beadX = useTransform(t, k => {
    const ends = lineEnds(plate, card, side)

    return ends.nodeX + (ends.plateX - ends.nodeX) * k
  })

  const beadOpacity = useTransform([t, show], ([k, s]: number[]) => s * Math.sin(Math.PI * k))

  // Vars
  const { plateX, nodeX } = lineEnds(plate, card, side)

  useEffect(() => {
    if (!active) return

    const controls = animate(t, [0, 1], {
      duration: STAGE_CARDS.beadSeconds,
      ease: 'easeInOut',
      repeat: Infinity,
      repeatDelay: 1.4,
      delay: 0.5 + index * 0.25
    })

    return () => {
      controls.stop()
      t.set(0)
    }
  }, [active, index, t])

  return (
    <m.svg aria-hidden viewBox={`0 0 ${ARTBOARD} ${ARTBOARD}`} style={{ opacity: show }} className={className}>
      <line x1={plateX} x2={nodeX} y1={y} y2={y} stroke='#323936' strokeWidth='1' />
      <m.line
        x1={plateX}
        x2={nodeX}
        y1={y}
        y2={y}
        stroke={ORANGE4}
        strokeWidth='1.2'
        initial={false}
        animate={{ opacity: lit ? 0.9 : 0 }}
        transition={{ duration: 0.25 }}
      />
      <circle cx={plateX} cy={y} r='2.6' fill='#2A2F2D' />
      <m.circle
        cx={nodeX}
        cy={y}
        r={main ? 10 : 8}
        fill={ORANGE4}
        initial={false}
        animate={{ opacity: lit || main ? 0.22 : 0.12 }}
        transition={{ duration: 0.25 }}
      />
      <circle cx={nodeX} cy={y} r='3.6' fill={ORANGE4} />
      <m.circle cx={beadX} cy={y} r='2.6' fill={ORANGE4} style={{ opacity: beadOpacity }} />
    </m.svg>
  )
}

// ───── components/motionuikit/sections/syntra/stage-connectors.tsx ─────

type StageConnectorsProps = {
  progress: MotionValue< number>
  active: boolean
  hovered: number | null
}

// Hairlines from each card to its plate, from tablet up. They tilt and float with the stack.
const StageConnectors = ({ progress, active, hovered }: StageConnectorsProps) => {
  return (
    <div className='pointer-events-none absolute inset-0 hidden md:block'>
      {STAGES.map((stage, i) => {
        const { edge, width } = STAGE_CARDS[stage.side]
        const cardEdge = stage.side === 'left' ? (edge + width) * 10 : (100 - edge - width) * 10

        return (
          <SyntraStageConnector
            key={stage.title}
            plate={tipX(i, stage.side)}
            card={cardEdge}
            y={cornerY(i)}
            side={stage.side}
            index={i}
            main={isMain(stage)}
            lit={hovered === i}
            active={active}
            progress={progress}
            className='pointer-events-none absolute inset-0 size-full overflow-visible'
          />
        )
      })}
    </div>
  )
}

// ───── components/motionuikit/sections/syntra/stage-list.tsx ─────

// On a phone the visual is too narrow for cards beside it, so they sit below it as a grid.
const StageList = ({ reduce }: { reduce: boolean }) => {
  return (
    <m.ul
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.5, ease: EASE }}
      aria-label='What I build, from circuit board to browser'
      className='m-0 grid list-none grid-cols-1 gap-2.5 p-0 text-[0.8125rem] sm:grid-cols-2 md:hidden'
    >
      {STAGES.map((stage, i) => (
        <li key={stage.title} className='n3-stage-card px-[1.05em] py-[0.95em]'>
          <StageCardBody index={i} />
        </li>
      ))}
    </m.ul>
  )
}

// ───── components/motionuikit/sections/syntra/core-visual.tsx ─────

// Follows the tab being shown or hidden, for useSyncExternalStore
const subscribeToVisibility = (onChange: () => void) => {
  document.addEventListener('visibilitychange', onChange)

  return () => document.removeEventListener('visibilitychange', onChange)
}

const isPageVisible = () => !document.hidden

// The server has no tab to hide, so it renders as shown
const isPageVisibleOnServer = () => true

type ParallaxLayerProps = {
  x: MotionValue< number>
  y: MotionValue< number>
  reach: number
  children: ReactNode
}

// Each layer slides against the pointer by a different amount, which is what reads as depth.
const ParallaxLayer = ({ x, y, reach, children }: ParallaxLayerProps) => {
  // Hooks
  const tx = useTransform(x, v => v * reach)
  const ty = useTransform(y, v => v * reach)

  return (
    <m.div style={{ x: tx, y: ty }} className='pointer-events-none absolute inset-0'>
      {children}
    </m.div>
  )
}

type TiltedProps = {
  rotateX: MotionValue< number>
  rotateY: MotionValue< number>
  children: ReactNode
}

// The tilt toward the cursor and the slow float, shared by every layer that moves with the stack.
const Tilted = ({ rotateX, rotateY, children }: TiltedProps) => {
  return (
    <div className='pointer-events-none absolute inset-0 [perspective:1400px]'>
      <m.div style={{ rotateX, rotateY }} className='absolute inset-0'>
        <div className='n3-float absolute inset-0'>{children}</div>
      </m.div>
    </div>
  )
}

// skillsTarget: a selector for the skill list the stack summarises; choosing the open stack scrolls there.
const CoreVisual = ({ skillsTarget }: { skillsTarget: string }) => {
  // States
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState< number | null>(null)

  // Refs
  const visualRef = useRef< HTMLDivElement>(null)

  // Hooks
  const reduce = useReducedMotion() ?? false

  // The margin covers the outer orbit and its beads running a little past the visual's box
  const onScreen = useInView(visualRef, { initial: true, margin: '40px' })
  const pageVisible = useSyncExternalStore(subscribeToVisibility, isPageVisible, isPageVisibleOnServer)

  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const x = useSpring(px, { stiffness: 55, damping: 18, mass: 0.9 })
  const y = useSpring(py, { stiffness: 55, damping: 18, mass: 0.9 })
  const rotateY = useTransform(x, v => v * MOTION.tiltDegrees)

  // 0 = stacked, 1 = apart. One spring drives the plates, connectors, cards and shadow together.
  const target = useMotionValue(0)
  const progress = useSpring(target, reduce ? { duration: 0.01 } : EXPLODE.spring)

  // While it is open the stack also leans back a little more, which is where the extra depth comes from.
  const rotateX = useTransform([y, progress], ([v, p]: number[]) => v * -MOTION.tiltDegrees + p * 4)
  const restOpacity = useTransform(progress, [0, 0.04], [1, 0])
  const explodedOpacity = useTransform(progress, [0, 0.03], [0, 1])
  const shadowOpacity = useTransform(progress, [0, 1], [1, 0.55])

  // The orbits step back while the stack is open, so the plates and cards have the stage.
  const orbitOpacity = useTransform(progress, [0, 0.6], [1, MOTION.orbitOpenOpacity])

  // Vars

  // The beads hold still while the stack is open, off screen or in a hidden tab; both halves share it, so they stay in step
  const beadsPaused = open || !onScreen || !pageVisible

  useEffect(() => {
    target.set(open ? 1 : 0)
  }, [open, target])

  const handlePointerMove = (e: ReactPointerEvent< HTMLDivElement>) => {
    if (reduce || e.pointerType !== 'mouse') return

    const box = e.currentTarget.getBoundingClientRect()

    px.set(((e.clientX - box.left) / box.width - 0.5) * 2)
    py.set(((e.clientY - box.top) / box.height - 0.5) * 2)
  }

  const handlePointerLeave = () => {
    px.set(0)
    py.set(0)
    setOpen(false)
  }

  // Hovering a card lights its connector and opens the stack, the same as hovering the core.
  const handleCardHover = (index: number | null) => {
    setHovered(index)
    if (index !== null && !reduce) setOpen(true)
  }

  const handleCorePointerEnter = (e: ReactPointerEvent< HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && !reduce) setOpen(true)
  }

  const goToSkills = () => {
    document.querySelector(skillsTarget)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
  }

  // The first press opens the stack, the next goes to the skill list. A mouse has already opened it by
  // hovering, so its click goes straight there; touch and keyboard have no hover, so they open it first.
  const handleCoreClick = () => {
    if (open) goToSkills()
    else setOpen(true)
  }

  const handleCoreBlur = () => {
    setOpen(false)
  }

  return (
    <LazyMotion features={domAnimation}>
      <>
        {/* Fades and scales in with CSS (n3-enter), from the first paint rather than after hydration. */}
        <div
          ref={visualRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className='n3-enter @container relative -my-[6%] -ml-[12.5%] aspect-square w-[125%] max-w-none md:mx-auto md:my-0 md:w-full md:max-w-[52.5rem] lg:mx-auto lg:-my-[4%] lg:w-[min(104%,calc(100svh-2rem))] lg:max-w-none'
        >
          <div className='absolute inset-0'>
            <div aria-hidden className='n3-halo pointer-events-none absolute inset-[6%]' />

            <div className='n3-fade-edge absolute inset-0'>
              <ParallaxLayer x={x} y={y} reach={-MOTION.backdropParallax}>
                <SyntraDepthBackdrop className='absolute inset-0 size-full overflow-visible' />
                <SyntraTechnicalBackdrop className='absolute inset-0 size-full overflow-visible' />
              </ParallaxLayer>
            </div>

            {/**
             * The orbits sit outside the faded layer: the outer ring runs past the visual's box, and a
             * mask would cut it off there.
             */}
            <ParallaxLayer x={x} y={y} reach={MOTION.ringParallax}>
              <m.div style={{ opacity: orbitOpacity }} className='absolute inset-0'>
                <SyntraOrbitalSystem className='absolute inset-0 size-full overflow-visible' />
                <SyntraParticles
                  half='back'
                  animate={!reduce}
                  paused={beadsPaused}
                  className='absolute inset-0 size-full overflow-visible'
                />
              </m.div>
            </ParallaxLayer>

            <m.div style={{ opacity: shadowOpacity }} className='absolute inset-0'>
              <SyntraCoreShadow className='pointer-events-none absolute inset-0 size-full overflow-visible' />
            </m.div>

            <Tilted rotateX={rotateX} rotateY={rotateY}>
              <m.div style={{ opacity: restOpacity }} className='absolute inset-0'>
                <SyntraCoreObject className='absolute inset-0 size-full overflow-visible' />
              </m.div>
              <m.div style={{ opacity: explodedOpacity }} className='absolute inset-0'>
                <SyntraExplodedCore progress={progress} className='absolute inset-0 size-full overflow-visible' />
              </m.div>
              <StageConnectors progress={progress} active={open && !reduce} hovered={hovered} />
            </Tilted>

            <ParallaxLayer x={x} y={y} reach={MOTION.ringParallax}>
              <m.div style={{ opacity: orbitOpacity }} className='absolute inset-0'>
                <SyntraParticles
                  half='front'
                  animate={!reduce}
                  paused={beadsPaused}
                  className='absolute inset-0 size-full overflow-visible'
                />
              </m.div>
            </ParallaxLayer>

            {/* The cards ride the same tilt and float in a layer of their own, above the front orbit. */}
            <Tilted rotateX={rotateX} rotateY={rotateY}>
              <StageCards progress={progress} open={open} hovered={hovered} onHover={handleCardHover} onSelect={goToSkills} />
            </Tilted>
          </div>


          <button
            type='button'
            aria-expanded={open}
            aria-label='What I build, layer by layer: press to open the stack, press again to go to my skills'
            onPointerEnter={handleCorePointerEnter}
            onClick={handleCoreClick}
            onBlur={handleCoreBlur}
            className='focus-visible:outline-(color:--color-n3-accent) absolute top-[30%] left-[22%] h-[44%] w-[56%] cursor-pointer rounded-[3rem] focus-visible:outline-2 focus-visible:outline-offset-4'
          />
        </div>
        <StageList reduce={reduce} />
      </>
    </LazyMotion>
  )
}


// ───── assets/motionuikit/svg/syntra-floor-grid.tsx ─────
// One diamond of the isometric floor: the same 30° axes the core is drawn on, 48px along each edge.
const CELL = { w: 84, h: 48 }

/**
 * The floor grid behind the whole hero, as a repeating pattern. Where it shows is decided by the
 * CSS masks in index.css; see hero-floor.tsx for the two copies (quiet grey, and the orange spotlight).
 */
type SyntraFloorGridProps = SVGProps< SVGSVGElement> & { id: string; stroke?: string; strokeWidth?: number }

const SyntraFloorGrid = ({ id, stroke = '#333A37', strokeWidth = 0.8, ...props }: SyntraFloorGridProps) => {
  return (
    <svg aria-hidden width='100%' height='100%' {...props}>
      <defs>
        <pattern id={id} width={CELL.w} height={CELL.h} patternUnits='userSpaceOnUse'>
          <path
            d={`M0 ${CELL.h / 2}L${CELL.w / 2} 0L${CELL.w} ${CELL.h / 2}M0 ${CELL.h / 2}L${CELL.w / 2} ${CELL.h}L${CELL.w} ${CELL.h / 2}`}
            fill='none'
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </pattern>
      </defs>
      <rect width='100%' height='100%' fill={`url(#${id})`} />
    </svg>
  )
}

// ───── components/motionuikit/sections/syntra/hero-floor.tsx ─────
// Diameter of the cursor spotlight, in px.
const SPOT = 340

/**
 * The floor grid, plus an orange copy seen through a round window that follows the cursor. Window
 * and grid move only by opposite transforms, so nothing repaints and the orbits stay smooth; it
 * listens on the hero section, since the grid sits behind the content and never gets the pointer.
 */
const HeroFloor = () => {
  // Refs
  const ref = useRef< HTMLDivElement>(null)
  const spotRef = useRef< HTMLDivElement>(null)
  const litRef = useRef< HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    const spot = spotRef.current
    const lit = litRef.current
    const section = el?.parentElement

    if (!el || !spot || !lit || !section) return

    // The orange grid matches the section's size, so its pattern lines up with the grey one.
    const resize = new ResizeObserver(([entry]) => {
      lit.style.width = `${entry.contentRect.width}px`
      lit.style.height = `${entry.contentRect.height}px`
    })

    resize.observe(section)

    let frame = 0

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return

      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const box = section.getBoundingClientRect()
        const x = e.clientX - box.left - SPOT / 2
        const y = e.clientY - box.top - SPOT / 2

        spot.style.transform = `translate3d(${x}px, ${y}px, 0)`
        lit.style.transform = `translate3d(${-x}px, ${-y}px, 0)`
        el.dataset.spot = 'on'
      })
    }

    const handlePointerLeave = () => {
      cancelAnimationFrame(frame)
      el.dataset.spot = 'off'
    }

    section.addEventListener('pointermove', handlePointerMove)
    section.addEventListener('pointerleave', handlePointerLeave)

    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      section.removeEventListener('pointermove', handlePointerMove)
      section.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [])

  return (
    <div ref={ref} aria-hidden data-spot='off' className='pointer-events-none absolute inset-0 -z-10 overflow-hidden'>
      <SyntraFloorGrid id='n3-floor-cell' className='n3-floor absolute inset-0' />
      <div ref={spotRef} style={{ width: SPOT, height: SPOT }} className='n3-floor-spot'>
        <div ref={litRef} className='n3-floor-lit'>
          <SyntraFloorGrid id='n3-floor-cell-lit' stroke='#C5CF88' strokeWidth={1} className='block size-full' />
        </div>
      </div>
    </div>
  )
}

// ───── hero ─────
/**
 * The hero breaks out of the page column to the full screen width, so the floor grid runs edge to
 * edge, and keeps its content on the site's 6xl column so it lines up with the header.
 */
const Hero = ({ children, skillsTarget }: { children: ReactNode; skillsTarget: string }) => {
  return (
    <section className='n3-hero n3-bg relative isolate left-1/2 w-screen -translate-x-1/2 overflow-x-clip'>
      <HeroFloor />
      <div className='mx-auto grid max-w-6xl items-center gap-6 px-5 pt-6 pb-12 sm:px-8 lg:min-h-[inherit] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8 lg:py-4'>
        <div className='flex flex-col justify-center'>{children}</div>
        <CoreVisual skillsTarget={skillsTarget} />
      </div>
    </section>
  )
}

// ───── index ─────
const motionVars = {
  '--n3-float': MOTION.floatDistance,
  '--n3-float-seconds': `${MOTION.floatSeconds}s`
} as CSSProperties

/**
 * The home hero: your copy on the left (children), the stack of what you build on the right.
 * skillsTarget is a selector for the full skill list; choosing the open stack, or one of its cards, scrolls there.
 */
const SyntraHero = ({ children, skillsTarget }: { children: ReactNode; skillsTarget: string }) => (
  <>
    <style>{BLOCK_CSS}</style>
    <div style={motionVars} className='n3-root text-(color:--color-n3-ink) w-full'>
      <Hero skillsTarget={skillsTarget}>{children}</Hero>
    </div>
  </>
)

export default SyntraHero
