import * as React from "react";
import { useRef } from "react";
import { ChevronRight, X, ExternalLink } from "lucide-react";
import { Button } from "./button";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { gsap } from "gsap";

export type FeaturedProject = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  href?: string;
  color?: string;
  image?: string;
  link?: string;
};

// ─── CSS keyframes injected once ─────────────────────────────────────────────
const MARQUEE_STYLE = `
  @keyframes marquee-left {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes marquee-right {
    0%   { transform: translateX(-50%); }
    100% { transform: translateX(0); }
  }
  .marquee-left {
    animation: marquee-left 35s linear infinite;
  }
  .marquee-right {
    animation: marquee-right 40s linear infinite;
  }
  .marquee-paused {
    animation-play-state: paused !important;
  }
`;

// ─── Rail color themes ────────────────────────────────────────────────────────
const RAIL_THEMES = {
  amber: {
    border:      "rgba(200,120,30,0.25)",
    borderHover: "rgba(200,120,30,0.6)",
    tagBorder:   "rgba(200,120,30,0.2)",
    tagText:     "rgba(200,120,30,0.6)",
    tagHoverBorder: "rgba(200,120,30,0.5)",
    tagHoverText:   "rgba(200,120,30,0.9)",
    glow:        "rgba(200,120,30,0.07)",
    accent:      "rgba(200,120,30,0.15)",
  },
  cyan: {
    border:      "rgba(34,211,238,0.2)",
    borderHover: "rgba(34,211,238,0.5)",
    tagBorder:   "rgba(34,211,238,0.15)",
    tagText:     "rgba(34,211,238,0.5)",
    tagHoverBorder: "rgba(34,211,238,0.45)",
    tagHoverText:   "rgba(34,211,238,0.85)",
    glow:        "rgba(34,211,238,0.05)",
    accent:      "rgba(34,211,238,0.12)",
  },
} as const;

type RailTheme = keyof typeof RAIL_THEMES;

// ─── Themed ProjectCard ───────────────────────────────────────────────────────
function ThemedProjectCard({
  project,
  theme,
  className,
  onHoverChange,
}: {
  project: FeaturedProject;
  theme: RailTheme;
  className?: string;
  onHoverChange?: (hovered: boolean) => void;
}) {
  const [, setLocation] = useLocation();
  const t = RAIL_THEMES[theme];
  const cardRef    = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const cardBgMap: Record<RailTheme, string> = {
    amber: "rgba(200,120,30,0.25)",
    cyan:  "rgba(34,211,238,0.18)",
  };

  const findClosestEdge = (mouseX: number, mouseY: number, w: number, h: number): "top" | "bottom" => {
    const top    = Math.pow(mouseX - w / 2, 2) + Math.pow(mouseY, 2);
    const bottom = Math.pow(mouseX - w / 2, 2) + Math.pow(mouseY - h, 2);
    return top < bottom ? "top" : "bottom";
  };

  const handleMouseEnter = (ev: React.MouseEvent<HTMLElement>) => {
    if (!cardRef.current || !overlayRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const edge = findClosestEdge(ev.clientX - rect.left, ev.clientY - rect.top, rect.width, rect.height);
    gsap.killTweensOf(overlayRef.current);
    gsap.fromTo(
      overlayRef.current,
      { y: edge === "top" ? "-101%" : "101%" },
      { y: "0%", duration: 0.45, ease: "expo.out" }
    );
    onHoverChange?.(true);
  };

  const handleMouseLeave = (ev: React.MouseEvent<HTMLElement>) => {
    if (!cardRef.current || !overlayRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const edge = findClosestEdge(ev.clientX - rect.left, ev.clientY - rect.top, rect.width, rect.height);
    gsap.killTweensOf(overlayRef.current);
    gsap.to(overlayRef.current, {
      y: edge === "top" ? "-101%" : "101%",
      duration: 0.45,
      ease: "expo.inOut",
    });
    onHoverChange?.(false);
  };

  return (
    <article
      ref={cardRef}
      className={cn(
        "group relative flex h-[280px] w-[240px] shrink-0 flex-col overflow-hidden bg-black/50",
        "transition-[border-color] duration-300",
        project.link && "cursor-pointer",
        className
      )}
      style={{ border: `1px solid ${t.border}` }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={project.link ? () => setLocation(project.link!) : undefined}
    >
      {/* Closest-edge color overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: cardBgMap[theme],
          transform: "translateY(101%)",
        }}
      />

      {/* Image */}
      <div
        className={cn(
          "relative z-10 h-[110px] w-full bg-gradient-to-b overflow-hidden shrink-0",
          project.color ?? "from-neutral-800 to-neutral-900"
        )}
      >
        {project.image && (
          <img
            src={project.image}
            alt={project.title}
            className="absolute inset-0 h-full w-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        {project.link && (
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            <div
              className="w-8 h-8 flex items-center justify-center transition-all"
              style={{ border: `1px solid ${t.borderHover}`, background: "rgba(0,0,0,0.6)" }}
            >
              <ExternalLink className="w-3 h-3" style={{ color: t.tagHoverText }} />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col px-4 pb-4 pt-3">
        <h3 className="text-sm font-semibold text-white font-outfit transition-colors">
          {project.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-xs text-white/40 leading-relaxed">
          {project.description}
        </p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 text-[9px] font-mono transition-all"
              style={{
                border: `1px solid ${t.tagBorder}`,
                color: t.tagText,
                background: "rgba(0,0,0,0.4)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Corner accents */}
      <div
        className="absolute top-0 left-0 w-4 h-4 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300"
        style={{ borderTop: `1px solid ${t.borderHover}`, borderLeft: `1px solid ${t.borderHover}` }}
      />
      <div
        className="absolute bottom-0 right-0 w-4 h-4 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300"
        style={{ borderBottom: `1px solid ${t.borderHover}`, borderRight: `1px solid ${t.borderHover}` }}
      />
    </article>
  );
}

// ─── Single CSS-animated rail ─────────────────────────────────────────────────
function ScrollRail({
  projects,
  direction = "left",
  theme,
}: {
  projects: FeaturedProject[];
  direction?: "left" | "right";
  theme: RailTheme;
}) {
  const [paused, setPaused] = React.useState(false);

  const copies = Math.max(4, Math.ceil(8 / projects.length));
  const repeated = Array.from({ length: copies }, () => projects).flat();

  const animClass = direction === "left" ? "marquee-left" : "marquee-right";

  const [cardHovered, setCardHovered] = React.useState(false);

  return (
    <div
      className="overflow-hidden w-full py-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className={cn("flex gap-6 px-6 w-max", animClass, paused && "marquee-paused")}
        style={{ willChange: "transform" }}
      >
        {repeated.map((p, idx) => (
          <ThemedProjectCard
            key={`${p.id}-${direction}-${idx}`}
            project={p}
            theme={theme}
            onHoverChange={setCardHovered}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function FeaturedProjectsRail({
  title,
  subtitle,
  projects,
}: {
  title: string;
  subtitle?: string;
  projects: FeaturedProject[];
}) {
  const [showAll, setShowAll] = React.useState(false);

  return (
    <div className="relative overflow-hidden py-10">
      {/* Inject CSS keyframes once */}
      <style>{MARQUEE_STYLE}</style>

      <div className="relative px-6 max-w-7xl mx-auto">
        {/* Title */}
        <div className="flex items-center justify-center gap-6 mb-10">
          <div className="h-px w-20 bg-gradient-to-r from-transparent to-white/30" />
          <h2 className="text-sm font-mono text-white/40 tracking-widest">{title}</h2>
          <div className="h-px w-20 bg-gradient-to-l from-transparent to-white/30" />
        </div>

        {/* Subtitle & View All */}
        <div className="flex items-end justify-between max-w-7xl mx-auto">
          <div>
            {subtitle && (
              <p className="text-white/30 text-sm font-outfit">{subtitle}</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="group rounded-none text-white/50 border-white/20 hover:border-white/50 hover:bg-white/5 transition-all font-mono text-xs"
          >
            {showAll ? (
              <>
                <X className="mr-2 h-3 w-3" />
                CLOSE
              </>
            ) : (
              <>
                VIEW ALL
                <ChevronRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Rails / Grid */}
      <div className="relative mt-10">
        <AnimatePresence mode="wait">
          {!showAll ? (
            <motion.div
              key="dual-scroll"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-6"
            >
              {/* Rail 1 — ke KIRI, warna Amber */}
              <ScrollRail projects={projects} direction="left" theme="amber" />

              {/* Rail 2 — ke KANAN, warna Cyan */}
              <ScrollRail projects={projects} direction="right" theme="cyan" />
            </motion.div>
          ) : (
            <motion.div
              key="grid-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="max-w-7xl mx-auto px-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {projects.map((p) => (
                  <ThemedProjectCard key={p.id} project={p} theme="amber" className="w-full" />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gradient fade edges */}
        {!showAll && (
          <>
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-40 bg-gradient-to-r from-black to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-40 bg-gradient-to-l from-black to-transparent" />
          </>
        )}
      </div>
    </div>
  );
}