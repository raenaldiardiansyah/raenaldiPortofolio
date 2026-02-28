'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const lerp  = (a: number, b: number, t: number) => a + (b - a) * t
const eio   = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

interface Props {
  onComplete?: () => void
}

export default function RaePeekSection({ onComplete }: Props) {
  const [p,  setP]  = useState(0)
  const [vw, setVw] = useState(1280)
  const [vh, setVh] = useState(800)

  // refs — tidak trigger re-render
  const rawP        = useRef(0)        // akumulasi progress dari wheel/touch
  const rafId       = useRef<number>(0)
  const smoothP     = useRef(0)        // smooth display value
  const done        = useRef(false)    // sudah complete?
  const touchStartY = useRef(0)

  // ── Resize ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onResize = () => { setVw(window.innerWidth); setVh(window.innerHeight) }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ── rAF loop — smooth interpolation ──────────────────────────────────────
  useEffect(() => {
    let last = performance.now()

    const tick = (now: number) => {
      rafId.current = requestAnimationFrame(tick)
      const dt = Math.min(now - last, 33)
      last = now

      // lerp display value menuju target
      smoothP.current = lerp(smoothP.current, rawP.current, clamp(0.1 * (dt / 16.67), 0, 0.25))
      setP(eio(smoothP.current))
    }

    rafId.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId.current)
  }, [])

  // ── Complete handler ─────────────────────────────────────────────────────
  const handleComplete = useCallback(() => {
    if (done.current) return
    done.current = true
    onComplete?.()
  }, [onComplete])

  // ── Intercept scroll events — drive rawP, block page scroll ─────────────
  useEffect(() => {
    const SENSITIVITY = 0.0008   // seberapa cepat wheel mengisi progress

    const onWheel = (e: WheelEvent) => {
      if (done.current) return
      e.preventDefault()
      e.stopPropagation()

      rawP.current = clamp(rawP.current + e.deltaY * SENSITIVITY, 0, 1)

      if (rawP.current >= 1) handleComplete()
    }

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY
    }

    const onTouchMove = (e: TouchEvent) => {
      if (done.current) return
      e.preventDefault()

      const delta = touchStartY.current - e.touches[0].clientY
      touchStartY.current = e.touches[0].clientY

      rawP.current = clamp(rawP.current + delta * SENSITIVITY * 2, 0, 1)

      if (rawP.current >= 1) handleComplete()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (done.current) return
      const STEP = 0.12
      if (['ArrowDown', 'PageDown', 'Space', ' '].includes(e.key)) {
        e.preventDefault()
        rawP.current = clamp(rawP.current + STEP, 0, 1)
        if (rawP.current >= 1) handleComplete()
      }
      if (['ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault()
        rawP.current = clamp(rawP.current - STEP, 0, 1)
      }
    }

    window.addEventListener('wheel',      onWheel,      { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove',  onTouchMove,  { passive: false })
    window.addEventListener('keydown',    onKeyDown)

    return () => {
      window.removeEventListener('wheel',      onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove',  onTouchMove)
      window.removeEventListener('keydown',    onKeyDown)
    }
  }, [handleComplete])

  // ── Sizing ───────────────────────────────────────────────────────────────
  const fPeek   = Math.min(vw * 0.44, 540)
  const fJoined = Math.min(vw * 0.22, 240)
  const fs      = lerp(fPeek, fJoined, p)

  const rW    = fs * 0.68
  const aW    = fs * 0.74
  const eW    = fs * 0.65
  const wordW = rW + aW + eW
  const pad   = 48

  const frameW      = lerp(vw,   wordW + pad * 2,     p)
  const frameH      = lerp(vh,   fs * 1.1 + pad * 2,  p)
  const gridCell    = lerp(32,   18,                   p)
  const borderAlpha = lerp(0.06, 0.28,                 p)
  const gridAlpha   = lerp(0.02, 0.055,                p)

  const rTx_on = -(wordW / 2) + rW / 2
  const eTx_on =  (wordW / 2) - eW / 2

  const rTx_off = -(vw / 2) + 72 - rW / 2
  const aTy_off =  (vh / 2) - 52 + fs / 2
  const eTx_off =  (vw / 2) - 72 + eW / 2

  const rTx = lerp(rTx_off, rTx_on, p)
  const aTy = lerp(aTy_off, 0,      p)
  const eTx = lerp(eTx_off, eTx_on, p)

  const gBlur    = lerp(110, 28, p)
  const gAlphaRE = lerp(0.50, 0.20, p)
  const gAlphaA  = lerp(0.60, 0.28, p)
  const ambA     = lerp(0,    0.22, p)

  const frameTop    = (vh - frameH) / 2
  const diamondShow = p > 0.12
  const hintOp      = clamp(1 - p * 6, 0, 1)

  const base: React.CSSProperties = {
    position:      'absolute',
    fontFamily:    "'Uncial Antiqua', serif",
    fontSize:      fs,
    lineHeight:    1,
    userSelect:    'none',
    pointerEvents: 'none',
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Uncial+Antiqua&family=Cinzel:wght@400&display=swap');
        @keyframes pulse {
          0%,100% { opacity:.3 }
          50%      { opacity:1 }
        }
      `}</style>

      {/* Fixed viewport — halaman TIDAK scroll selama animasi */}
      <div style={{
        position:       'fixed',
        inset:          0,
        width:          '100vw',
        height:         '100vh',
        overflow:       'hidden',
        background:     '#0e0b07',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        zIndex:         100,
        // hilang saat done
        pointerEvents:  done.current ? 'none' : 'all',
        opacity:        done.current ? 0 : 1,
        transition:     done.current ? 'opacity 0.3s ease-out' : 'none',
      }}>

        {/* Frame */}
        <div style={{
          position:        'absolute',
          width:           frameW,
          height:          frameH,
          top:             '50%',
          left:            '50%',
          transform:       'translate(-50%, -50%)',
          backgroundColor: '#110d08',
          backgroundImage: [
            `linear-gradient(rgba(201,169,110,${gridAlpha}) 1px, transparent 1px)`,
            `linear-gradient(90deg, rgba(201,169,110,${gridAlpha}) 1px, transparent 1px)`,
          ].join(', '),
          backgroundSize:  `${gridCell}px ${gridCell}px`,
          outline:         `1px solid rgba(201,169,110,${borderAlpha})`,
        }} />

        {/* Diamond */}
        {diamondShow && (
          <div style={{
            position:  'absolute',
            top:       frameTop - 9,
            left:      '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width:     16,
            height:    16,
            background:'#110d08',
            border:    `1px solid rgba(201,169,110,${Math.min(borderAlpha * 1.5, 0.45)})`,
            opacity:   clamp((p - 0.12) / 0.1, 0, 1),
            zIndex:    15,
          }} />
        )}

        {/* Ambient glow */}
        <div style={{
          position:      'absolute',
          width:         500,
          height:        500,
          borderRadius:  '50%',
          background:    `radial-gradient(circle, rgba(212,120,58,${ambA}) 0%, transparent 65%)`,
          pointerEvents: 'none',
          zIndex:        4,
        }} />

        {/* Letters */}
        <div style={{
          position: 'absolute',
          top:      '50%',
          left:     '50%',
          width:    0,
          height:   0,
          overflow: 'visible',
          zIndex:   5,
        }}>
          <span style={{
            ...base,
            color:     '#f0e4cc',
            filter:    `drop-shadow(0 0 ${gBlur}px rgba(240,228,204,${gAlphaRE}))`,
            transform: `translate(calc(-50% + ${rTx}px), -52%)`,
          }}>R</span>

          <span style={{
            ...base,
            color:     '#d4783a',
            filter:    `drop-shadow(0 0 ${gBlur}px rgba(212,120,58,${gAlphaA}))`,
            transform: `translate(-50%, calc(-52% + ${aTy}px))`,
          }}>A</span>

          <span style={{
            ...base,
            color:     '#f0e4cc',
            filter:    `drop-shadow(0 0 ${gBlur}px rgba(240,228,204,${gAlphaRE}))`,
            transform: `translate(calc(-50% + ${eTx}px), -52%)`,
          }}>E</span>
        </div>

        {/* Scroll hint */}
        <div style={{
          position:      'absolute',
          bottom:        36,
          left:          '50%',
          transform:     'translateX(-50%)',
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'center',
          gap:           10,
          opacity:       hintOp,
          pointerEvents: 'none',
          zIndex:        30,
        }}>
          <span style={{
            fontFamily:    "'Cinzel', serif",
            fontSize:      '0.58rem',
            letterSpacing: '0.55em',
            textTransform: 'uppercase',
            color:         'rgba(201,169,110,0.5)',
            whiteSpace:    'nowrap',
          }}>✦ Scroll to unite ✦</span>
          <div style={{
            width:      1,
            height:     36,
            background: 'linear-gradient(to bottom, rgba(201,169,110,0.4), transparent)',
            animation:  'pulse 1.8s ease-in-out infinite',
          }} />
        </div>

      </div>
    </>
  )
}