import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import type { ProjectStatus } from "../data/projects";

export const EMAIL = "raenaldi.ardiansyah30@gmail.com";
export const GITHUB = "https://github.com/raenaldiardiansyah";
export const LINKEDIN = "https://www.linkedin.com/in/raenaldi-ardiansyah/";

const NAV = [
  { label: "Work", href: "/#work" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

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

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
          <a href="/" className="inline-flex h-11 items-center font-mono text-sm font-medium tracking-tight">
            Raenaldi A. S.
          </a>
          <nav aria-label="Main">
            <ul className="flex items-center">
              {NAV.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="inline-flex h-11 items-center px-3 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-5 sm:px-8">
        {children}
      </main>

      <footer className="mt-24 border-t">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© 2026 Raenaldi Ardiansyah Sidik</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
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
