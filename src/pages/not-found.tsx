import { SiteLayout } from "../components/site-layout";

export default function NotFound() {
  return (
    <SiteLayout>
      <section className="py-24 md:py-32">
        <p className="label">404</p>
        <h1 className="mt-5 text-4xl font-medium tracking-tight sm:text-5xl">This page does not exist.</h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
          The link may be old, or the project may have moved.
        </p>
        <a
          href="/#work"
          className="mt-8 inline-flex h-11 items-center bg-foreground px-5 text-sm font-medium text-background transition-opacity duration-150 hover:opacity-85"
        >
          Back to all work
        </a>
      </section>
    </SiteLayout>
  );
}
