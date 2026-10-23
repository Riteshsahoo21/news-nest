import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function LegalPage({ title, updated, icon: Icon, intro, sections }) {
  return (
    <article className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12 animate-page-enter">
      <Link to="/" viewTransition className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to RitzlaNews
      </Link>

      <header className="mb-8 border-b border-border/70 pb-7">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>
        <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground">{intro}</p>
      </header>

      <div className="space-y-7">
        {sections.map(({ heading, body }) => (
          <section key={heading} className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">{heading}</h2>
            <div className="space-y-3 text-sm leading-7 text-muted-foreground">{body}</div>
          </section>
        ))}
      </div>
    </article>
  );
}

