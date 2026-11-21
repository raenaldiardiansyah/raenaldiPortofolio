import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { categories, projects, type ProjectCategory } from "../data/projects";
import { ExternalLink, StatusTag } from "./site-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ThreeCanvas } from "./three/three-canvas";
import { workTimeline, type TimelineApi } from "./three/work-timeline";

type Filter = "All" | ProjectCategory;
type Tab = "Overview" | "Highlights" | "Stack" | "Log";
const ease = [0.2, 0.7, 0.2, 1] as const;
const pad = (n: number) => String(n).padStart(2, "0");

// Months counted from January of the earliest project's year; an open-ended project runs to this month.
const firstYear = Math.min(...projects.map((p) => Number(p.start.slice(0, 4))));
const month = (ym: string) => (Number(ym.slice(0, 4)) - firstYear) * 12 + Number(ym.slice(5, 7)) - 1;
const today = new Date();
const now = (today.getFullYear() - firstYear) * 12 + today.getMonth();
const items = projects.map((p) => ({
  slug: p.slug,
  title: p.title,
  lane: categories.indexOf(p.category),
  start: month(p.start),
  end: p.end ? month(p.end) : now,
  ongoing: !p.end,
}));
const span = Math.max(now, ...items.map((i) => i.end)) + 2;

/**
 * Selected work: every project on one 3D timeline (when, how long, which kind), then the picked one
 * in full below it. The named buttons under the timeline do the same as clicking a bar.
 */
export function WorkMenu() {
  const [filter, setFilter] = useState<Filter>("All");
  const [slug, setSlug] = useState(projects[0].slug);
  const [tab, setTab] = useState<Tab>("Overview");
  const timeline = useRef<TimelineApi | null>(null);
  const setup = useMemo(() => workTimeline(items, categories, firstYear, span, now), []);

  const filters: Filter[] = ["All", ...categories];
  const shown = projects.filter((p) => filter === "All" || p.category === filter);
  const selected = shown.find((p) => p.slug === slug) ?? shown[0];
  const tabs: Tab[] = selected.log ? ["Overview", "Highlights", "Stack", "Log"] : ["Overview", "Highlights", "Stack"];
  const activeTab = tabs.includes(tab) ? tab : "Overview";

  useEffect(() => {
    if (!timeline.current) return;
    timeline.current.onPick = (s) => {
      setFilter((f) => (f === "All" || projects.find((p) => p.slug === s)?.category === f ? f : "All"));
      setSlug(s);
    };
    timeline.current.select(selected.slug);
    timeline.current.filter(filter === "All" ? null : categories.indexOf(filter));
  }, [selected.slug, filter]);

  // Left and right step through the projects, like a game menu.
  const onKey = (e: KeyboardEvent<HTMLOListElement>) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = shown[(shown.indexOf(selected) + step + shown.length) % shown.length];
    setSlug(next.slug);
    document.getElementById(`work-item-${next.slug}`)?.focus();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div role="group" aria-label="Filter projects" className="inline-flex flex-wrap gap-1">
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
                    layoutId="work-filter"
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
      </div>

      <ThreeCanvas setup={setup} apiRef={timeline} className="mt-4 h-[320px] border-y lg:h-[380px]" />

      <ol onKeyDown={onKey} aria-label="Projects" className="mt-3 flex flex-wrap gap-2">
        {shown.map((p) => {
          const active = p === selected;
          return (
            <li key={p.slug}>
              <button
                id={`work-item-${p.slug}`}
                type="button"
                aria-pressed={active}
                aria-controls="work-detail"
                tabIndex={active ? 0 : -1}
                onClick={() => setSlug(p.slug)}
                className={`relative h-9 min-w-11 cursor-pointer whitespace-nowrap px-2.5 text-xs transition-colors duration-150 ${
                  active ? "text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="work-cursor"
                    aria-hidden="true"
                    className="absolute inset-0 bg-signal"
                    transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                  />
                )}
                <span className="relative">
                  <span className="font-mono opacity-70">{pad(projects.indexOf(p) + 1)}</span> {p.title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <section id="work-detail" aria-live="polite" aria-label={selected.title} className="mt-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={selected.slug}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease }}
            className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
          >
            {/* The whole screenshot, letterboxed, never cropped. */}
            <figure className="self-start">
              <div className="flex max-h-[460px] items-center justify-center overflow-hidden border bg-card">
                {selected.image ? (
                  <img
                    src={selected.image.src}
                    alt={selected.image.alt}
                    width={selected.image.width}
                    height={selected.image.height}
                    className="max-h-[460px] w-auto max-w-full object-contain brightness-[.85]"
                  />
                ) : (
                  <div className="flex aspect-[16/10] w-full items-center justify-center font-mono text-xs text-muted-foreground">
                    No screenshot yet
                  </div>
                )}
              </div>
              {selected.image && (
                <figcaption className="pt-2 text-xs leading-relaxed text-muted-foreground">{selected.image.caption}</figcaption>
              )}
            </figure>

            <div>
              <div className="flex items-center justify-between gap-4">
                <StatusTag status={selected.status} />
                <span className="font-mono text-xs text-muted-foreground">
                  {pad(shown.indexOf(selected) + 1)} / {pad(shown.length)}
                </span>
              </div>
              <h3 className="mt-3 text-3xl font-medium tracking-tight">{selected.title}</h3>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {selected.role} · {selected.timeline}
              </p>

              <Tabs value={activeTab} onValueChange={(v) => setTab(v as Tab)} className="mt-6">
                <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b bg-transparent p-0">
                  {tabs.map((t) => (
                    <TabsTrigger
                      key={t}
                      value={t}
                      className="-mb-px h-10 cursor-pointer rounded-none border-b-2 border-transparent px-3 text-muted-foreground hover:text-foreground data-[state=active]:border-signal data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                    >
                      {t}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <div className="min-h-48 pt-5 text-sm leading-relaxed">
                  <TabsContent value="Overview" className="mt-0 space-y-3">
                    {selected.overview.map((t) => (
                      <p key={t}>{t}</p>
                    ))}
                  </TabsContent>
                  <TabsContent value="Highlights" className="mt-0">
                    <ul className="space-y-2.5">
                      {selected.highlights.map((h) => (
                        <li key={h} className="grid grid-cols-[1rem_1fr]">
                          <span aria-hidden="true" className="text-signal">
                            ›
                          </span>
                          {h}
                        </li>
                      ))}
                    </ul>
                  </TabsContent>
                  <TabsContent value="Stack" className="mt-0">
                    <ul className="flex flex-wrap gap-2">
                      {selected.stack.map((s) => (
                        <li key={s} className="border px-2.5 py-1 font-mono text-xs text-muted-foreground">
                          {s}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-5 text-muted-foreground">{selected.context}</p>
                  </TabsContent>
                  {selected.log && (
                    <TabsContent value="Log" className="mt-0">
                      <ol className="space-y-3">
                        {selected.log.map((e) => (
                          <li key={e.text} className="grid grid-cols-[5.5rem_1fr] gap-x-3">
                            <span className="font-mono text-xs leading-6 text-moss">{e.date}</span>
                            {e.text}
                          </li>
                        ))}
                      </ol>
                    </TabsContent>
                  )}
                </div>
              </Tabs>

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-5 text-sm">
                <Link href={`/work/${selected.slug}`} className="link inline-flex items-center gap-2 font-medium">
                  Read the full write-up
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                {selected.links.map((l) => (
                  <ExternalLink key={l.href} href={l.href}>
                    {l.label}
                  </ExternalLink>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}
