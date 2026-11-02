import type { Metadata } from "next";
import { ArrowRight, Download } from "lucide-react";
import { KeyWordIcon } from "@/components/brand/key-word-icon";
import { ChurchLogo, Emblem, Logo } from "@/components/brand/logo";
import { Accordion } from "@/components/ui/accordion";
import { Badge, ExampleBadge, KeyWordPill, ObjectivePill, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard3D } from "@/components/ui/glass-card-3d";
import { Loader } from "@/components/ui/loader";
import { Magnetic } from "@/components/ui/magnetic";
import { SectionTitle } from "@/components/ui/section-title";
import { churchObjectives, keyWords, tintStyle } from "@/content/identity";
import { faq } from "@/content/faq";
import { FieldsDemo, ToastDemo } from "./demos";

export const metadata: Metadata = { title: "Design system", robots: { index: false, follow: false } };

const palette = [
  { name: "Fond", className: "bg-noir", hex: "#0A0A0A" },
  { name: "Noir soft", className: "bg-noir-soft", hex: "#141414" },
  { name: "Noir card", className: "bg-noir-card", hex: "#1A1A1A" },
  { name: "Or", className: "bg-or", hex: "#C9A227" },
  { name: "Or light", className: "bg-or-light", hex: "#E5C158" },
  { name: "Or dark", className: "bg-or-dark", hex: "#8B6F1A" },
  { name: "Blanc", className: "bg-blanc", hex: "#FAFAF9" },
  { name: "Blanc pur", className: "bg-blanc-pur", hex: "#FFFFFF" },
];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-14">
      <h2 className="mb-8 font-sans text-sm tracking-[0.3em] text-or-light uppercase">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-32 pb-16 sm:px-8">
      <SectionTitle align="left" as="h1" eyebrow="Charte CTF ACADEMY" title={<>Design <em>system</em></>} />

      <Block title="Logo">
        <div className="grid items-center gap-6 sm:grid-cols-3">
          <div className="flex justify-center rounded-3xl border border-line bg-gradient-card p-8">
            <ChurchLogo width={180} />
          </div>
          <div className="flex flex-col items-center gap-6 rounded-3xl border border-line bg-gradient-card p-8">
            <Logo />
            <Loader label="Chargement" />
          </div>
          <div className="flex items-end justify-center gap-5 rounded-3xl border border-line bg-gradient-card p-8">
            {[24, 40, 64, 96].map((s) => (
              <Emblem key={s} size={s} className="size-auto" />
            ))}
          </div>
        </div>
      </Block>

      <Block title="Couleurs">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {palette.map((c) => (
            <div key={c.name} className="overflow-hidden rounded-2xl border border-line bg-noir-soft">
              <div className={`h-16 ${c.className}`} />
              <p className="p-3 text-sm">
                <span className="font-semibold">{c.name}</span> <span className="text-blanc/60">{c.hex}</span>
              </p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="h-20 rounded-2xl border border-line bg-gradient-noir p-4 text-blanc/80">gradient-noir</div>
          <div className="h-20 rounded-2xl border border-line bg-gradient-card p-4 text-blanc/80">gradient-card</div>
          <div className="h-20 rounded-2xl bg-gradient-or p-4 font-semibold text-noir">gradient-or</div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {keyWords.map((k) => (
            <KeyWordPill key={k.slug} slug={k.slug} />
          ))}
          {churchObjectives.map((o) => (
            <ObjectivePill key={o.number} objective={o} />
          ))}
        </div>
      </Block>

      <Block title="Boutons">
        <div className="flex flex-wrap items-center gap-4">
          <Magnetic>
            <Button size="lg" halo>
              S&apos;inscrire <ArrowRight />
            </Button>
          </Magnetic>
          <Button>Principal</Button>
          <Button variant="outline">
            <Download /> Télécharger
          </Button>
          <Button variant="ghost">Discret</Button>
          <Button variant="danger">Refuser</Button>
          <Button disabled>Désactivé</Button>
        </div>
      </Block>

      <Block title="Champs">
        <FieldsDemo />
      </Block>

      <Block title="Statuts indépendants">
        <div className="flex flex-wrap gap-2">
          <StatusBadge kind="registration" status="submitted" />
          <StatusBadge kind="payment" status="confirmed" />
          <StatusBadge kind="admission" status="under_review" />
          <StatusBadge kind="payment" status="failed" />
          <StatusBadge kind="admission" status="waitlisted" />
          <Badge tone="neutral">Neutre</Badge>
          <ExampleBadge />
        </div>
      </Block>

      <Block title="Cartes 3D">
        <div className="grid gap-5 md:grid-cols-5">
          {keyWords.map((k) => (
            <GlassCard3D key={k.slug} className="border tint-border" style={tintStyle(k)}>
              <KeyWordIcon icon={k.icon} className="size-7 tint-text" />
              <p className="mt-4 font-display text-lg tracking-wider uppercase tint-text">{k.label}</p>
              <p className="mt-2 text-sm text-blanc/70">{k.definition}</p>
            </GlassCard3D>
          ))}
        </div>
      </Block>

      <Block title="Accordéon">
        <Accordion items={faq.slice(0, 3).map((f) => ({ id: f.id, title: f.question, content: f.answer }))} />
      </Block>

      <Block title="Toasts">
        <ToastDemo />
      </Block>
    </div>
  );
}
