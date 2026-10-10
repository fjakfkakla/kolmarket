import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.pages.terms.metaTitle };
}

/** Ancres des sections (identiques dans toutes les langues). */
const IDS = ["objet", "eligibilite", "fonds", "marches", "resolution", "risques", "conduite", "confidentialite", "responsabilite", "modifications"] as const;

export default async function TermsPage() {
  const { t } = await getI18n();
  const terms = t.pages.terms;
  const SECTIONS = IDS.map((id) => ({ id, ...terms.sections[id] }));
  return (
    <div className="grid gap-8 md:grid-cols-[230px_1fr]">
      <aside className="md:sticky md:top-32 md:self-start">
        <nav className="card p-2" aria-label={terms.toc}>
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="block rounded-xl px-3 py-2 text-[14px] font-semibold text-muted transition hover:bg-paper-2 hover:text-ink">
              {s.title}
            </a>
          ))}
        </nav>
      </aside>
      <article className="card fade-up p-6 md:p-10">
        <h1 className="display text-[34px]">{terms.title}</h1>
        <span className="chip mt-3">{terms.updated}</span>
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="mt-9 scroll-mt-32">
            <h2 className="font-display text-[21px] font-extrabold tracking-[-0.02em]">{s.title}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="mt-2.5 text-[15px] leading-relaxed text-ink-2">
                {p}
              </p>
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}
