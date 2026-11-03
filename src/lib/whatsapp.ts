export const defaultHelpMessage = "Bonjour CTF ACADEMY, j'ai besoin d'aide pour mon inscription.";

/** Lien wa.me : vers le numéro d'assistance s'il est configuré, sinon sélection du contact par l'utilisateur. */
export function whatsappLink(number: string, message: string = defaultHelpMessage) {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
