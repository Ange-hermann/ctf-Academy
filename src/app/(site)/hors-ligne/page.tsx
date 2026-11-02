import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Hors ligne",
  description: "Vous êtes hors connexion. Revenez une fois la connexion rétablie.",
  path: "/hors-ligne",
  noIndex: true,
});

export default function OfflinePage() {
  return (
    <section className="grid min-h-[70svh] place-items-center px-5 pt-24 pb-16">
      <div className="max-w-md rounded-3xl border border-line bg-gradient-card p-8 text-center shadow-gold">
        <WifiOff aria-hidden className="mx-auto size-12 text-or" />
        <h1 className="mt-5 text-3xl tracking-wide text-blanc">Vous êtes hors ligne</h1>
        <p className="mt-3 text-blanc/70">
          Cette page n&apos;est pas disponible sans connexion. Vérifiez votre réseau puis réessayez.
        </p>
        <Button asChild className="mt-7">
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
      </div>
    </section>
  );
}
