import { siteConfig } from "@/config/site";

export const defaultHelpMessage = "Bonjour CTF ACADEMY, j'ai besoin d'aide pour mon inscription.";

/** Lien wa.me : vers le numéro d'assistance s'il est configuré, sinon sélection du contact par l'utilisateur. */
export function whatsappLink(message: string = defaultHelpMessage) {
  const number = siteConfig.whatsappNumber.replace(/\D/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
