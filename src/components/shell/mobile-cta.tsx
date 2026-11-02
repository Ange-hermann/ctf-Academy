"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { routes } from "@/content/navigation";
import { useSignedIn } from "@/hooks/use-signed-in";

/** Bouton « S'inscrire » fixe en bas d'écran (mobile, hors page d'inscription). */
export function MobileCta() {
  const pathname = usePathname();
  const signedIn = useSignedIn();
  if (pathname.startsWith(routes.register)) return null;
  return (
    <div className="fixed inset-x-4 bottom-[max(0.9rem,env(safe-area-inset-bottom))] z-40 md:hidden">
      <Button asChild size="lg" className="w-full shadow-gold-lg" halo>
        <Link href={signedIn ? routes.studentSpace : routes.register}>
          {signedIn ? "Mon espace" : "S'inscrire"} <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}
