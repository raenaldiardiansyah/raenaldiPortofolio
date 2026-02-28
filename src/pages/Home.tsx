'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  Github, Linkedin, Mail, Code2, Cpu, Globe,
  ChevronRight, CircuitBoard, ArrowUpRight,
} from 'lucide-react';
import { Badge }            from '../components/ui/badge';
import FeaturedProjectsRail from '../components/ui/featured-projects-rail';
import AbstractBackground   from '../components/ui/AbstractBackground';
import Navbar               from '../components/ui/navigation-menu';
import GlareHover           from '../components/ui/GlareHover';
import ParticleText         from '../components/ui/ParticleText';

function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
function lerp(a: number, b: number, t: number)  { return a + (b - a) * t; }
function ease(t: number) {
  t = clamp(t, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function seg(s: number, a: number, b: number) {
  return ease(clamp((s - a) / (b - a), 0, 1));
}

const PO = (a: number) => `rgba(200,120,30,${a})`;
const INTRO_DUR = 900;

const GlitchIcon = ({ children }: { children: React.ReactNode }) => (
  <span className="glitch-icon inline-flex">{children}</span>
);

const SocialLink = ({
  href, icon: Icon, label,
}: { href: string; icon: React.ElementType; label: string }) => (
  <a
    href={href} target="_blank" rel="noopener noreferrer"
    className="group relative p-4 border border-white/20 hover:border-white/80 transition-all duration-300"
    aria-label={label}
  >
    <GlitchIcon>
      <Icon className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
    </GlitchIcon>
  </a>
);

const SkillCategory = ({
  icon: Icon, title, skills, delay = 0,
}: { icon: React.ElementType; title: string; skills: string[]; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }} transition={{ duration: 0.6, delay }}
    className="group relative p-8 h-full"
  >
    <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/0 group-hover:border-white/50 transition-all duration-300" />
    <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/0 group-hover:border-white/50 transition-all duration-300" />
    <div className="space-y-6">
      <div className="w-14 h-14 border border-white/20 flex items-center justify-center group-hover:border-white/60 group-hover:bg-white/5 transition-all duration-300">
        <Icon className="w-6 h-6 text-white/60 group-hover:text-white transition-colors" />
      </div>
      <h3 className="text-lg font-semibold tracking-wide font-outfit">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {skills.map(s => (
          <span key={s} className="text-xs font-mono text-white/40 border border-white/10 px-3 py-1.5 hover:border-white/40 hover:text-white/80 transition-all cursor-default">
            {s}
          </span>
        ))}
      </div>
    </div>
  </motion.div>
);

const SectionHeader = ({ number, title }: { number: string; title: string }) => (
  <motion.div
    initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }} className="flex items-center gap-4 mb-12"
  >
    <span className="text-xs font-mono text-white/30">{number}</span>
    <div className="w-16 h-px bg-gradient-to-r from-white/30 to-transparent" />
    <h2 className="text-sm font-mono text-white/60 tracking-widest">{title}</h2>
  </motion.div>
);

export default function Home() {
  const aboutRef = useRef<HTMLElement>(null);

  // ── Scroll Lock ────────────────────────────────────────────────────────────
  const scrollLockedRef = useRef(false);
  const thresholdRef    = useRef(0);

  useEffect(() => {
    const calcThreshold = () => { thresholdRef.current = window.innerHeight; };
    calcThreshold();
    window.addEventListener('resize', calcThreshold);

    const onScroll = () => {
      if (!scrollLockedRef.current && window.scrollY >= thresholdRef.current) {
        scrollLockedRef.current = true;
      }
      if (scrollLockedRef.current && window.scrollY < thresholdRef.current) {
        window.scrollTo({ top: thresholdRef.current, behavior: 'instant' });
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!scrollLockedRef.current) return;
      if (e.deltaY < 0 && window.scrollY <= thresholdRef.current + 10) {
        e.preventDefault();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!scrollLockedRef.current) return;
      if (window.scrollY <= thresholdRef.current + 10) {
        if (['ArrowUp', 'PageUp', 'Home'].includes(e.key)) e.preventDefault();
      }
    };

    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => { touchStartY = e.touches[0].clientY; };
    const onTouchMove  = (e: TouchEvent) => {
      if (!scrollLockedRef.current) return;
      const swipingUp = e.touches[0].clientY > touchStartY;
      if (swipingUp && window.scrollY <= thresholdRef.current + 10) e.preventDefault();
    };

    window.addEventListener('scroll',     onScroll,     { passive: true });
    window.addEventListener('wheel',      onWheel,      { passive: false });
    window.addEventListener('keydown',    onKeyDown);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove',  onTouchMove,  { passive: false });

    return () => {
      window.removeEventListener('resize',     calcThreshold);
      window.removeEventListener('scroll',     onScroll);
      window.removeEventListener('wheel',      onWheel);
      window.removeEventListener('keydown',    onKeyDown);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove',  onTouchMove);
    };
  }, []);

  // ── Navbar ──────────────────────────────────────────────────────────────
  const contentSentinelRef             = useRef<HTMLDivElement>(null);
  const sentinelInView                 = useInView(contentSentinelRef, { amount: 0 });
  const [navReady, setNavReady]        = useState(false);
  useEffect(() => { if (sentinelInView) setNavReady(true); }, [sentinelInView]);

  const [nebulaForm, setNebulaForm] = useState(0);
  const [abVis,      setAbVis]      = useState(1);
  const [mouse,      setMouse]      = useState({ x: -9999, y: -9999, on: false });

  const loopRef = useRef({
    rawScroll: 0, smoothScroll: 0, nebulaP: 0, autoplayDone: false,
    lastTime: performance.now(),
    mRawX: -9999, mRawY: -9999, mOn: false, mSmX: 0, mSmY: 0,
    W: typeof window !== 'undefined' ? window.innerWidth  : 1,
    H: typeof window !== 'undefined' ? window.innerHeight : 1,
    animId: 0,
    animPx: typeof window !== 'undefined' ? window.innerHeight * 2.2 : 1400,
  });

  const { scrollY } = useScroll();
  const hintOpacity = useTransform(scrollY, [0, 100], [1, 0]);

  useEffect(() => {
    const onMove  = (e: MouseEvent) => { loopRef.current.mRawX = e.clientX; loopRef.current.mRawY = e.clientY; loopRef.current.mOn = true; };
    const onLeave = () => { loopRef.current.mOn = false; };
    window.addEventListener('mousemove',  onMove);
    window.addEventListener('mouseleave', onLeave);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseleave', onLeave); };
  }, []);

  useEffect(() => {
    const onScroll = () => { loopRef.current.rawScroll = window.scrollY; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function resize() {
      const W = window.innerWidth, H = window.innerHeight;
      loopRef.current.W = W; loopRef.current.H = H; loopRef.current.animPx = H * 2.2;
    }
    resize();
    loopRef.current.mSmX = loopRef.current.W / 2;
    loopRef.current.mSmY = loopRef.current.H / 2;
    window.addEventListener('resize', resize);

    function frame(now: number) {
      const L = loopRef.current;
      L.animId = requestAnimationFrame(frame);
      const dt = Math.min(now - L.lastTime, 33);
      L.lastTime = now;

      L.smoothScroll = lerp(L.smoothScroll, L.rawScroll, clamp(0.04 * (dt / 16.67), 0, 0.12));
      const px = L.smoothScroll, AP = L.animPx;

      const abVisVal     = 1 - seg(px, AP * 0.72, AP * 0.90);
      const sRaeDissolve = seg(px, AP * 0.15, AP * 0.48);

      if (!L.autoplayDone) {
        L.nebulaP = Math.min(L.nebulaP + dt / INTRO_DUR, 1);
        if (L.nebulaP >= 1) L.autoplayDone = true;
      } else {
        const target = Math.max(0, 1 - sRaeDissolve);
        const goingDown = target < L.nebulaP;
        const speed = goingDown
          ? clamp(0.14 * (dt / 16.67), 0, 0.40)
          : clamp(0.06 * (dt / 16.67), 0, 0.20);
        L.nebulaP = lerp(L.nebulaP, target, speed);
      }

      const mLerp = clamp(0.18 * (dt / 16.67), 0, 0.6);
      L.mSmX = lerp(L.mSmX, L.mOn ? L.mRawX : L.mSmX, mLerp);
      L.mSmY = lerp(L.mSmY, L.mOn ? L.mRawY : L.mSmY, mLerp);

      setNebulaForm(L.nebulaP);
      setAbVis(abVisVal);
      setMouse({ x: L.mSmX, y: L.mSmY, on: L.mOn });
    }

    const L = loopRef.current;
    L.animId = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(L.animId); window.removeEventListener('resize', resize); };
  }, []);

  const skills = {
    programming: ['TypeScript', 'JavaScript', 'C/C++', 'Java'],
    iot:         ['Arduino', 'ESP32', 'Electronic Schematic', 'MQTT', 'Sensors', 'Aktuator'],
    tools:       ['Git', 'KiCad', 'Vite', 'Figma', 'VS Code', 'Arduino IDE'],
  };

  const projects = [
    {
      id: 'smart-lock', title: 'Smart-Lock Door',
      description: 'ESP32-based door lock system with real-time monitoring and web dashboard.',
      tags: ['ESP32', 'SENSOR & AKTUATOR', 'MQTT', 'C/C++'],
      image: '/images/smartlock-door.png', color: 'from-neutral-700 to-neutral-800', link: '/Smart-Lock Door',
    },
    {
      id: 'BojongTravel', title: 'Real-Time Bus Schedule, Maps & AI Guide',
      description: 'Track buses, simulate routes on satellite maps, and get instant culinary & tourism recommendations through a location-based chatbot.',
      tags: ['React', 'TypeScript', 'Leaflet.js + Mapbox', 'Supabase'],
      color: 'from-neutral-700 to-neutral-800',
      link: '/Bojong-Travel',
    },
    {
      id: 'iot-agv', title: 'Line-Following AGV',
      description: 'Autonomous guided vehicle with line-following capability and IoT connectivity.',
      tags: ['ESP32', 'MQTT', 'C/C++', 'PCB Design'],
      image: '/images/AGV Line.png', color: 'from-neutral-700 to-neutral-800', link: '/AGV-LineFollower',
    },
  ];

  const experiences = [
    { period: '2024 — NOW', title: 'Computer Engineering',                     org: 'Telkom University', badge: 'EDUCATION' },
    { period: '2026 — NOW', title: 'Computer Engineering Student Association', org: 'Telkom University', badge: 'STUDENT ASSOCIATION' },
  ];

  return (
    <div className="text-white overflow-x-hidden font-outfit" style={{ background: '#000000' }}>

      <AbstractBackground visibility={abVis} mouseX={mouse.x} mouseY={mouse.y} mouseOn={mouse.on} />
      <ParticleText formProgress={nebulaForm} mouseX={mouse.x} mouseY={mouse.y} mouseOn={mouse.on} />

      <motion.div
        style={{ opacity: hintOpacity }}
        className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2.5 pointer-events-none"
      >
        <div className="w-px h-8 animate-[va_3s_ease-in-out_infinite]"
          style={{ background: `linear-gradient(to bottom, ${PO(0.35)}, transparent)` }} />
        <span className="text-[10px] tracking-[5px] uppercase italic"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: PO(0.3) }}>
          scroll
        </span>
      </motion.div>

      <section className="min-h-screen" aria-hidden="true" />

      <motion.div
        animate={{ opacity: navReady ? 1 : 0, y: navReady ? 0 : -12 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30, pointerEvents: navReady ? 'auto' : 'none' }}
      >
        <Navbar />
      </motion.div>

      <div style={{ position: 'relative', zIndex: 20, background: '#080604' }}>

        <div ref={contentSentinelRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 1, pointerEvents: 'none' }} />

        <div className="scanlines" />
        <div className="noise-overlay" />

        <main className="px-6 max-w-7xl mx-auto space-y-40 pt-24">

          <section id="about" className="scroll-mt-24" ref={aboutRef}>
            <SectionHeader number="01" title="ABOUT" />
            <div className="grid md:grid-cols-2 gap-16 items-start">
              <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.7 }}
                className="space-y-4 text-white/60 leading-relaxed text-lg"
              >
                <p>I approach system development with the belief that systems are a flexible medium for connecting interfaces and physical devices.</p>
                <p>I'm interested in how web applications and electrical systems work together, how connectivity enables real-time interaction, and how tools can be designed to feel clear and dependable.</p>
                <p>My work spans web development and electrical system design, with connectivity used as a bridge rather than the focus.</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.2 }}
                className="space-y-6"
              >
                {[
                  { icon: Code2,        title: 'Web Development', desc: 'Frontend focused, clean UI with modern technologies' },
                  { icon: CircuitBoard, title: 'IoT & Embedded',  desc: 'Sensors, MCU, Connectivity and real-time systems' },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="group border border-white/10 p-6 hover:border-white/30 transition-all duration-500">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 border border-white/20 flex items-center justify-center group-hover:border-white/50 group-hover:bg-white/5 transition-all">
                        <GlitchIcon><Icon className="w-5 h-5 text-white/50 group-hover:text-white transition-colors" /></GlitchIcon>
                      </div>
                      <h3 className="font-semibold text-lg font-outfit">{title}</h3>
                    </div>
                    <p className="text-sm text-white/40">{desc}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </section>

          <section id="skills" className="scroll-mt-24">
            <SectionHeader number="02" title="TECH STACK" />
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Code2, title: 'Programming',    skills: skills.programming, delay: 0 },
                { icon: Cpu,   title: 'IoT & Embedded', skills: skills.iot,         delay: 0.15 },
                { icon: Globe, title: 'Tools',          skills: skills.tools,       delay: 0.3 },
              ].map(({ icon, title, skills: s, delay }) => (
                <GlareHover key={title} width="100%" height="auto" background="transparent"
                  borderRadius="0px" borderColor="rgba(255,255,255,0.1)"
                  glareColor="#ffffff" glareOpacity={0.08} glareAngle={-30}
                  glareSize={300} transitionDuration={800} playOnce={false}
                >
                  <SkillCategory icon={icon} title={title} skills={s} delay={delay} />
                </GlareHover>
              ))}
            </div>
          </section>

          <section id="projects" className="scroll-mt-12">
            <FeaturedProjectsRail title="FEATURED PROJECTS" subtitle="New Project." projects={projects} />
          </section>

          {/* ── Experience: responsive layout ── */}
          <section id="experience" className="scroll-mt-24">
            <SectionHeader number="03" title="EXPERIENCE & EDUCATION" />
            <div className="max-w-2xl">
              {experiences.map(({ period, title, org, badge }) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="group py-8 border-b border-white/10 hover:border-white/30 transition-colors"
                >
                  {/* Mobile: stack vertical | Desktop: horizontal row */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:gap-8">

                    {/* Period — selalu di atas di mobile, kiri di desktop */}
                    <div className="mb-3 sm:mb-0 sm:w-32 sm:pt-1 sm:shrink-0">
                      <span className="text-xs font-mono text-white/30 whitespace-nowrap">{period}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-2 min-w-0">
                      {/* Title + Badge: wrap secara natural */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <h4 className="font-semibold text-lg font-outfit group-hover:text-white transition-colors leading-snug">
                          {title}
                        </h4>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono border-white/20 text-white/50 rounded-none shrink-0"
                        >
                          {badge}
                        </Badge>
                      </div>
                      <p className="text-sm text-white/40">{org}</p>
                    </div>

                    {/* Arrow — hanya tampil di desktop hover */}
                    <ChevronRight className="hidden sm:block w-5 h-5 text-white/20 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 group-hover:text-white/50 transition-all self-center" />
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          <section id="contact" className="scroll-mt-24 pb-10">
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative border border-white/10 p-8 sm:p-16 text-center space-y-10 hover:border-white/30 transition-all duration-500"
            >
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/20" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/20" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/20" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/20" />
              <div className="space-y-6">
                <h2 className="text-4xl md:text-5xl font-black tracking-tight font-outfit">
                  LET'S WORK <span className="text-white/30">TOGETHER</span>
                </h2>
                <p className="text-white/40 max-w-md mx-auto">Have a project in mind? Let's discuss how we can bring your ideas to life.</p>
              </div>
              <a href="mailto:raenaldi.ardiansyah30@gmail.com"
                className="inline-flex items-center gap-4 px-10 py-5 border border-white/30 bg-white/5 hover:bg-white hover:text-black transition-all duration-300 font-mono text-sm group"
              >
                <Mail className="w-4 h-4" />
                GET IN TOUCH
                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </motion.div>
          </section>

        </main>

        <footer className="relative border-t border-white/5 py-16 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <span className="font-mono text-sm text-white/60">RAENALDI ARDIANSYAH S.</span>
            <a href="mailto:raenaldi.ardiansyah30@gmail.com"
              className="text-xs font-mono text-white/30 hover:text-white/60 transition-colors">
              raenaldi.ardiansyah30@gmail.com
            </a>
            <div className="flex items-center gap-3">
              <SocialLink href="https://github.com/raenaldiardiansyah"            icon={Github}   label="GitHub" />
              <SocialLink href="https://www.linkedin.com/in/raenaldi-ardiansyah/" icon={Linkedin} label="LinkedIn" />
              <SocialLink href="mailto:raenaldi.ardiansyah30@gmail.com"           icon={Mail}     label="Email" />
            </div>
          </div>
        </footer>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&display=swap');
        @keyframes va {
          0%,100% { opacity:.2; transform:scaleY(1); }
          50%      { opacity:.65; transform:scaleY(1.1); }
        }
      `}</style>
    </div>
  );
}