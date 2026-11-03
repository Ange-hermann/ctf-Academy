import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/whatsapp";

/** Bouton flottant d'aide WhatsApp (présent sur toutes les pages publiques quand un numéro est configuré). */
export function WhatsAppFab({ number }: { number: string }) {
  if (!number) return null;
  return (
    <a
      href={whatsappLink(number)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Besoin d'aide ? Écrivez-nous sur WhatsApp"
      className="group fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex min-h-14 items-center gap-2 rounded-full border border-or/40 bg-noir-card/95 py-3 pr-4 pl-3 text-sm font-semibold text-or-light shadow-gold transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-gold-lg sm:right-6 sm:bottom-6"
    >
      <span className="grid size-8 place-items-center rounded-full bg-gradient-or text-noir">
        <MessageCircle className="size-4.5" aria-hidden />
      </span>
      <span className="hidden sm:inline">Aide WhatsApp</span>
    </a>
  );
}
