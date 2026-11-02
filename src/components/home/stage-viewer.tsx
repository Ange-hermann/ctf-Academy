import Link from "next/link";
import { Compass, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StageFrame } from "@/components/home/stage-frame";
import { about } from "@/content/church";
import { churchVision } from "@/content/identity";

/** Image propre au grand cadre : portrait officiel (public/couple-k.png). */
const STAGE_IMAGE = "/couple-k.png";
const STAGE_ALT = "Couple de responsables du Centre de Transformation des Familles";

/** La grande scène de la page CTF ACADEMY : présentation de la plateforme de formation. */
export function StageViewer() {
  return (
    <StageFrame
      c={{
        ariaLabel: "Présentation CTF ACADEMY",
        image: STAGE_IMAGE,
        imageAlt: STAGE_ALT,
        eyebrow: "Centre de Transformation des Familles",
        title: "CTF ACADEMY",
        intro: about.intro,
        quote: churchVision.text,
        actions: (
          <>
            <Button asChild size="sm">
              <Link href="/formations">
                <GraduationCap aria-hidden /> Nos formations
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/decouvrir/vision-mission">
                <Compass aria-hidden /> Découvrir CTF
              </Link>
            </Button>
          </>
        ),
      }}
    />
  );
}
