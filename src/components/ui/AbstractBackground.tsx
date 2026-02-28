'use client';

import { useEffect, useRef } from 'react';

interface AbstractBackgroundProps {
  visibility: number; // 0..1
  mouseX: number;
  mouseY: number;
  mouseOn: boolean;
}

const NA = 60;

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
function easeO(t: number) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
function ease(t: number) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

interface Particle {
  // fx/fy: posisi float aktual yang bergerak memantul di canvas
  fx: number; fy: number;
  fvx: number; fvy: number;
  radius: number; baseOp: number;
  // mini-jitter: partikel sesekali melompat kecil
  miniT: number; miniDur: number;
  miniP: number; miniDx: number; miniDy: number; miniStr: number;
  // mouse attraction offset (smooth)
  pullX: number; pullY: number;
}

export default function AbstractBackground({
  visibility,
  mouseX,
  mouseY,
  mouseOn,
}: AbstractBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef    = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef  = useRef<{
    particles: Particle[];
    px: Float32Array;
    py: Float32Array;
    animId: number;
    lastTime: number;
    time: number;
    mSmX: number;
    mSmY: number;
    W: number;
    H: number;
  } | null>(null);

  const propsRef = useRef({ visibility, mouseX, mouseY, mouseOn });
  propsRef.current = { visibility, mouseX, mouseY, mouseOn };

  function buildParticles(W: number, H: number): Particle[] {
    return Array.from({ length: NA }, () => ({
      fx: Math.random() * W,
      fy: Math.random() * H,
      // Kecepatan float sedikit lebih bervariasi agar gerakan organik
      fvx: (Math.random() - 0.5) * 0.6,
      fvy: (Math.random() - 0.5) * 0.6,
      radius:  Math.random() * 1.6 + 0.8,
      baseOp:  Math.random() * 0.4 + 0.3,
      miniT:   Math.random() * 3000,
      miniDur: 600 + Math.random() * 400,
      miniP:   0,
      miniDx:  (Math.random() - 0.5) * 2,
      miniDy:  (Math.random() - 0.5) * 2,
      miniStr: 15 + Math.random() * 25,
      pullX:   0,
      pullY:   0,
    }));
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    ctxRef.current = ctx;

    const cv = canvas;
    let W = window.innerWidth, H = window.innerHeight;
    cv.width = W; cv.height = H;

    const particles = buildParticles(W, H);
    const px = new Float32Array(NA);
    const py = new Float32Array(NA);

    stateRef.current = {
      particles, px, py,
      animId: 0, lastTime: performance.now(), time: 0,
      mSmX: W / 2, mSmY: H / 2, W, H,
    };

    function handleResize() {
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W; cv.height = H;
      if (stateRef.current) {
        stateRef.current.W = W;
        stateRef.current.H = H;
        stateRef.current.particles = buildParticles(W, H);
      }
    }
    window.addEventListener('resize', handleResize);

    function frame(now: number) {
      const st  = stateRef.current;
      const ctx = ctxRef.current;
      if (!st || !ctx) return;
      st.animId = requestAnimationFrame(frame);

      const dt = Math.min(now - st.lastTime, 33);
      st.lastTime = now;
      st.time    += dt;

      const { visibility: abVis, mouseX: mRawX, mouseY: mRawY, mouseOn: mOn } = propsRef.current;

      // Smooth mouse
      const mLerp = clamp(0.18 * (dt / 16.67), 0, 0.6);
      st.mSmX = lerp(st.mSmX, mOn ? mRawX : st.mSmX, mLerp);
      st.mSmY = lerp(st.mSmY, mOn ? mRawY : st.mSmY, mLerp);

      ctx.clearRect(0, 0, W, H);
      if (abVis < 0.005) return;

      // Breath effect: subtle global pulse
      const breathSc = Math.sin(st.time * 0.0035) * 0.012;

      for (let i = 0; i < NA; i++) {
        const p = st.particles[i];

        // --- Float: partikel bergerak memantul ---
        p.fx += p.fvx * (dt / 16.67);
        p.fy += p.fvy * (dt / 16.67);
        if (p.fx < 0)  { p.fvx = Math.abs(p.fvx);  p.fx = 0; }
        if (p.fx > W)  { p.fvx = -Math.abs(p.fvx); p.fx = W; }
        if (p.fy < 0)  { p.fvy = Math.abs(p.fvy);  p.fy = 0; }
        if (p.fy > H)  { p.fvy = -Math.abs(p.fvy); p.fy = H; }

        // --- Mini-jitter ---
        p.miniT -= dt;
        if (p.miniT <= 0 && p.miniP === 0) {
          p.miniP   = 0.001;
          p.miniDx  = (Math.random() - 0.5) * 2;
          p.miniDy  = (Math.random() - 0.5) * 2;
          p.miniStr = 15 + Math.random() * 25;
        }
        if (p.miniP > 0) {
          p.miniP += dt / p.miniDur;
          if (p.miniP >= 1) { p.miniP = 0; p.miniT = 1000 + Math.random() * 4000; }
        }
        const miniE = p.miniP > 0
          ? (p.miniP < 0.4 ? easeO(p.miniP / 0.4) : 1 - ease((p.miniP - 0.4) / 0.6))
          : 0;

        // --- Base position: float + breath + mini-jitter ---
        // Breath: partikel bergerak sedikit menjauhi/mendekati tengah canvas
        const bX = p.fx * (1 + breathSc) + p.miniDx * p.miniStr * miniE;
        const bY = p.fy * (1 + breathSc) + p.miniDy * p.miniStr * miniE;

        // --- Mouse attraction ---
        let tpX = 0, tpY = 0;
        if (mOn) {
          const dxM  = st.mSmX - bX, dyM = st.mSmY - bY;
          const dist = Math.sqrt(dxM * dxM + dyM * dyM);
          if (dist < 300 && dist > 0.5) {
            const t2  = 1 - dist / 300;
            const str = Math.pow(t2, 2) * 110;
            tpX = (dxM / dist) * str;
            tpY = (dyM / dist) * str;
          }
        }
        const normDt = dt / 16.67;
        const lsp = (tpX === 0 && tpY === 0)
          ? clamp(0.10 * normDt, 0, 0.4)
          : clamp(0.22 * normDt, 0, 0.5);
        p.pullX = lerp(p.pullX, tpX, lsp);
        p.pullY = lerp(p.pullY, tpY, lsp);

        px[i] = bX + p.pullX;
        py[i] = bY + p.pullY;
      }

      const opMult = abVis;

      // --- Connections ---
      const maxD  = 130, maxD2 = maxD * maxD;
      const lineA = 0.20 * opMult;
      if (lineA > 0.004) {
        const BK    = 4;
        const paths = Array.from({ length: BK }, () => new Path2D());
        for (let i = 0; i < NA - 1; i++) {
          for (let j = i + 1; j < NA; j++) {
            const dx = px[i] - px[j], dy = py[i] - py[j];
            const d2 = dx * dx + dy * dy;
            if (d2 < maxD2) {
              const t  = 1 - Math.sqrt(d2) / maxD;
              const bk = Math.min(Math.floor(t * BK), BK - 1);
              paths[bk].moveTo(px[i], py[i]);
              paths[bk].lineTo(px[j], py[j]);
            }
          }
        }
        ctx.lineWidth = 0.5;
        for (let b = 0; b < BK; b++) {
          ctx.strokeStyle = `rgba(255,120,0,${(lineA * (b + 1) / BK).toFixed(3)})`;
          ctx.stroke(paths[b]);
        }
      }

      // --- Glow ---
      if (opMult > 0.04) {
        const ga = 0.07 * opMult;
        ctx.fillStyle = `rgba(255,120,0,${ga.toFixed(3)})`;
        for (let i = 0; i < NA; i++) {
          ctx.beginPath();
          ctx.arc(px[i], py[i], st.particles[i].radius * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // --- Dots ---
      for (let i = 0; i < NA; i++) {
        const p   = st.particles[i];
        const pm  = Math.sqrt(p.pullX * p.pullX + p.pullY * p.pullY);
        const pt  = clamp(pm / 110, 0, 1);
        const op  = clamp((p.baseOp + pt * 0.3) * opMult, 0, 1);
        const r   = p.radius * 1.3 * (1 + pt * 0.7);
        ctx.beginPath();
        ctx.arc(px[i], py[i], r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,120,0,${op.toFixed(2)})`;
        ctx.fill();
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
        position: 'fixed', inset: 0,
        width: '100%', height: '100%',
        display: 'block', zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  );
}