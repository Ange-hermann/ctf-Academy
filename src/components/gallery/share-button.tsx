"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

/** Partage : Web Share API si disponible, sinon copie du lien dans le presse-papiers. */
export function ShareButton({ title, text }: { title: string; text?: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        /* annulé ou indisponible → copie */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* presse-papiers indisponible */
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-or/40 bg-noir-soft/60 px-5 font-nav font-semibold text-or-light transition-colors hover:border-or hover:bg-or/10"
    >
      {copied ? <Check aria-hidden className="size-5" /> : <Share2 aria-hidden className="size-5" />}
      {copied ? "Lien copié" : "Partager"}
    </button>
  );
}
