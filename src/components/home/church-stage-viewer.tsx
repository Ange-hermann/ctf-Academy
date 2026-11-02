"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion } from "motion/react";
import { Church, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StageFrame, type StageContent } from "@/components/home/stage-frame";
import { churchPresentation, getChurchPanel } from "@/content/church";
import { churchPanelHref } from "@/content/navigation";
import { churchVision } from "@/content/identity";
import { usePerf } from "@/hooks/use-perf";

const STAGE_IMAGE = "/couple-k.png";
const STAGE_ALT = "Couple de responsables du Centre de Transformation des Familles";

const defaultContent: StageContent = {
  ariaLabel: "Présentation de l'Église",
  image: STAGE_IMAGE,
  imageAlt: STAGE_ALT,
  eyebrow: "Une Église de familles et d'adorateurs",
  title: "CTF CHURCH",
  intro: churchPresentation.intro,
  quote: churchVision.text,
  actions: (
    <>
      <Button asChild size="sm">
        <Link href="/decouvrir/notre-eglise">
          <Church aria-hidden /> Notre Église
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href="/decouvrir/vision-mission">
          <Eye aria-hidden /> La Vision de CTF
        </Link>
      </Button>
    </>
  ),
};

/** Contenu du grand cadre pour le ministère choisi (`?departement=`). */
function contentFor(slug: string | null): { key: string; c: StageContent } {
  const panel = getChurchPanel(slug);
  if (!panel) return { key: "eglise", c: defaultContent };
  return {
    key: slug ?? "eglise",
    c: {
      ariaLabel: `Ministère : ${panel.title}`,
      image: STAGE_IMAGE,
      imageAlt: STAGE_ALT,
      eyebrow: panel.eyebrow,
      title: panel.title,
      intro: panel.intro,
      actions: (
        <>
          {panel.links.map((l) => (
            <Button key={l.slug} asChild variant="outline" size="sm">
              <Link href={churchPanelHref(l.slug)} scroll={false}>
                {l.label}
              </Link>
            </Button>
          ))}
        </>
      ),
    },
  };
}

function ChurchStageDynamic() {
  const slug = useSearchParams()?.get("departement") ?? null;
  const { reducedMotion, tier } = usePerf();
  const { key, c } = contentFor(slug);
  return (
    <motion.div
      key={key}
      initial={reducedMotion || tier === "lite" ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <StageFrame c={c} />
    </motion.div>
  );
}

/** La grande scène de la page CTF CHURCH : présentation de l'Église ou du ministère choisi. */
export function ChurchStageViewer() {
  return (
    <Suspense fallback={<StageFrame c={defaultContent} />}>
      <ChurchStageDynamic />
    </Suspense>
  );
}
