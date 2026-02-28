import React, { useRef, useEffect, useState } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  useSpring,
} from 'framer-motion';
import { Download } from 'lucide-react';
import { Button } from './button';

interface GooeyNavItem {
  label: string;
  href: string;
}

export interface GooeyNavProps {
  items: GooeyNavItem[];
  animationTime?: number;
  particleCount?: number;
  particleDistances?: [number, number];
  particleR?: number;
  timeVariance?: number;
  colors?: number[];
  initialActiveIndex?: number;
}

const GooeyNav: React.FC<GooeyNavProps> = ({
  items,
  animationTime = 600,
  particleCount = 15,
  particleDistances = [90, 10],
  particleR = 100,
  timeVariance = 300,
  colors = [1, 2, 3, 1, 2, 3, 1, 4],
  initialActiveIndex = 0
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navRef       = useRef<HTMLUListElement>(null);
  const textRef      = useRef<HTMLSpanElement>(null);
  const bgRef        = useRef<HTMLSpanElement>(null);
  const [activeIndex, setActiveIndex] = useState<number>(initialActiveIndex);

  useEffect(() => { setActiveIndex(initialActiveIndex); }, [initialActiveIndex]);

  const noise = (n = 1) => n / 2 - Math.random() * n;
  const getXY = (distance: number, pointIndex: number, totalPoints: number): [number, number] => {
    const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  };
  const createParticle = (i: number, t: number, d: [number, number], r: number) => {
    const rotate = noise(r / 10);
    return {
      start: getXY(d[0], particleCount - i, particleCount),
      end:   getXY(d[1] + noise(7), particleCount - i, particleCount),
      time:  t,
      scale: 1 + noise(0.2),
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10
    };
  };

  const makeParticles = (element: HTMLElement) => {
    const d: [number, number] = particleDistances;
    const r = particleR;
    element.style.setProperty('--time', `${animationTime * 2 + timeVariance}ms`);
    for (let i = 0; i < particleCount; i++) {
      const t = animationTime * 2 + noise(timeVariance * 2);
      const p = createParticle(i, t, d, r);
      setTimeout(() => {
        const particle = document.createElement('span');
        const point    = document.createElement('span');
        particle.classList.add('sq-particle');
        particle.style.setProperty('--start-x', `${p.start[0]}px`);
        particle.style.setProperty('--start-y', `${p.start[1]}px`);
        particle.style.setProperty('--end-x',   `${p.end[0]}px`);
        particle.style.setProperty('--end-y',   `${p.end[1]}px`);
        particle.style.setProperty('--time',    `${p.time}ms`);
        particle.style.setProperty('--scale',   `${p.scale}`);
        particle.style.setProperty('--color',   `var(--sq-color-${p.color}, #FF4500)`);
        particle.style.setProperty('--rotate',  `${p.rotate}deg`);
        point.classList.add('sq-point');
        particle.appendChild(point);
        element.appendChild(particle);
        setTimeout(() => { try { element.removeChild(particle); } catch {} }, t);
      }, 30);
    }
  };

  const updateEffectPosition = (element: HTMLElement) => {
    if (!containerRef.current || !bgRef.current || !textRef.current) return;
    const cr  = containerRef.current.getBoundingClientRect();
    const pos = element.getBoundingClientRect();
    const s = {
      left:   `${pos.x - cr.x}px`,
      top:    `${pos.y - cr.y}px`,
      width:  `${pos.width}px`,
      height: `${pos.height}px`,
    };
    Object.assign(bgRef.current.style,   s);
    Object.assign(textRef.current.style, s);
    textRef.current.innerText = element.innerText;
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, index: number) => {
    const liEl = e.currentTarget;
    if (activeIndex === index) return;
    setActiveIndex(index);
    updateEffectPosition(liEl);
    if (textRef.current) {
      textRef.current.classList.remove('sq-text-active');
      void textRef.current.offsetWidth;
      textRef.current.classList.add('sq-text-active');
    }
    if (bgRef.current) makeParticles(bgRef.current);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const liEl = e.currentTarget.parentElement;
      if (liEl) handleClick({ currentTarget: liEl } as React.MouseEvent<HTMLAnchorElement>, index);
    }
  };

  useEffect(() => {
    if (!navRef.current || !containerRef.current) return;
    const activeLi = navRef.current.querySelectorAll('li')[activeIndex] as HTMLElement;
    if (activeLi) {
      updateEffectPosition(activeLi);
      textRef.current?.classList.add('sq-text-active');
    }
    const ro = new ResizeObserver(() => {
      const li = navRef.current?.querySelectorAll('li')[activeIndex] as HTMLElement;
      if (li) updateEffectPosition(li);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [activeIndex]);

  return (
    <>
      <style>{`
        :root {
          --sq-color-1: #FF4500;
          --sq-color-2: #FF8000;
          --sq-color-3: #FFAA33;
          --sq-color-4: #FF6600;
        }
        .sq-bg {
          position: absolute;
          pointer-events: none;
          z-index: 1;
          border-radius: 0;
          background: linear-gradient(90deg, #7A2200, #FF4500, #FF8000);
          transform-origin: center;
          animation: sq-appear 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
        }
        @keyframes sq-appear {
          from { opacity: 0; transform: scaleX(0.6) scaleY(0.8); }
          to   { opacity: 1; transform: scaleX(1)   scaleY(1); }
        }
        .sq-text {
          position: absolute;
          pointer-events: none;
          display: grid;
          place-items: center;
          z-index: 4;
          color: transparent;
          font-size: 0.875rem;
          font-family: inherit;
          letter-spacing: inherit;
          transition: color 0.15s ease;
        }
        .sq-text.sq-text-active { color: white; }
        li.active > a { color: transparent !important; }
        .sq-particle {
          display: block;
          opacity: 0;
          width: 20px; height: 20px;
          border-radius: 9999px;
          transform-origin: center;
          position: absolute;
          top: calc(50% - 10px);
          left: calc(50% - 10px);
          animation: sq-particle-anim calc(var(--time)) ease 1 -350ms;
          pointer-events: none;
          z-index: 5;
        }
        .sq-point {
          display: block;
          width: 100%; height: 100%;
          border-radius: 9999px;
          background: var(--color);
          opacity: 1;
          animation: sq-point-anim calc(var(--time)) ease 1 -350ms;
          box-shadow: 0 0 6px 2px var(--color);
        }
        @keyframes sq-particle-anim {
          0%   { transform: rotate(0deg) translate(var(--start-x), var(--start-y)); opacity: 1; animation-timing-function: cubic-bezier(0.55,0,1,0.45); }
          70%  { transform: rotate(calc(var(--rotate)*0.5)) translate(calc(var(--end-x)*1.2), calc(var(--end-y)*1.2)); opacity: 1; animation-timing-function: ease; }
          85%  { transform: rotate(calc(var(--rotate)*0.66)) translate(var(--end-x), var(--end-y)); opacity: 1; }
          100% { transform: rotate(calc(var(--rotate)*1.2)) translate(calc(var(--end-x)*0.5), calc(var(--end-y)*0.5)); opacity: 1; }
        }
        @keyframes sq-point-anim {
          0%   { transform: scale(0); opacity: 0; animation-timing-function: cubic-bezier(0.55,0,1,0.45); }
          25%  { transform: scale(calc(var(--scale)*0.25)); }
          38%  { opacity: 1; }
          65%  { transform: scale(var(--scale)); opacity: 1; animation-timing-function: ease; }
          85%  { transform: scale(var(--scale)); opacity: 1; }
          100% { transform: scale(0); opacity: 0; }
        }
      `}</style>

      <div className="relative isolate" ref={containerRef}>
        <nav className="flex relative" style={{ transform: 'translate3d(0,0,0.01px)' }}>
          <ul
            ref={navRef}
            className="flex gap-8 list-none p-0 px-4 m-0 relative z-[3] text-sm"
            style={{ color: 'white' }}
          >
            {items.map((item, index) => (
              <li
                key={index}
                className={`rounded-none relative cursor-pointer transition-colors duration-300 text-white ${activeIndex === index ? 'active' : ''}`}
              >
                <a
                  href={item.href}
                  onClick={e => handleClick(e, index)}
                  onKeyDown={e => handleKeyDown(e, index)}
                  className="outline-none py-[0.4em] px-[0.8em] inline-block"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <span className="sq-bg" ref={bgRef} />
        <span className="sq-text" ref={textRef} />
      </div>
    </>
  );
};

const GlitchIcon = ({ children }: { children: React.ReactNode }) => (
  <span className="glitch-icon inline-flex">{children}</span>
);

export default function Navbar() {
  const { scrollYProgress } = useScroll();

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 25,
    restDelta: 0.001,
  });

  const [scrolled,    setScrolled]    = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useMotionValueEvent(scrollYProgress, 'change', v => {
    setScrolled(v > 0.07);
  });

  useEffect(() => {
    // sections sesuai urutan nav items
    const sections = ['about', 'skills', 'projects', 'contact'];

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const index = sections.indexOf(entry.target.id);
            if (index !== -1) setActiveIndex(index);
          }
        });
      },
      {
        // rootMargin: top -20% agar trigger saat section masuk ~20% dari atas viewport
        // bottom -40% agar tidak trigger terlalu dini dari bawah
        rootMargin: '-20% 0px -40% 0px',
        threshold: 0,   // cukup 1px masuk zona rootMargin
      }
    );

    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const navbarY       = useTransform(smoothProgress, [0, 0.07], [-64, 0]);
  const navbarOpacity = useTransform(smoothProgress, [0, 0.07], [0, 1]);

  return (
    <motion.nav
      style={{ y: navbarY, opacity: navbarOpacity }}
      className="fixed top-0 w-full z-50 bg-black/85 backdrop-blur-md border-b border-white/5"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between relative">

        <motion.span
          animate={{ opacity: scrolled ? 1 : 0, x: scrolled ? 0 : -20 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="font-mono font-semibold text-base tracking-tighter whitespace-nowrap"
        >
          <span className="text-white">RAENALDI ARDIANSYAH</span>
          <span className="text-white/40"> S.</span>
        </motion.span>

        <motion.div
          animate={{ left: scrolled ? '50%' : '1.5rem', x: scrolled ? '-50%' : '0%', opacity: 1 }}
          initial={{ left: '1.5rem', x: '0%', opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="hidden md:flex absolute top-1/2 -translate-y-1/2 items-center"
        >
          <GooeyNav
            items={[
              { label: 'ABOUT',    href: '#about' },
              { label: 'SKILLS',   href: '#skills' },
              { label: 'PROJECTS', href: '#projects' },
              { label: 'CONTACT',  href: '#contact' },
            ]}
            particleCount={13}
            particleDistances={[90, 10]}
            particleR={1000}
            initialActiveIndex={activeIndex}
            animationTime={600}
            timeVariance={1000}
            colors={[1, 2, 3, 1, 2, 3, 1, 4]}
          />
        </motion.div>

        <Button
          variant="outline" size="sm"
          className="font-mono text-xs border-white/20 hover:border-white/60 hover:bg-white/5 transition-all rounded-none"
        >
          <GlitchIcon>
            <Download className="w-3 h-3 mr-2" />
            RESUME
          </GlitchIcon>
        </Button>

      </div>
    </motion.nav>
  );
}