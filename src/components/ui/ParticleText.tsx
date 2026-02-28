'use client';

import { useEffect, useRef } from 'react';

interface ParticleTextProps {
  formProgress: number; // 0=spiral, 1=letters
  mouseX: number;
  mouseY: number;
  mouseOn: boolean;
}

const NN = 480;

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
function ease(t: number) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

interface NebulaParticle {
  sx: number; sy: number;
  hx: number; hy: number;
  r: number; op: number;
  hue: number; sat: number; baseLight: number;
  twinklePhase: number; twinkleSpd: number;
  breathOffset: number; breathFreq: number;
  pullX: number; pullY: number;
  trail: { x: number; y: number }[];
}

function sampleText(text: string, W: number, H: number, size: number, font: string, n: number) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  x.fillStyle = '#fff';
  x.font = `bold ${size}px ${font}`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, W / 2, H / 2);
  const { data } = x.getImageData(0, 0, W, H);
  const pts: { x: number; y: number }[] = [];
  for (let y = 0; y < H; y += 3)
    for (let xx = 0; xx < W; xx += 3)
      if (data[(y * W + xx) * 4 + 3] > 128) pts.push({ x: xx, y });
  // Shuffle
  for (let i = pts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }
  const out = pts.slice(0, n);
  while (out.length < n) out.push({ ...out[Math.floor(Math.random() * out.length)] });
  return out;
}

function buildParticles(W: number, H: number): NebulaParticle[] {
  const fs = Math.min(W * 0.40, 200);
  const pts = sampleText('Rae', W, H, fs, '"Cormorant Garamond",Garamond,"Times New Roman",serif', NN);
  return pts.map((q, i) => {
    const angle = (i / NN) * Math.PI * 10;
    const rad = Math.min(W, H) * 0.85 * Math.pow(1 - i / NN, 0.5) + 30;
    const hue = 22 + (i / NN) * 26 + Math.random() * 8;
    return {
      sx: W / 2 + Math.cos(angle) * rad,
      sy: H / 2 + Math.sin(angle) * rad,
      hx: q.x, hy: q.y,
      r: Math.random() * 1.6 + 0.35,
      op: Math.random() * 0.22 + 0.45,
      hue, sat: 78 + Math.random() * 18,
      baseLight: 48 + Math.random() * 22,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpd: 0.003 + Math.random() * 0.007,
      breathOffset: Math.random() * Math.PI * 2,
      breathFreq: 0.0006 + Math.random() * 0.0006,
      pullX: 0, pullY: 0, trail: [],
    };
  });
}

export default function ParticleText({ formProgress, mouseX, mouseY, mouseOn }: ParticleTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef<{
    particles: NebulaParticle[];
    px: Float32Array;
    py: Float32Array;
    animId: number;
    lastTime: number;
    time: number;
    mSmX: number;
    mSmY: number;
    W: number; H: number;
    prevNfT: number; // FIX: track previous nfT untuk deteksi reverse
  } | null>(null);

  const propsRef = useRef({ formProgress, mouseX, mouseY, mouseOn });
  propsRef.current = { formProgress, mouseX, mouseY, mouseOn };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    ctxRef.current = ctx;

    const cv = canvas;

    let W = window.innerWidth, H = window.innerHeight;
    cv.width = W; cv.height = H;

    stateRef.current = {
      particles: buildParticles(W, H),
      px: new Float32Array(NN), py: new Float32Array(NN),
      animId: 0, lastTime: performance.now(), time: 0,
      mSmX: W / 2, mSmY: H / 2, W, H,
      prevNfT: 0,
    };

    function handleResize() {
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W; cv.height = H;
      if (stateRef.current) {
        stateRef.current.W = W; stateRef.current.H = H;
        stateRef.current.particles = buildParticles(W, H);
        stateRef.current.px = new Float32Array(NN);
        stateRef.current.py = new Float32Array(NN);
      }
    }
    window.addEventListener('resize', handleResize);

    function frame(now: number) {
      const st = stateRef.current;
      const ctx = ctxRef.current;
      if (!st || !ctx) return;
      st.animId = requestAnimationFrame(frame);

      const dt = Math.min(now - st.lastTime, 33);
      st.lastTime = now; st.time += dt;

      const { formProgress: nebulaP, mouseX: mRawX, mouseY: mRawY, mouseOn: mOn } = propsRef.current;
      const nfT = ease(nebulaP);

      // FIX: Clear trail saat reverse (nfT turun) atau saat hampir ke spiral
      if (nfT < st.prevNfT - 0.01 || nfT < 0.08) {
        for (let i = 0; i < NN; i++) st.particles[i].trail = [];
      }
      st.prevNfT = nfT;

      // Smooth mouse
      const mLerp = clamp(0.18 * (dt / 16.67), 0, 0.6);
      st.mSmX = lerp(st.mSmX, mOn ? mRawX : st.mSmX, mLerp);
      st.mSmY = lerp(st.mSmY, mOn ? mRawY : st.mSmY, mLerp);

      ctx.clearRect(0, 0, W, H);

      if (nfT < 0.008) return;

      // Bloom glow behind text
      if (nfT > 0.22) {
        const gA = ((nfT - 0.22) / 0.78) * 0.042;
        const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.min(W, H) * 0.58);
        g.addColorStop(0, `rgba(90,45,8,${gA.toFixed(3)})`);
        g.addColorStop(0.5, `rgba(50,20,4,${(gA * 0.4).toFixed(3)})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }

      // Physics + trail
      for (let i = 0; i < NN; i++) {
        const q = st.particles[i];
        q.twinklePhase += q.twinkleSpd;
        const bAmt = Math.sin(st.time * q.breathFreq + q.breathOffset) * 0.007 * nfT;
        const hx = q.hx + (q.hx - W / 2) * bAmt;
        const hy = q.hy + (q.hy - H / 2) * bAmt;
        const gx = lerp(q.sx, hx, nfT);
        const gy = lerp(q.sy, hy, nfT);

        let tX = 0, tY = 0;
        if (mOn && nfT > 0.35) {
          const att = clamp((nfT - 0.35) / 0.65, 0, 1);
          const dx = st.mSmX - gx, dy = st.mSmY - gy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 260 && d > 0.5) {
            const t2 = 1 - d / 260;
            const str = Math.pow(t2, 2.2) * 58 * att;
            tX = (dx / d) * str; tY = (dy / d) * str;
          }
        }
        const normDt = dt / 16.67;
        const spd = (tX === 0 && tY === 0)
          ? clamp(0.10 * normDt, 0, 0.4)
          : clamp(0.22 * normDt, 0, 0.5);
        q.pullX = lerp(q.pullX, tX, spd);
        q.pullY = lerp(q.pullY, tY, spd);
        st.px[i] = gx + q.pullX; st.py[i] = gy + q.pullY;

        q.trail.push({ x: st.px[i], y: st.py[i] });
        if (q.trail.length > 16) q.trail.shift();
      }

      // Trails
      if (nfT > 0.32) {
        const tA = (nfT - 0.32) / 0.68;
        for (let i = 0; i < NN; i++) {
          const q = st.particles[i], tr = q.trail;
          for (let k = 0; k < tr.length - 1; k++) {
            const t = k / (tr.length - 1);
            const alpha = t * t * tA * 0.25;
            ctx.beginPath();
            ctx.arc(tr[k].x, tr[k].y, 0.4 + t * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${q.hue + 5},${q.sat}%,65%,${alpha.toFixed(3)})`;
            ctx.fill();
          }
        }
      }

      // Fine amber connections mesh
      if (nfT > 0.28) {
        const connA = (nfT - 0.28) / 0.72;
        ctx.lineWidth = 0.22; ctx.beginPath();
        for (let i = 0; i < NN - 1; i++) {
          for (let j = i + 1; j < NN; j++) {
            const dx = st.px[i] - st.px[j], dy = st.py[i] - st.py[j];
            if (dx * dx + dy * dy < 820) {
              ctx.moveTo(st.px[i], st.py[i]); ctx.lineTo(st.px[j], st.py[j]);
            }
          }
        }
        ctx.strokeStyle = `rgba(200,110,30,${(connA * 0.07).toFixed(3)})`;
        ctx.stroke();
      }

      // Glow halos
      if (nfT > 0.36) {
        const glA = (nfT - 0.36) / 0.64;
        for (let i = 0; i < NN; i++) {
          const q = st.particles[i]; if (q.r < 0.7) continue;
          const twk = 0.74 + Math.sin(q.twinklePhase) * 0.26;
          const ga = glA * twk * 0.052;
          const g = ctx.createRadialGradient(st.px[i], st.py[i], 0, st.px[i], st.py[i], q.r * 8);
          g.addColorStop(0, `hsla(${q.hue},${q.sat}%,${q.baseLight + 20}%,${ga.toFixed(3)})`);
          g.addColorStop(0.5, `hsla(${q.hue - 6},${q.sat - 10}%,${q.baseLight}%,${(ga * 0.26).toFixed(3)})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g; ctx.beginPath();
          ctx.arc(st.px[i], st.py[i], q.r * 8, 0, Math.PI * 2); ctx.fill();
        }
      }

      // Dots
      for (let i = 0; i < NN; i++) {
        const q = st.particles[i];
        const twk = 0.78 + Math.sin(q.twinklePhase) * 0.22;
        const pm = Math.sqrt(q.pullX * q.pullX + q.pullY * q.pullY);
        const pt = clamp(pm / 42, 0, 1);
        const op = clamp(q.op * twk * (0.03 + nfT * 0.97) + pt * 0.15, 0, 0.86);
        const r = q.r * (1 + nfT * 0.35) * (1 + pt * 0.45) * (0.65 + twk * 0.35);
        const lgt = q.baseLight + twk * 14 + pt * 18;
        ctx.beginPath(); ctx.arc(st.px[i], st.py[i], r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${q.hue},${q.sat}%,${Math.min(lgt, 88)}%,${op.toFixed(3)})`;
        ctx.fill();
      }

      // Rare bright spark
      if (nfT > 0.82 && Math.random() < 0.007) {
        const ri = Math.floor(Math.random() * NN);
        ctx.beginPath(); ctx.arc(st.px[ri], st.py[ri], 1.3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${st.particles[ri].hue + 10},100%,92%,0.65)`; ctx.fill();
      }
    }

    stateRef.current.animId = requestAnimationFrame(frame);
    return () => {
      if (stateRef.current) cancelAnimationFrame(stateRef.current.animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0, width: '100%', height: '100%',
        display: 'block', zIndex: 2, pointerEvents: 'none',
      }}
    />
  );
}