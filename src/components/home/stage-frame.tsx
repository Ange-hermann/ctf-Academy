import Image from "next/image";
import type { ReactNode } from "react";

export type StageContent = {
  ariaLabel: string;
  image: string;
  imageAlt: string;
  eyebrow: string;
  title: string;
  intro: ReactNode;
  quote?: string;
  actions: ReactNode;
};

/**
 * Le grand cadre de l'accueil : encadré portrait à gauche, panneau de
 * présentation à droite. Utilisé par la page CTF CHURCH (`/`) et la page
 * CTF ACADEMY (`/ctf-academy`). Entièrement statique.
 */
export function StageFrame({ c }: { c: StageContent }) {
  return (
    <section aria-label={c.ariaLabel} className="mt-5">
      <div className="relative touch-pan-y overflow-hidden rounded-2xl border-gold-strong bg-noir-soft shadow-[0_24px_60px_-24px_rgb(0_0_0/0.8),0_0_40px_rgb(201_162_39/0.1)] lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)]">
        {/* ——— Encadré intérieur : portrait centré dans son sous-cadre ——— */}
        <div className="relative grid aspect-[4/3] place-items-center bg-noir p-3 sm:aspect-[16/8] sm:p-5 lg:aspect-auto lg:min-h-[320px]">
          <span className="relative block h-full w-full overflow-hidden rounded-lg border border-or/60 shadow-gold-sm lg:aspect-[2/3] lg:max-h-[460px] lg:w-auto">
            <Image
              src={c.image}
              alt={c.imageAlt}
              fill
              priority
              sizes="(max-width: 1024px) 92vw, 300px"
              className="object-cover object-[50%_15%] lg:object-center"
            />
          </span>
        </div>

        {/* ——— Panneau de présentation ——— */}
        <aside className="relative flex flex-col justify-center px-6 py-7 sm:px-8 lg:border-l lg:border-or/25 lg:px-6">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-20 right-0 size-56 rounded-full bg-or/10 blur-3xl"
          />
          <p className="font-nav text-xs font-semibold tracking-[0.3em] text-or-light uppercase">{c.eyebrow}</p>
          <h3 className="mt-2.5 font-display text-2xl font-extrabold tracking-wide text-gradient-gold-metal sm:text-3xl">
            {c.title}
          </h3>
          <span
            aria-hidden
            className="mt-3.5 block h-px w-36 bg-linear-to-r from-or-light via-or/60 to-transparent shadow-[0_0_8px_rgb(229_193_88/0.5)]"
          />
          <p className="mt-4 text-[0.95rem] leading-relaxed text-blanc/80">{c.intro}</p>
          {c.quote && (
            <blockquote className="mt-4 border-l-2 border-or/60 pl-4 font-display text-[0.95rem] leading-relaxed text-or-light/90 italic">
              « {c.quote} »
            </blockquote>
          )}
          <div className="mt-5 flex flex-wrap gap-3">{c.actions}</div>
        </aside>
      </div>
    </section>
  );
}
