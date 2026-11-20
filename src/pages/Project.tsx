import { useLayoutEffect } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getProject } from "../data/projects";
import { ExternalLink, SiteLayout, StatusTag } from "../components/site-layout";
import ModelViewer from "../components/model-viewer";
import NotFound from "./not-found";

export default function Project() {
  const { slug = "" } = useParams<{ slug: string }>();
  const found = getProject(slug);

  // Each project opens at its top, including when moving between projects with previous/next.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    if (found) document.title = `${found.project.title} — Raenaldi Ardiansyah`;
    return () => {
      document.title = "Raenaldi Ardiansyah — Robotics, IoT & Web";
    };
  }, [slug]);

  if (!found) return <NotFound />;
  const { project: p, number, previous, next } = found;

  const facts = [
    { term: "Role", detail: p.role },
    { term: "Context", detail: p.context },
    { term: "Timeline", detail: p.timeline },
    { term: "Stack", detail: p.stack.join(", ") },
  ];

  return (
    <SiteLayout section="work">
      <article className="rise pt-10 md:pt-14">
        <a href="/#work" className="link inline-flex h-11 items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />
          All work
        </a>

        <header className="mt-6 pb-10 md:pb-14">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="label">
              {String(number).padStart(2, "0")} · {p.category}
            </span>
            <StatusTag status={p.status} />
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-medium leading-[1.1] tracking-tight sm:text-5xl">{p.title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{p.summary}</p>
          {p.links.length > 0 && (
            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-3">
              {p.links.map((l) => (
                <li key={l.href}>
                  <ExternalLink href={l.href}>{l.label}</ExternalLink>
                </li>
              ))}
            </ul>
          )}
        </header>

        {p.model && (
          <figure className="pb-10 md:pb-14">
            <div className="max-w-md">
              <ModelViewer src={p.model.src} label={p.model.label} />
            </div>
            <figcaption className="mt-3 max-w-xl text-sm text-muted-foreground">{p.model.caption}</figcaption>
          </figure>
        )}

        {p.image && (
          <figure className="pb-10 md:pb-14">
            <img
              src={p.image.src}
              alt={p.image.alt}
              width={p.image.width}
              height={p.image.height}
              className={`border bg-card ${p.image.height > p.image.width ? "w-full max-w-xs" : "w-full"}`}
            />
            <figcaption className="mt-3 max-w-xl text-sm text-muted-foreground">{p.image.caption}</figcaption>
          </figure>
        )}

        <div className="grid gap-x-12 gap-y-10 border-t pt-10 md:grid-cols-[1fr_17rem] md:pt-14">
          <div className="min-w-0">
            <h2 className="label">Overview</h2>
            <div className="mt-4 max-w-2xl space-y-4 text-lg leading-relaxed">
              {p.overview.map((para) => (
                <p key={para}>{para}</p>
              ))}
            </div>

            <h2 className="label mt-12">Highlights</h2>
            <ul className="mt-4 max-w-2xl border-t">
              {p.highlights.map((h) => (
                <li key={h} className="border-b py-3 leading-relaxed">
                  {h}
                </li>
              ))}
            </ul>

            {p.log && (
              <>
                <h2 className="label mt-12">Progress log</h2>
                <ol className="mt-4 max-w-2xl border-t">
                  {p.log.map((entry) => (
                    <li key={entry.text} className="grid gap-x-6 gap-y-1 border-b py-3 sm:grid-cols-[5.5rem_1fr]">
                      <span className="font-mono text-xs leading-7 text-muted-foreground">{entry.date}</span>
                      <span className="leading-relaxed">{entry.text}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>

          <aside aria-label="Project facts" className="md:order-last">
            <dl className="border-t">
              {facts.map(({ term, detail }) => (
                <div key={term} className="border-b py-3">
                  <dt className="label">{term}</dt>
                  <dd className="mt-1 text-sm leading-relaxed">{detail}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>

        <nav aria-label="More projects" className="mt-16 grid gap-px border-t sm:grid-cols-2">
          {previous ? (
            <Link href={`/work/${previous.slug}`} className="group py-6 sm:pr-6">
              <span className="label flex items-center gap-2">
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                Previous
              </span>
              <span className="mt-2 block text-lg font-medium underline decoration-transparent underline-offset-4 transition-colors duration-150 group-hover:decoration-signal">
                {previous.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/work/${next.slug}`} className="group border-t py-6 sm:border-l sm:border-t-0 sm:pl-6 sm:text-right">
              <span className="label flex items-center gap-2 sm:justify-end">
                Next
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </span>
              <span className="mt-2 block text-lg font-medium underline decoration-transparent underline-offset-4 transition-colors duration-150 group-hover:decoration-signal">
                {next.title}
              </span>
            </Link>
          )}
        </nav>
      </article>
    </SiteLayout>
  );
}
