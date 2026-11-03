"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, Eye, EyeOff, FileText, Headphones, Link2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResourceItem } from "@/lib/student/queries/courses";
import { cn } from "@/lib/utils";

const size = (b: number | null) => (b ? (b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} Mo` : `${Math.max(1, Math.round(b / 1000))} Ko`) : "");
const downloadHref = (r: ResourceItem) => (r.href.startsWith("/espace-etudiant/fichier") ? `${r.href}&telecharger=1` : r.href);

/** Ressources : visionneuse PDF intégrée (à la demande, aucun chargement inutile) et téléchargement. */
export function ResourceList({ resources, emptyText = "Aucune ressource pour le moment." }: { resources: ResourceItem[]; emptyText?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!resources.length) return <p className="text-blanc/60">{emptyText}</p>;
  return (
    <ul className="space-y-3">
      {resources.map((r) => {
        const isPdf = r.kind === "pdf";
        const isMedia = r.kind === "audio" || r.kind === "video";
        const Icon = r.kind === "link" ? Link2 : r.kind === "audio" ? Headphones : r.kind === "video" ? PlayCircle : FileText;
        const kindLabel = { link: "Lien externe", pdf: "PDF", document: "Document", audio: "Audio", video: "Vidéo" }[r.kind];
        return (
          <li key={r.id} className="overflow-hidden rounded-2xl border border-line bg-noir/40">
            <div className="flex flex-wrap items-center gap-3 p-4">
              <span className="grid size-10 place-items-center rounded-xl border border-or/30 bg-or/10 text-or-light">
                <Icon aria-hidden className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-blanc">{r.title}</p>
                <p className="text-xs text-blanc/50 uppercase">
                  {kindLabel} {size(r.sizeBytes) && `· ${size(r.sizeBytes)}`}
                </p>
              </div>
              <div className="flex gap-2">
                {(isPdf || isMedia) && (
                  <Button size="sm" variant="ghost" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id}>
                    {open === r.id ? <EyeOff /> : r.kind === "audio" ? <Headphones /> : <Eye />}{" "}
                    {open === r.id ? "Fermer" : r.kind === "audio" ? "Écouter" : r.kind === "video" ? "Voir" : "Lire"}
                  </Button>
                )}
                <Button asChild size="sm" variant="outline">
                  <a href={downloadHref(r)} {...(r.kind === "link" ? { target: "_blank", rel: "noopener noreferrer" } : { download: true })}>
                    {r.kind === "link" ? <Link2 /> : <Download />} {r.kind === "link" ? "Ouvrir" : "Télécharger"}
                  </a>
                </Button>
              </div>
            </div>
            <AnimatePresence initial={false}>
              {open === r.id && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn("border-t border-line", isPdf ? "bg-blanc" : "bg-noir p-4")}>
                  {r.kind === "audio" ? (
                    <audio controls preload="metadata" src={r.href} className="w-full" aria-label={r.title} />
                  ) : r.kind === "video" ? (
                    <video controls preload="metadata" src={r.href} className="aspect-video w-full rounded-xl bg-noir" aria-label={r.title} />
                  ) : (
                    <iframe src={`${r.href}#view=FitH`} title={r.title} className="h-[70dvh] w-full" loading="lazy" />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
