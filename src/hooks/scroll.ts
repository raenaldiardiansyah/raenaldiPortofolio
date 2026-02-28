import { useEffect, useRef, useState } from 'react'

export interface PortalState {
  portalProgress: number
  isOpen: boolean
  scrollProgress: number
}


export function useScroll(): PortalState {
  const [state, setState] = useState<PortalState>({
    portalProgress: 0,
    isOpen: false,
    scrollProgress: 0,
  })

  const rafRef = useRef<number>(null)
  const scrollYRef = useRef(0)
  const smoothRef = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      scrollYRef.current = window.scrollY
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    const easeInOut = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    let last = performance.now()

    const tick = (now: number) => {
      rafRef.current = requestAnimationFrame(tick)
      const dt = Math.min(now - last, 33)
      last = now

      const totalScroll = document.documentElement.scrollHeight - window.innerHeight
      const raw = totalScroll > 0 ? Math.min(scrollYRef.current / totalScroll, 1) : 0

      const gap = Math.abs(raw - smoothRef.current)
      const speed = 0.06 + gap * 0.25
      smoothRef.current = lerp(smoothRef.current, raw, Math.min(speed * (dt / 16.67), 0.3))

      const s = smoothRef.current

      let portalProgress = 0
      if (s < 0.30) {
        portalProgress = 0
      } else if (s < 0.60) {
        portalProgress = easeInOut((s - 0.30) / 0.30)
      } else if (s < 0.75) {
        portalProgress = 1
      } else {
        // reverse: 1 → 0
        portalProgress = 1 - easeInOut((s - 0.75) / 0.25)
      }

      setState({
        portalProgress,
        isOpen: portalProgress > 0.01,
        scrollProgress: s,
      })
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return state
}