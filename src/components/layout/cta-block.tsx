import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Emblem } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/ui/magnetic";
import { routes } from "@/config/navigation";
import { whatsappLink } from "@/lib/whatsapp";

/** Bloc d'appel à l'action placé en bas de chaque page de contenu. */
export function CtaBlock({
  title = "Prêt à commencer votre parcours ?",
  text = "L'inscription se fait en 5 étapes, depuis votre téléphone, en quelques minutes.",
  href = routes.register,
  label = "S'inscrire maintenant",
  emblem = true,
}: {
  title?: string;
  text?: string;
  href?: string;
  label?: string;
  /** Affiche le médaillon au-dessus du titre (défaut : oui). */
  emblem?: boolean;
}) {
  return (
    <section className="px-5 py-20 sm:px-8 sm:py-28">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-or/25 bg-gradient-card px-6 py-14 text-center shadow-gold-lg grain sm:px-12">
        <div aria-hidden className="absolute inset-0 sparkle-bg" />
        <div aria-hidden className="absolute -bottom-32 left-1/2 size-96 -translate-x-1/2 rounded-full bg-or/15 blur-3xl" />
        <div className="relative">
          {emblem && <Emblem size={64} className="mx-auto size-16 animate-float" />}
          <h2 className="mx-auto mt-6 max-w-2xl text-3xl tracking-wide text-blanc sm:text-4xl">{title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-blanc/70">{text}</p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Magnetic>
              <Button asChild size="lg" halo>
                <Link href={href}>
                  {label} <ArrowRight />
                </Link>
              </Button>
            </Magnetic>
            <Button asChild size="lg" variant="outline">
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                <MessageCircle /> Poser une question
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
