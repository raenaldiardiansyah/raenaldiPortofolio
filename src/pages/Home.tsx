import { useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { categories, projects, type ProjectCategory } from "../data/projects";
import { EMAIL, ExternalLink, GITHUB, LINKEDIN, SiteLayout, StatusTag } from "../components/site-layout";

const skills: { group: string; items: string[] }[] = [
  { group: "Languages", items: ["TypeScript", "JavaScript", "C/C++", "Python", "Java"] },
  { group: "Embedded & robotics", items: ["ESP32", "STM32", "Arduino", "ROS 2", "MQTT", "Sensors & actuators", "PCB design"] },
  { group: "Web", items: ["React", "Next.js", "Tailwind CSS", "Vite", "Supabase", "PostgreSQL"] },
  { group: "Tools", items: ["Git", "KiCad", "Figma", "VS Code", "Arduino IDE"] },
];

const experience = [
  { period: "2026 — now", title: "Internal Relations Department", org: "Computer Engineering Student Association, Telkom University" },
  { period: "2024 — now", title: "Computer Engineering", org: "Telkom University" },
];

type Filter = "All" | ProjectCategory;

function Section({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-label`} className="grid gap-x-8 gap-y-6 border-t py-14 md:grid-cols-[10rem_1fr] md:py-20">
      <h2 id={`${id}-label`} className="label">
        {label}
      </h2>
      <div>{children}</div>
    </section>
  );
}

export default function Home() {
  const [filter, setFilter] = useState<Filter>("All");
  const current = projects.find((p) => p.status === "In development");
  const shown = projects.filter((p) => filter === "All" || p.category === filter);
  const filters: Filter[] = ["All", ...categories];

  // The page arrives with a hash (e.g. /#work from a project page) before React has rendered the target.
  useEffect(() => {
    if (window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
  }, []);

  return (
    <SiteLayout>
      {/* Intro */}
      <section className="rise pb-14 pt-16 md:pb-20 md:pt-28">
        <p className="label">Raenaldi Ardiansyah Sidik — Bandung, Indonesia</p>
        <h1 className="mt-6 max-w-3xl text-4xl font-medium leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
          I build robots, IoT devices and the dashboards that run them.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Computer engineering student at Telkom University. I work where firmware meets the web: motor control and
          sensors on one side, the interface people actually look at on the other.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <a
            href="#work"
            className="inline-flex h-11 items-center gap-2 bg-foreground px-5 text-sm font-medium text-background transition-opacity duration-150 hover:opacity-85"
          >
            See the work
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
          <ExternalLink href={GITHUB}>GitHub</ExternalLink>
          <ExternalLink href={LINKEDIN}>LinkedIn</ExternalLink>
          <a href={`mailto:${EMAIL}`} className="link">
            Email
          </a>
        </div>
      </section>

      {/* What is on the bench right now */}
      {current && (
        <section aria-labelledby="now-label" className="grid gap-x-8 gap-y-6 border-t py-14 md:grid-cols-[10rem_1fr] md:py-20">
          <h2 id="now-label" className="label">
            Now building
          </h2>
          <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
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
            {current.image && (
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
            )}
          </div>
        </section>
      )}

      {/* Project index */}
      <Section id="work" label={`Work (${projects.length})`}>
        <div role="group" aria-label="Filter projects" className="flex flex-wrap gap-2">
          {filters.map((f) => {
            const count = f === "All" ? projects.length : projects.filter((p) => p.category === f).length;
            const pressed = filter === f;
            return (
              <button
                key={f}
                type="button"
                aria-pressed={pressed}
                onClick={() => setFilter(f)}
                className={`inline-flex h-11 cursor-pointer items-center gap-2 border px-4 text-sm transition-colors duration-150 ${
                  pressed
                    ? "border-foreground bg-foreground text-background"
                    : "text-muted-foreground hover:border-foreground hover:text-foreground"
                }`}
              >
                {f}
                <span className="font-mono text-xs opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        <ol className="mt-8 border-t">
          {shown.map((p) => (
            <li key={p.slug} className="border-b">
              <Link
                href={`/work/${p.slug}`}
                className="group grid gap-x-6 gap-y-2 py-5 transition-colors duration-150 hover:bg-card sm:grid-cols-[2.5rem_1fr_auto] sm:px-3"
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
                <span className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-1.5 sm:pt-1">
                  <StatusTag status={p.status} />
                  <span className="font-mono text-xs text-muted-foreground">
                    {p.category} · {p.year}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </Section>

      {/* About */}
      <Section id="about" label="About">
        <div className="max-w-2xl space-y-4 text-lg leading-relaxed">
          <p>
            I treat a system as one thing, from the sensor on the board to the screen an operator reads. Most of my
            projects have both halves: a device that measures or moves, and a web interface that makes its state clear.
          </p>
          <p className="text-muted-foreground">
            Lately that has meant ROS 2 navigation and STM32 firmware for a mobile robot, and competition projects in
            Next.js where the hard part was showing complicated data plainly.
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
        <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
          Have a project in mind, or a question about something I built? Email is the fastest way to reach me.
        </p>
        <a
          href={`mailto:${EMAIL}`}
          className="link mt-6 inline-block break-all text-lg font-medium tracking-tight sm:text-3xl"
        >
          {EMAIL}
        </a>
      </Section>
    </SiteLayout>
  );
}
