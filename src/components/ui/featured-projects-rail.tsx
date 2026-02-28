import * as React from "react";
import { ChevronRight, X, ExternalLink } from "lucide-react";
import { Button } from "./button";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

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

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center border border-white/20 bg-black/50 px-3 py-1 text-[10px] font-mono text-white/50 backdrop-blur-sm hover:border-white/40 hover:text-white/80 transition-all">
      {children}
    </span>
  );
}

function ProjectCard({
  project,
  className,
}: {
  project: FeaturedProject;
  className?: string;
}) {
  const [, setLocation] = useLocation();
  
  const handleClick = () => {
    if (project.link) {
      setLocation(project.link);
    }
  };

  return (
    <article
      className={cn(
        "group relative flex h-[380px] w-[320px] shrink-0 flex-col overflow-hidden border border-white/10 bg-black/50",
        "transition-all duration-500 hover:-translate-y-2 hover:border-white/30",
        project.link && "cursor-pointer",
        className
      )}
      onClick={project.link ? handleClick : undefined}
    >
      {/* Image Section */}
      <div
        className={cn(
          "relative h-[160px] w-full bg-gradient-to-b overflow-hidden",
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
        {/* Overlay effects */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute -left-12 -top-10 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
        </div>
        
        {/* External link icon */}
        {project.link && (
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <div className="w-10 h-10 border border-white/30 bg-black/50 flex items-center justify-center hover:bg-white hover:text-black transition-all">
              <ExternalLink className="w-4 h-4" />
            </div>
          </div>
        )}
      </div>
      
      {/* Content Section */}
      <div className="flex flex-1 flex-col px-6 pb-6 pt-5">
        <h3 className="text-base font-semibold text-white font-outfit group-hover:text-white/90 transition-colors">
          {project.title}
        </h3>
        <p className="mt-3 line-clamp-2 text-sm text-white/40 leading-relaxed">
          {project.description}
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          {project.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      </div>
      
      {/* Hover shadow effect */}
      <div 
        className="absolute inset-0 border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" 
        style={{ transform: 'translate(6px, 6px)', zIndex: -1 }} 
      />
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/0 group-hover:border-white/30 transition-all duration-300" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/0 group-hover:border-white/30 transition-all duration-300" />
    </article>
  );
}

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
  const [isPaused, setIsPaused] = React.useState(false);

  const repeatedProjects = [...projects, ...projects, ...projects];

  return (
    <div className="relative overflow-hidden py-10">
      <div className="relative px-6 max-w-7xl mx-auto">
        {/* Title with decorative lines */}
        <div className="flex items-center justify-center gap-6 mb-10">
          <div className="h-px w-20 bg-gradient-to-r from-transparent to-white/30" />
          <h2 className="text-sm font-mono text-white/40 tracking-widest">{title}</h2>
          <div className="h-px w-20 bg-gradient-to-l from-transparent to-white/30" />
        </div>

        {/* Subtitle and View All button */}
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

      <div className="relative mt-10">
        <AnimatePresence mode="wait">
          {!showAll ? (
            <motion.div
              key="auto-scroll"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex overflow-hidden"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <motion.div
                className="flex gap-6 px-6"
                animate={{
                  x: isPaused ? undefined : [0, -1600],
                }}
                transition={{
                  duration: 35,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                {repeatedProjects.map((p, idx) => (
                  <ProjectCard
                    key={`${p.id}-${idx}`}
                    project={p}
                  />
                ))}
              </motion.div>
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
                  <ProjectCard
                    key={p.id}
                    project={p}
                    className="w-full"
                  />
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