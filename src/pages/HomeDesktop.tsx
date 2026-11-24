import { useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { ArrowRight, ArrowUpRight, Mail } from "lucide-react";
import { projects } from "../data/projects";
import { buttonLook, EMAIL, ExternalLink, GITHUB, LINKEDIN, SiteLayout, StatusTag } from "../components/site-layout";
import { Button } from "../components/ui/button";
import BlurText from "../components/ui/BlurText";
import ModelViewer from "../components/model-viewer";
import { ThreeCanvas } from "../components/three/three-canvas";
import { WorkMenu } from "../components/work-menu";
import { RobotViews } from "../components/robot-views";
import { robotHead } from "../components/three/scenes";
import { SkillMap } from "../components/skill-map";
import { landHome } from "../lib/scroll";
import { splashReady } from "../lib/splash";
import { experience, skills } from "./Home";

const ease = [0.2, 0.7, 0.2, 1] as const;

function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.7, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// A button that leans towards the cursor a little.
function Magnetic({ children }: { children: ReactNode }) {
  const x = useSpring(0, { stiffness: 220, damping: 16 });
  const y = useSpring(0, { stiffness: 220, damping: 16 });
  if (useReducedMotion()) return <span className="inline-block">{children}</span>;
  return (
    <motion.span
      className="inline-block"
      style={{ x, y }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * 0.3);
        y.set((e.clientY - r.top - r.height / 2) * 0.3);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.span>
  );
}

const shown = projects.filter((p) => p.image);

// Every project with a picture, as stacked rows: hover, focus or a first tap opens one into a landscape
// panel (the screenshots are about 2:1), a second tap opens its write-up.
function ProjectRecap() {
  const [open, setOpen] = useState(0);
  return (
    <aside aria-labelledby="recap-title" className="rise [animation-delay:250ms]">
      <h2 id="recap-title" className="sr-only">
        Project recap
      </h2>
      {/* On short screens the rows tighten and the open panel shortens, so the whole list stays in view. */}
      <ol className="flex h-[36rem] lg:h-[min(36rem,calc(100svh-7.5rem))] flex-col gap-1">
        {shown.map((p, i) => {
          const isOpen = i === open;
          return (
            <motion.li
              key={p.slug}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.35 + i * 0.05, ease }}
              className={`min-h-0 transition-[flex] duration-700 ease-out motion-reduce:transition-none ${isOpen ? "flex-[1_1_0%]" : "flex-[0_0_clamp(1.75rem,4.5svh,2.25rem)]"}`}
            >
              <Link
                href={`/work/${p.slug}`}
                onMouseEnter={() => setOpen(i)}
                onFocus={() => setOpen(i)}
                onClick={(e) => {
                  if (!isOpen) {
                    e.preventDefault();
                    setOpen(i);
                  }
                }}
                className={`group relative block h-full overflow-hidden border transition-[border-radius] duration-700 ${isOpen ? "rounded-2xl" : "rounded-lg"}`}
              >
                <img
                  src={p.image!.src}
                  alt=""
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className={`absolute inset-0 size-full object-cover transition-[transform,opacity] duration-700 motion-reduce:transition-none ${isOpen ? "scale-100 opacity-100" : "scale-110 opacity-0"}`}
                />
                <span
                  aria-hidden="true"
                  className={`absolute inset-0 transition-colors duration-700 ${isOpen ? "bg-gradient-to-t from-background from-5% via-background/70 via-35% to-transparent to-75%" : "bg-card group-hover:bg-muted"}`}
                />
                <span
                  className={`absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 ${isOpen ? "p-5" : "h-full px-4"}`}
                >
                  <span className="flex min-w-0 items-baseline gap-3">
                    <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    <span className="min-w-0">
                      <span className={`block truncate ${isOpen ? "text-lg font-medium" : "text-sm text-muted-foreground group-hover:text-foreground"}`}>
                        {p.title}
                      </span>
                      {isOpen && (
                        <span className="block truncate font-mono text-xs text-muted-foreground">
                          {p.status} · {p.timeline}
                        </span>
                      )}
                    </span>
                  </span>
                  {isOpen && <ArrowUpRight aria-hidden="true" className="size-5 shrink-0 text-signal" />}
                </span>
              </Link>
            </motion.li>
          );
        })}
      </ol>
    </aside>
  );
}

function Heading({ title, aside }: { title: ReactNode; aside?: ReactNode }) {
  return (
    <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b pb-6">
      <h2 className="max-w-2xl text-4xl font-medium leading-[1.05] tracking-tight lg:text-5xl">{title}</h2>
      {aside}
    </Reveal>
  );
}

export default function HomeDesktop() {
  const current = projects.find((p) => p.status === "In development");
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });

  // Runs after the first render, so the section a hash points at exists.
  useEffect(landHome, []);
  useEffect(splashReady, []);

  return (
    <div className="desk min-h-screen overflow-x-clip">
      <motion.div
        aria-hidden="true"
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-signal"
      />
      <SiteLayout reveal>
        {/* Hero: the intro, with a recap of every project beside it. */}
        <section className="relative left-1/2 flex min-h-[640px] w-screen -translate-x-1/2 items-center py-16 lg:h-[calc(100svh-3.5rem)] lg:min-h-[30rem] lg:py-8">
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,36rem)]">
            <div>
              <p className="label rise flex items-center gap-3">
                <span className="relative flex size-2">
                  <span className="absolute inset-0 animate-ping rounded-full motion-reduce:animate-none bg-signal opacity-60" />
                  <span className="relative size-2 rounded-full bg-signal" />
                </span>
                Raenaldi A. S. · Bandung
              </p>
              <BlurText
                as="h1"
                text={"Websites, robots, and the circuit boards inside them."}
                trigger="load"
                delay={45}
                blur={10}
                distance={18}
                direction="bottom"
                className="mt-5 max-w-md text-4xl font-medium leading-[1.05] tracking-tight lg:text-5xl"
              />
              <div className="rise [animation-delay:400ms]">
                <p className="mt-6 font-mono text-sm text-muted-foreground">
                  Software <span className="text-signal">+</span> electrical · Computer Engineering, Telkom University
                </p>
                <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Magnetic>
                    <Button asChild className={`${buttonLook.solid} border-signal bg-signal text-background`}>
                      <a href="#work">
                        See the work
                        <ArrowRight aria-hidden="true" />
                      </a>
                    </Button>
                  </Magnetic>
                  <ExternalLink href={GITHUB}>GitHub</ExternalLink>
                  <ExternalLink href={LINKEDIN}>LinkedIn</ExternalLink>
                  <a href={`mailto:${EMAIL}`} className="link">
                    Email
                  </a>
                </div>
              </div>
            </div>
            <ProjectRecap />
          </div>
        </section>

        {/* Now building */}
        {current && (
          <section aria-labelledby="now-title" className="pb-16 pt-24">
            <Heading title={<span id="now-title">On the bench right now</span>} />
            <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
              <Reveal className="pt-2">
                <StatusTag status={current.status} />
                <h3 className="mt-4 text-3xl font-medium tracking-tight">
                  <Link href={`/work/${current.slug}`} className="link no-underline">
                    {current.title}
                  </Link>
                </h3>
                <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">{current.summary}</p>
                <ul className="mt-6 flex flex-wrap gap-2">
                  {current.stack.map((s) => (
                    <li key={s} className="border px-2.5 py-1 font-mono text-xs text-muted-foreground">
                      {s}
                    </li>
                  ))}
                </ul>
                {current.log && (
                  <ol className="relative mt-8 space-y-5 border-l border-moss/40 pl-6">
                    {current.log.slice(0, 3).map((entry, i) => (
                      <motion.li
                        key={entry.text}
                        initial={{ opacity: 0, x: -12 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.15 + i * 0.12, duration: 0.5, ease }}
                        className="relative text-sm"
                      >
                        <span
                          aria-hidden="true"
                          className={`absolute -left-[1.85rem] top-1.5 size-2.5 rounded-full border-2 border-background ${
                            i === 0 ? "bg-signal" : "bg-moss"
                          }`}
                        />
                        <span className="block font-mono text-xs text-muted-foreground">{entry.date}</span>
                        <span className="mt-1 block leading-6">{entry.text}</span>
                      </motion.li>
                    ))}
                  </ol>
                )}
                <Link
                  href={`/work/${current.slug}`}
                  className="link mt-8 inline-flex items-center gap-2 text-sm font-medium"
                >
                  Read the full write-up
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Reveal>
              {current.model && (
                <Reveal delay={0.1}>
                  {current.model.navigation ? (
                    <RobotViews model={current.model} />
                  ) : (
                    <figure>
                      <ModelViewer src={current.model.src} label={current.model.label} parts />
                      <figcaption className="pt-3 text-xs leading-relaxed text-muted-foreground">
                        {current.model.caption}
                      </figcaption>
                    </figure>
                  )}
                </Reveal>
              )}
            </div>
          </section>
        )}

        {/* Work: pick a category, pick a project, then page through its details. */}
        <section id="work" aria-labelledby="work-title" className="py-16">
          <WorkMenu header={(filters) => <Heading title={<span id="work-title">Selected work</span>} aside={filters} />} />
        </section>

        {/* About: text and timeline beside a skill map you can walk into. */}
        <section id="about" aria-labelledby="about-title" className="py-16">
          <Heading title={<span id="about-title">The code and the circuit</span>} />
          <div className="grid items-start gap-10 lg:grid-cols-[1fr_1fr]">
            <Reveal>
              <div className="space-y-4 text-lg leading-relaxed">
                <p>
                  I work on both sides of the wire. I write web apps and firmware, and I also handle the electrical
                  side: the wiring, the power, and the PCB it all sits on. Some projects are pure web, some are robots,
                  and the ones I enjoy most need both.
                </p>
                <p className="text-muted-foreground">
                  Lately that has meant ROS 2 on a Jetson Orin Nano and STM32 firmware for a mobile robot, KiCad
                  boards for that robot and a line-following AGV, and competition projects in Next.js.
                </p>
              </div>
              <h3 className="label mt-12">Education & organisation</h3>
              <ol className="mt-4 border-t">
                {experience.map(({ period, title, org }) => (
                  <li key={title} className="grid grid-cols-[8rem_1fr] gap-x-6 border-b py-4">
                    <span className="font-mono text-xs leading-6 text-moss">{period}</span>
                    <span>
                      <span className="block font-medium">{title}</span>
                      <span className="block text-sm text-muted-foreground">{org}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </Reveal>

            <Reveal delay={0.1}>
              <SkillMap groups={skills} />
            </Reveal>
          </div>
        </section>

        {/* Contact: the question on top, the robot head in the middle (it opens when you point at it), the ways to reach me below. */}
        <section
          id="contact"
          aria-labelledby="contact-title"
          className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden rounded-b-[2rem] border-t"
        >
          <div className="mx-auto flex max-w-6xl flex-col items-center px-8 pb-20 pt-24 text-center">
            <h2 id="contact-title" className="max-w-3xl text-balance text-5xl font-medium leading-[1.05] tracking-tight">
              Need someone who can write the code and design the board?
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">Email is the fastest way to reach me.</p>
            <ThreeCanvas setup={robotHead} className="mt-4 h-[340px] w-full max-w-xl lg:h-[380px]" />
            <div>
              <div className="flex flex-wrap justify-center gap-3">
                <Magnetic>
                  <Button asChild className={`${buttonLook.solid} border-signal bg-signal text-background`}>
                    <a href={`mailto:${EMAIL}`}>
                      <Mail aria-hidden="true" />
                      Send an email
                    </a>
                  </Button>
                </Magnetic>
                <Button asChild variant="outline" className={`${buttonLook.outline} bg-background/40`}>
                  <a href={LINKEDIN} target="_blank" rel="noopener noreferrer">
                    LinkedIn
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </Button>
              </div>
              <p className="mt-6 font-mono text-sm text-muted-foreground">{EMAIL}</p>
            </div>
          </div>
        </section>
      </SiteLayout>
    </div>
  );
}
