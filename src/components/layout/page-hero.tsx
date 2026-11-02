import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumb, type Crumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/navigation";
import { cn } from "@/lib/utils";

type PageHeroProps = {
  eyebrow: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  breadcrumb: Crumb[];
  /** `null` masque le bouton « S'inscrire » (formations sur sélection). */
  registerHref?: string | null;
  registerLabel?: string;
  /** Bandeau image derrière le titre (voile sombre garantissant le contraste). */
  image?: string;
  children?: React.ReactNode;
  className?: string;
};

/** En-tête de page de contenu : fil d'Ariane, titre métallique, filet doré et bouton « S'inscrire ». */
export function PageHero({
  eyebrow,
  title,
  intro,
  breadcrumb,
  registerHref = routes.register,
  registerLabel = "S'inscrire",
  image,
  children,
  className,
}: PageHeroProps) {
  return (
    <section className={cn("relative overflow-hidden bg-aura pt-32 pb-16 grain sm:pt-40 sm:pb-20", className)}>
      {image && (
        <>
          <Image src={image} alt="" fill priority sizes="100vw" className="object-cover" />
          <div aria-hidden className="absolute inset-0 bg-linear-to-r from-noir/95 via-noir/80 to-noir/45" />
          <div aria-hidden className="absolute inset-0 bg-linear-to-t from-noir via-transparent to-noir/60" />
        </>
      )}
      {!image && (
        <>
          <div aria-hidden className="absolute inset-0 sparkle-bg opacity-70" />
          <div
            aria-hidden
            className="absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-or/10 blur-3xl"
          />
        </>
      )}
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <Breadcrumb items={breadcrumb} />
        <p className="mt-8 font-nav text-xs font-semibold tracking-[0.3em] text-or-light uppercase animate-fade-up">{eyebrow}</p>
        <h1
          className="mt-4 max-w-4xl text-4xl leading-tight tracking-wide text-blanc animate-fade-up [animation-delay:80ms] sm:text-5xl lg:text-6xl [&_em]:text-gradient-gold-metal [&_em]:not-italic [&_em]:drop-shadow-[0_2px_14px_rgb(201_162_39/0.3)]"
        >
          {title}
        </h1>
        {/* Filet doré aux extrémités estompées (signature de la maquette) */}
        <div
          aria-hidden
          className="mt-6 h-px w-48 animate-fade-up bg-linear-to-r from-transparent via-or-light to-transparent shadow-[0_0_10px_1px_rgb(229_193_88/0.5)] [animation-delay:160ms]"
        />
        {intro && (
          <div className="mt-6 max-w-2xl text-lg text-blanc/75 animate-fade-up [animation-delay:200ms]">{intro}</div>
        )}
        <div className="mt-8 flex flex-wrap gap-3 animate-fade-up [animation-delay:280ms]">
          {registerHref && (
            <Button asChild size="lg">
              <Link href={registerHref}>
                {registerLabel} <ArrowRight />
              </Link>
            </Button>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}
