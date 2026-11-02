import Image from "next/image";
import { Camera, Clock, MapPin, MessageCircle } from "lucide-react";
import { CtaBlock } from "@/components/layout/cta-block";
import { PageHero } from "@/components/layout/page-hero";
import { Button } from "@/components/ui/button";
import { GlassCard3D } from "@/components/ui/glass-card-3d";
import { Reveal } from "@/components/ui/reveal";
import { SectionTitle } from "@/components/ui/section-title";
import { churchPresentation, contact, gallery, worship } from "@/content/church";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata = pageMetadata({
  title: "Notre Église",
  description:
    "Le Centre de Transformation des Familles : une communauté chrétienne de familles et d'adorateurs. Lieux, cultes et vie de l'Église.",
  path: "/decouvrir/notre-eglise",
});

/** Carte stylisée sombre (illustration, sans service tiers). TODO: remplacer par l'adresse officielle. */
function StylizedMap() {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-line bg-noir-soft">
      <svg viewBox="0 0 400 300" aria-hidden className="absolute inset-0 size-full">
        <defs>
          <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0H0V24" fill="none" className="stroke-or/10" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="400" height="300" fill="url(#grid)" />
        <path d="M-10 210 C 80 180, 140 240, 230 200 S 360 120, 420 150" fill="none" className="stroke-or/25" strokeWidth="14" />
        <path d="M60 -10 C 90 90, 60 180, 120 310" fill="none" className="stroke-blanc/10" strokeWidth="8" />
        <path d="M280 -10 L 250 120 L 330 310" fill="none" className="stroke-blanc/10" strokeWidth="6" />
        <path d="M-10 90 L 420 70" fill="none" className="stroke-blanc/10" strokeWidth="5" />
      </svg>
      <div className="absolute top-[42%] left-[56%] -translate-1/2">
        <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-or/40" />
        <span className="relative grid size-12 place-items-center rounded-full bg-gradient-or text-noir shadow-gold-lg">
          <MapPin className="size-6" aria-hidden />
        </span>
      </div>
      <p className="absolute right-4 bottom-4 left-4 rounded-2xl border border-line bg-noir/85 p-4 text-sm text-blanc/80">
        <span className="font-semibold text-or-light">{contact.address}</span>
        <span className="block text-blanc/55">Plan détaillé disponible prochainement.</span>
      </p>
    </div>
  );
}

export default function ChurchPage() {
  return (
    <>
      <PageHero
        eyebrow="Découvrir CTF"
        title={
          <>
            Notre <em>Église</em>
          </>
        }
        intro={churchPresentation.intro}
        breadcrumb={[
          { label: "Découvrir CTF", href: "/decouvrir" },
          { label: "Notre Église", href: "/decouvrir/notre-eglise" },
        ]}
      >
        <Button asChild size="lg" variant="outline">
          <a href={whatsappLink("Bonjour, je souhaite contacter le Centre de Transformation des Familles.")} target="_blank" rel="noopener noreferrer">
            <MessageCircle /> Nous contacter
          </a>
        </Button>
      </PageHero>

      <section className="px-5 py-20 sm:px-8">
        <ul className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          {churchPresentation.pillars.map((p, i) => (
            <Reveal as="li" key={p.title} delay={i * 0.08}>
              <GlassCard3D>
                <span className="font-display text-sm text-or/70">0{i + 1}</span>
                <h2 className="mt-3 text-2xl tracking-wide">{p.title}</h2>
                <p className="mt-2 text-blanc/70">{p.text}</p>
              </GlassCard3D>
            </Reveal>
          ))}
        </ul>
      </section>

      <section className="px-5 py-20 sm:px-8">
        <div className="mx-auto grid max-w-6xl items-start gap-12 lg:grid-cols-2">
          <div>
            <SectionTitle align="left" eyebrow="Lieux et horaires" title={<>Venez <em>adorer</em> avec nous</>} />
            <ul className="mt-10 space-y-4">
              {worship.map((w) => (
                <li key={w.name} className="flex gap-5 rounded-2xl border border-line bg-gradient-card p-5">
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-or/30 font-display text-sm text-or-light">
                    {w.day.slice(0, 3)}
                  </span>
                  <span>
                    <span className="block font-semibold text-blanc">
                      {w.day} — {w.name}
                    </span>
                    <span className="mt-1 flex items-center gap-2 text-blanc/65">
                      <Clock aria-hidden className="size-4 text-or" /> {w.time}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-blanc/65">
                      <MapPin aria-hidden className="size-4 text-or" /> {w.place}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <StylizedMap />
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8">
        <SectionTitle eyebrow="Galerie" title={<>La vie de <em>l&apos;Église</em></>} />
        <ul className="mx-auto mt-14 grid max-w-6xl grid-cols-2 gap-4 md:grid-cols-3">
          {gallery.map((g, i) => (
            <Reveal as="li" key={g.caption} delay={(i % 3) * 0.08} className={cn(i % 3 === 1 && "md:translate-y-10")}>
              <GlassCard3D className="aspect-[4/5] overflow-hidden p-0" tilt={12}>
                {g.src ? (
                  <Image src={g.src} alt={g.caption} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" />
                ) : (
                  <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklab,var(--color-or)_18%,transparent),transparent_60%)] p-4 text-center">
                    <span>
                      <Camera aria-hidden className="mx-auto size-8 text-or/70" />
                      <span className="mt-3 block text-sm text-blanc/55">Photo à venir</span>
                    </span>
                  </div>
                )}
                <p className="absolute right-0 bottom-0 left-0 bg-linear-to-t from-noir/90 to-transparent p-4 font-semibold text-blanc">
                  {g.caption}
                </p>
              </GlassCard3D>
            </Reveal>
          ))}
        </ul>
      </section>

      <CtaBlock title="Envie de nous rejoindre ?" text="Commencez par une formation, ou écrivez-nous : nous serons heureux de vous accueillir." />
    </>
  );
}
