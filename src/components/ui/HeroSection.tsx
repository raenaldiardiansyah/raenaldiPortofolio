import { useRef, useLayoutEffect } from 'react'
import { Play } from 'lucide-react'
import AbstractBackground from '@/components/ui/AbstractBackground'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const HeroSection = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=100%',
          pin: true,
          scrub: 1,
        },
      })

      // Heading bergerak ke atas dan memudar
      tl.to(headingRef.current, {
        y: -150,
        opacity: 0,
        scale: 0.8,
        duration: 0.5,
        ease: 'power2.inOut',
      }, 0)
    }, section)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-screen bg-white overflow-hidden z-10"
    >
      {/* Abstract Background */}
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <div className="relative w-[500px] h-[500px]">
          <AbstractBackground />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-8">
        {/* Large Heading - akan hilang saat scroll */}
        <h1
          ref={headingRef}
          className="text-[15vw] md:text-[12vw] font-black text-black leading-none tracking-tighter text-center"
        >
          SAPFORCE.
        </h1>
      </div>
    </section>
  )
}

export default HeroSection