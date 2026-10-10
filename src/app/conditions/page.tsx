import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.termsTitle };
}

export default async function TermsPage() {
  const { t } = await getI18n();
  const { sections, title, updated, toc } = t.terms;
  return (
    <div className="grid gap-8 md:grid-cols-[220px_1fr]">
      <aside className="md:sticky md:top-28 md:self-start">
        <div className="card p-3">
          <div className="px-2 pb-2 text-xs font-bold uppercase tracking-wider text-muted">{toc}</div>
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="block rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-cream-2 hover:text-ink">{s.title}</a>
          ))}
        </div>
      </aside>
      <article className="card p-6 md:p-10 fade-up">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted">{updated}</p>
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="mt-8 scroll-mt-28">
            <h2 className="text-lg font-bold">{s.title}</h2>
            {s.body.map((p, i) => <p key={i} className="mt-2 text-sm leading-relaxed text-muted">{p}</p>)}
          </section>
        ))}
      </article>
    </div>
  );
}
