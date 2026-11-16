import { buttonLook, SiteLayout } from "../components/site-layout";
import { Button } from "../components/ui/button";

export default function NotFound() {
  return (
    <SiteLayout>
      <section className="py-24 md:py-32">
        <p className="label">404</p>
        <h1 className="mt-5 text-4xl font-medium tracking-tight sm:text-5xl">This page does not exist.</h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
          The link may be old, or the project may have moved.
        </p>
        <Button asChild className={`mt-8 ${buttonLook.solid}`}>
          <a href="/#work">Back to all work</a>
        </Button>
      </section>
    </SiteLayout>
  );
}
