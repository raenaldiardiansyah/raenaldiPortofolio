import { useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import type { ProjectStatus } from "../data/projects";

export const EMAIL = "raenaldi.ardiansyah30@gmail.com";
export const GITHUB = "https://github.com/raenaldiardiansyah";
export const LINKEDIN = "https://www.linkedin.com/in/raenaldi-ardiansyah/";

const NAV = [
  { id: "work", label: "Work" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
] as const;

type SectionId = (typeof NAV)[number]["id"];

/** Shared look for the site's two button kinds; pass to shadcn's Button through className. */
export const buttonLook = {
  solid: "h-11 rounded-none border-foreground bg-foreground px-5 text-background transition-opacity duration-150 hover:opacity-85",
  outline: "h-11 rounded-none border-border px-5 transition-colors duration-150 hover:border-foreground",
};

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">
      {children}
      <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

// Status is always written out; the dot only adds emphasis for work in progress.
export function StatusTag({ status }: { status: ProjectStatus }) {
  const active = status === "In development";
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap font-mono text-xs uppercase tracking-[0.08em]">
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${active ? "bg-signal" : "border border-muted-foreground"}`}
      />
      <span className={active ? "text-foreground" : "text-muted-foreground"}>{status}</span>
    </span>
  );
}

// Which section of the home page is being read, so the nav can mark it.
function useCurrentSection(enabled: boolean) {
  const [current, setCurrent] = useState<SectionId | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(entry.target.id as SectionId);
          else setCurrent((c) => (c === entry.target.id ? null : c));
        }
      },
      // A section counts as current while it crosses a line just under the header.
      { rootMargin: "-30% 0px -69% 0px" },
    );
    for (const { id } of NAV) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [enabled]);
  return current;
}

/** `section` pins the marked nav item (project pages belong to Work); without it the nav follows the scroll. */
export function SiteLayout({ children, section }: { children: ReactNode; section?: SectionId }) {
  const scrolled = useCurrentSection(!section);
  const current = section ?? scrolled;

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <a href="/" className="inline-flex h-11 items-center font-mono text-sm font-medium tracking-tight">
            Raenaldi A. S.
          </a>
          <nav aria-label="Main">
            <ul className="flex items-center">
              {NAV.map((item) => {
                const active = current === item.id;
                return (
                  <li key={item.id}>
                    <a
                      href={`/#${item.id}`}
                      aria-current={active ? "location" : undefined}
                      className={`relative inline-flex h-11 items-center px-3 text-sm transition-colors duration-150 hover:text-foreground ${
                        active ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {item.label}
                      {active && (
                        <motion.span
                          layoutId="nav-marker"
                          aria-hidden="true"
                          className="absolute inset-x-3 bottom-1.5 h-px bg-signal"
                          transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                        />
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-5 sm:px-8">
        {children}
      </main>

      <footer className="mt-24 border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-x-12 gap-y-4 px-5 py-10 text-sm text-muted-foreground sm:px-8">
          <p className="order-last md:order-first">© 2026 Raenaldi Ardiansyah Sidik</p>
          <ul className="order-first flex flex-wrap gap-x-6 gap-y-3 md:order-last">
            {NAV.map((item) => (
              <li key={item.id}>
                <a href={`/#${item.id}`} className="transition-colors duration-150 hover:text-foreground">
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <ExternalLink href={GITHUB}>GitHub</ExternalLink>
            </li>
            <li>
              <ExternalLink href={LINKEDIN}>LinkedIn</ExternalLink>
            </li>
            <li>
              <a href={`mailto:${EMAIL}`} className="link">
                Email
              </a>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
