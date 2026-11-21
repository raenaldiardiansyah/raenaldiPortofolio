import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Mail } from "lucide-react";
import { categories, projects, type Project, type ProjectCategory } from "../data/projects";
import { buttonLook, EMAIL, ExternalLink, GITHUB, LINKEDIN, SiteLayout, StatusTag } from "../components/site-layout";
import { Button } from "../components/ui/button";
import BlurText from "../components/ui/BlurText";
import ModelViewer from "../components/model-viewer";
import { landHome } from "../lib/scroll";

export const skills: { group: string; items: string[] }[] = [
  { group: "Languages", items: ["TypeScript", "JavaScript", "C/C++", "Python", "Java"] },
  { group: "Embedded & robotics", items: ["ESP32", "STM32", "Arduino", "NVIDIA Jetson", "ROS 2", "MQTT", "Sensors & actuators", "PCB design"] },
  { group: "Web", items: ["React", "Next.js", "Tailwind CSS", "Vite", "Supabase", "PostgreSQL"] },
  { group: "Tools", items: ["Git", "KiCad", "Figma", "VS Code", "Arduino IDE"] },
];

export const experience = [
  { period: "Now", title: "Laboratory Assistant", org: "INACOS Laboratory, Telkom University" },
  { period: "2026 — now", title: "Internal Relations Department", org: "Computer Engineering Student Association, Telkom University" },
  { period: "2024 — now", title: "Computer Engineering", org: "Telkom University" },
];

// Counted from the project list, so they stay true when it changes.
export const facts = [
  { value: projects.length, label: "Projects" },
  { value: projects.filter((p) => p.status === "Live").length, label: "Live on the web" },
  { value: projects.filter((p) => p.category === "Robotics & IoT").length, label: "Robotics & IoT builds" },
];

type Filter = "All" | ProjectCategory;

// shortcut: the timeline column shows a single year, make it a range once projects run into 2027.
const AXIS_YEAR = 2026;
const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/** Months of AXIS_YEAR a project covers, or null when it lies wholly outside that year. */
function monthSpan({ start, end }: Project) {
  const now = new Date();
  const [startYear, startMonth] = start.split("-").map(Number);
  const [endYear, endMonth] = end ? end.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  if (endYear < AXIS_YEAR || startYear > AXIS_YEAR) return null;
  return {
    from: startYear < AXIS_YEAR ? 1 : startMonth,
    to: endYear > AXIS_YEAR ? 12 : endMonth,
    startsEarlier: startYear < AXIS_YEAR,
  };
}

function MonthGrid() {
  return (
    <span aria-hidden="true" className="absolute inset-0 grid grid-cols-12">
      {MONTHS.map((_, i) => (
        <span key={i} className={i === 0 ? "" : "border-l border-border/60"} />
      ))}
    </span>
  );
}

// One project's bar on the shared month axis. Decorative: the same dates are in the row as text.
function TimelineBar({ project }: { project: Project }) {
  const span = monthSpan(project);
  const ongoing = !project.end;
  return (
    <span aria-hidden="true" title={project.timeline} className="relative block h-5 w-44">
      <MonthGrid />
      {span ? (
        <motion.span
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
          style={{
            left: `${((span.from - 1) / 12) * 100}%`,
            width: `${((span.to - span.from + 1) / 12) * 100}%`,
            transformOrigin: "left",
          }}
          className={`absolute top-1/2 h-1.5 -translate-y-1/2 ${ongoing ? "bg-signal" : "bg-foreground"} ${
            span.startsEarlier ? "rounded-r-full" : "rounded-full"
          }`}
        />
      ) : (
        <span className="absolute inset-y-0 left-1.5 flex items-center bg-background px-1 font-mono text-xs text-muted-foreground">
          {project.year}
        </span>
      )}
    </span>
  );
}

function Section({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-label`} className="grid gap-x-8 gap-y-6 border-t py-14 md:grid-cols-[10rem_1fr] md:py-20">
      <h2 id={`${id}-label`} className="label">
        {label}
      </h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function MobileHome() {
  const [filter, setFilter] = useState<Filter>("All");
  const current = projects.find((p) => p.status === "In development");
  const shown = projects.filter((p) => filter === "All" || p.category === filter);
  const filters: Filter[] = ["All", ...categories];

  // Runs after the first render, so the section a hash points at exists.
  useEffect(landHome, []);

  return (
    <SiteLayout>
      {/* Intro */}
      <section className="pb-12 pt-16 md:pb-16 md:pt-28">
        <p className="label rise">Raenaldi Ardiansyah Sidik — Bandung, Indonesia</p>
        <BlurText
          as="h1"
          text={"I build websites, robots and the circuit boards inside\u00A0them."}
          trigger="load"
          delay={45}
          blur={8}
          distance={14}
          direction="bottom"
          className="mt-6 max-w-3xl text-4xl font-medium leading-[1.1] tracking-tight sm:text-5xl md:text-6xl"
        />
        <div className="rise [animation-delay:350ms]">
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Computer engineering student at Telkom University. Besides software, I understand the electrical side: web
            apps and firmware on one hand, wiring, power and PCB design on the other.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button asChild className={buttonLook.solid}>
              <a href="#work">
                See the work
                <ArrowRight aria-hidden="true" />
              </a>
            </Button>
            <ExternalLink href={GITHUB}>GitHub</ExternalLink>
            <ExternalLink href={LINKEDIN}>LinkedIn</ExternalLink>
            <a href={`mailto:${EMAIL}`} className="link">
              Email
            </a>
          </div>
        </div>
      </section>

      {/* Facts strip */}
      <dl className="grid divide-y border-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {facts.map(({ value, label }) => (
          <div key={label} className="flex items-baseline gap-3 py-5 sm:flex-col sm:gap-1 sm:px-6 sm:first:pl-0">
            <dd className="order-first font-mono text-3xl font-medium tabular-nums tracking-tight">
              {String(value).padStart(2, "0")}
            </dd>
            <dt className="text-sm text-muted-foreground">{label}</dt>
          </div>
        ))}
      </dl>

      {/* What is on the bench right now */}
      {current && (
        <section aria-labelledby="now-label" className="grid gap-x-8 gap-y-6 py-14 md:grid-cols-[10rem_1fr] md:py-20">
          <h2 id="now-label" className="label">
            Now building
          </h2>
          <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
            <div>
              <StatusTag status={current.status} />
              <h3 className="mt-3 text-2xl font-medium tracking-tight sm:text-3xl">
                <Link
                  href={`/work/${current.slug}`}
                  className="underline decoration-transparent underline-offset-4 transition-colors duration-150 hover:decoration-signal"
                >
                  {current.title}
                </Link>
              </h3>
              <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">{current.summary}</p>
              {current.log && (
                <ol className="mt-6 border-t">
                  {current.log.slice(0, 3).map((entry) => (
                    <li key={entry.text} className="grid gap-x-6 gap-y-1 border-b py-3 text-sm sm:grid-cols-[5.5rem_1fr]">
                      <span className="font-mono text-xs leading-6 text-muted-foreground">{entry.date}</span>
                      <span className="leading-6">{entry.text}</span>
                    </li>
                  ))}
                </ol>
              )}
              <Link
                href={`/work/${current.slug}`}
                className="link mt-6 inline-flex items-center gap-2 text-sm font-medium"
              >
                Read the full write-up
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            {current.model ? (
              <figure>
                <ModelViewer src={current.model.src} label={current.model.label} />
                <figcaption className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {current.model.caption}
                </figcaption>
              </figure>
            ) : (
              current.image && (
                <figure>
                  <img
                    src={current.image.src}
                    alt={current.image.alt}
                    width={current.image.width}
                    height={current.image.height}
                    className="w-full border bg-card"
                  />
                  <figcaption className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {current.image.caption}
                  </figcaption>
                </figure>
              )
            )}
          </div>
        </section>
      )}

      {/* Project index */}
      <Section id="work" label={`Work (${projects.length})`}>
        <div role="group" aria-label="Filter projects" className="inline-flex flex-wrap border p-1">
          {filters.map((f) => {
            const count = f === "All" ? projects.length : projects.filter((p) => p.category === f).length;
            const pressed = filter === f;
            return (
              <button
                key={f}
                type="button"
                aria-pressed={pressed}
                onClick={() => setFilter(f)}
                className={`relative inline-flex h-11 cursor-pointer items-center gap-2 px-4 text-sm transition-colors duration-150 ${
                  pressed ? "text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {pressed && (
                  <motion.span
                    layoutId="filter-marker"
                    aria-hidden="true"
                    className="absolute inset-0 bg-foreground"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                  />
                )}
                <span className="relative">{f}</span>
                <span className="relative font-mono text-xs opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Column headings, including the month axis the bars below are read against. */}
        <div
          aria-hidden="true"
          className="mt-8 hidden grid-cols-[2.5rem_1fr_11rem_9.5rem] items-end gap-x-6 px-3 pb-2 lg:grid"
        >
          <span className="label">No.</span>
          <span className="label">Project</span>
          <span>
            <span className="label block pb-1">{AXIS_YEAR}</span>
            <span className="grid w-44 grid-cols-12 font-mono text-xs text-muted-foreground">
              {MONTHS.map((m, i) => (
                <span key={i} className="pl-1">
                  {m}
                </span>
              ))}
            </span>
          </span>
          <span className="label text-right">Status</span>
        </div>

        <ol className="mt-8 border-t lg:mt-0">
          <AnimatePresence initial={false} mode="popLayout">
            {shown.map((p) => (
              <motion.li
                key={p.slug}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, layout: { type: "spring", bounce: 0, duration: 0.4 } }}
                className="border-b bg-background"
              >
                <Link
                  href={`/work/${p.slug}`}
                  className="group grid gap-x-6 gap-y-2 py-5 transition-colors duration-150 hover:bg-card sm:grid-cols-[2.5rem_1fr_auto] sm:px-3 lg:grid-cols-[2.5rem_1fr_11rem_9.5rem]"
                >
                  <span className="hidden pt-1 font-mono text-xs text-muted-foreground sm:block">
                    {String(projects.indexOf(p) + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <span className="flex items-baseline gap-2 text-lg font-medium tracking-tight">
                      <span className="underline decoration-transparent underline-offset-4 transition-colors duration-150 group-hover:decoration-signal">
                        {p.title}
                      </span>
                      <ArrowRight
                        className="size-4 shrink-0 translate-y-0.5 text-signal opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="mt-1 block max-w-xl text-sm leading-relaxed text-muted-foreground">{p.summary}</span>
                  </span>
                  <span className="hidden pt-1 lg:block">
                    <TimelineBar project={p} />
                  </span>
                  <span className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:flex-col sm:items-end sm:gap-1.5 sm:pt-1">
                    <StatusTag status={p.status} />
                    <span className="font-mono text-xs text-muted-foreground">
                      {p.category}
                      <span className="lg:hidden"> · {p.year}</span>
                      <span className="sr-only">, {p.timeline}</span>
                    </span>
                  </span>
                </Link>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      </Section>

      {/* About */}
      <Section id="about" label="About">
        <div className="max-w-2xl space-y-4 text-lg leading-relaxed">
          <p>
            I work on both sides of the wire. I write web apps and firmware, and I also handle the electrical side: the
            wiring, the power, and the PCB it all sits on. Some projects are pure web, some are robots, and the ones I
            enjoy most need both.
          </p>
          <p className="text-muted-foreground">
            Lately that has meant ROS 2 on a Jetson Orin Nano and STM32 firmware for a mobile robot, KiCad boards for
            that robot and a line-following AGV, and competition projects in Next.js.
          </p>
        </div>

        <dl className="mt-10 border-t">
          {skills.map(({ group, items }) => (
            <div key={group} className="grid gap-x-6 gap-y-1 border-b py-4 sm:grid-cols-[11rem_1fr]">
              <dt className="text-sm text-muted-foreground">{group}</dt>
              <dd className="text-sm leading-relaxed">{items.join(", ")}</dd>
            </div>
          ))}
        </dl>

        <h3 className="label mt-12">Education & organisation</h3>
        <ol className="mt-4 border-t">
          {experience.map(({ period, title, org }) => (
            <li key={title} className="grid gap-x-6 gap-y-1 border-b py-4 sm:grid-cols-[11rem_1fr]">
              <span className="font-mono text-xs leading-6 text-muted-foreground">{period}</span>
              <span>
                <span className="block font-medium">{title}</span>
                <span className="block text-sm text-muted-foreground">{org}</span>
              </span>
            </li>
          ))}
        </ol>
      </Section>

      {/* Contact */}
      <Section id="contact" label="Contact">
        <h3 className="max-w-2xl text-3xl font-medium leading-tight tracking-tight sm:text-4xl">
          Have a project in mind, or a question about something I built?
        </h3>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Email is the fastest way to reach me.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild className={buttonLook.solid}>
            <a href={`mailto:${EMAIL}`}>
              <Mail aria-hidden="true" />
              Send an email
            </a>
          </Button>
          <Button asChild variant="outline" className={buttonLook.outline}>
            <a href={LINKEDIN} target="_blank" rel="noopener noreferrer">
              LinkedIn
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </Button>
        </div>
        <p className="mt-6 break-all font-mono text-sm text-muted-foreground">{EMAIL}</p>
      </Section>
    </SiteLayout>
  );
}

// Tablets and up get the 3D desktop home; phones keep the page above. three.js loads only for the desktop one.
const DesktopHome = lazy(() => import("./HomeDesktop"));
const DESKTOP = "(min-width: 768px)";

export default function Home() {
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP).matches);
  useEffect(() => {
    const query = window.matchMedia(DESKTOP);
    const onChange = () => setDesktop(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  if (!desktop) return <MobileHome />;
  return (
    <Suspense fallback={<div className="desk min-h-screen" />}>
      <DesktopHome />
    </Suspense>
  );
}
