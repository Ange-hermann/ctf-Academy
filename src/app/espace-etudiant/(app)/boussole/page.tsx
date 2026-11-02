import { CompassMini } from "@/components/student/compass/compass-mini";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { KeyWordIcon } from "@/components/brand/key-word-icon";
import { ObjectivePill } from "@/components/ui/badge";
import { studentRoutes } from "@/config/student-nav";
import {
  churchObjectives,
  churchVision,
  getKeyWord,
  keyWords,
  tintStyle,
  type KeyWordSlug,
} from "@/content/identity";
import { getLearning, keyWordScores, percent } from "@/lib/student/queries/learning";
import { requireStudent, withStudent } from "@/lib/student/session";

export const metadata = { title: "Ma boussole" };

/** Mot fort de la Vision → mot clé correspondant (pour la teinte). */
const highlightToSlug: Record<string, KeyWordSlug> = {
  "disciples-adorateurs": "adoration",
  excellence: "excellence",
  transformation: "transformation",
  guérison: "guerison",
  familles: "famille",
};

const normalize = (w: string) => w.toLowerCase().replace(/[.,;:!?«»'’]/g, "");
const slugOf = (word: string) => {
  const n = normalize(word);
  return highlightToSlug[n] ?? null;
};

/** La Vision en grand, mots forts teintés de la couleur de leur mot clé. */
function VisionText() {
  return (
    <p className="mx-auto max-w-3xl text-center font-display text-xl leading-relaxed tracking-wide text-blanc sm:text-2xl">
      {churchVision.text.split(" ").map((word, i) => {
        const slug = slugOf(word);
        if (!slug) return <span key={i}>{word} </span>;
        return (
          <span key={i} style={tintStyle(getKeyWord(slug))} className="font-semibold tint-text">
            {word}{" "}
          </span>
        );
      })}
    </p>
  );
}

export default async function CompassPage() {
  const ctx = await requireStudent(studentRoutes.compass);
  const learning = await withStudent(ctx.userId, (tx) => getLearning(tx, ctx.enrollment.formationId));
  const scores = keyWordScores(learning.modules);
  const values = keyWords.map((k) => {
    const s = scores.get(k.slug) ?? { done: 0, total: 0 };
    return { slug: k.slug, value: s.total ? s.done / s.total : 0, done: s.done, total: s.total };
  });

  return (
    <>
      <StudentPageHeader
        title="Ma boussole"
        description="La Vision de l'Église, ses 5 mots clés et ses 5 objectifs — et votre progression sur chacun d'eux."
        crumbs={[{ label: "Ma boussole", href: studentRoutes.compass }]}
      />

      {/* La Vision */}
      <section aria-labelledby="vision-title" className="rounded-3xl border border-or/25 bg-gradient-card px-6 py-10 shadow-gold sm:px-10">
        <h2 id="vision-title" className="text-center font-sans text-sm font-semibold tracking-[0.22em] text-or-light uppercase">
          La Vision — Centre de Transformation des Familles
        </h2>
        <div className="mt-6">
          <VisionText />
        </div>
      </section>

      {/* Boussole personnelle */}
      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section aria-labelledby="compass-title" className="flex flex-col items-center rounded-3xl border border-line bg-gradient-card p-6 sm:p-8">
          <h2 id="compass-title" className="font-sans text-sm font-semibold tracking-[0.18em] text-or-light uppercase">
            Votre progression par mot clé
          </h2>
          <div className="mt-6">
            <CompassMini values={values.map(({ slug, value }) => ({ slug, value }))} size={240} />
          </div>
          <ul className="mt-6 w-full space-y-3">
            {values.map((v) => {
              const pct = percent(v.done, v.total);
              return (
                <li key={v.slug} style={tintStyle(getKeyWord(v.slug))}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-semibold tint-text">{getKeyWord(v.slug).label}</span>
                    <span className="text-blanc/55 tabular">
                      {v.done}/{v.total} leçons · {pct} %
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-blanc/8" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${getKeyWord(v.slug).label} : ${pct} %`}>
                    <div className="h-full origin-left rounded-full tint-bg" style={{ transform: `scaleX(${pct / 100})` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Les 5 mots clés */}
        <section aria-labelledby="kw-title" className="space-y-4">
          <h2 id="kw-title" className="font-sans text-sm font-semibold tracking-[0.18em] text-or-light uppercase">
            Les 5 mots clés
          </h2>
          {keyWords.map((k) => (
            <article key={k.slug} style={tintStyle(k)} className="rounded-3xl border border-line bg-gradient-card p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl border tint-border tint-text tint-glow">
                  <KeyWordIcon icon={k.icon} className="size-5" />
                </span>
                <h3 className="text-lg font-semibold tracking-wide tint-text">{k.label}</h3>
              </div>
              <p className="mt-3 text-sm text-blanc/75">{k.definition}</p>
              <blockquote className="mt-3 border-l-2 pl-3 text-sm text-blanc/55 tint-border-strong">
                « {k.inspiration.text} » <cite className="text-blanc/40 not-italic">— {k.inspiration.reference}</cite>
              </blockquote>
            </article>
          ))}
        </section>
      </div>

      {/* Les 5 objectifs */}
      <section aria-labelledby="obj-title" className="mt-8 rounded-3xl border border-line bg-gradient-card p-5 sm:p-8">
        <h2 id="obj-title" className="font-sans text-sm font-semibold tracking-[0.18em] text-or-light uppercase">
          Les 5 objectifs de l&rsquo;église
        </h2>
        <ol className="mt-5 space-y-4">
          {churchObjectives.map((o) => (
            <li key={o.number} style={tintStyle(o)} className="flex items-start gap-4">
              <ObjectivePill objective={o} className="mt-0.5 shrink-0" />
              <p className="text-sm text-blanc/75 sm:text-base">
                <span className="font-semibold tint-text">{o.verb}</span> {o.text}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
