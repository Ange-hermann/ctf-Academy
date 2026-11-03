import "server-only";
import { cache } from "react";
import { getDb } from "@/lib/db";
import { siteConfig } from "@/config/site";

/** Clés de la table site_settings (éditées dans /admin/parametres). */
export const settingKeys = {
  whatsappNumber: "whatsapp_number",
  contactEmail: "contact_email",
  registrationsOpen: "registrations_open",
  registrationNotice: "registration_notice",
} as const;

export type SiteSettings = {
  /** Numéro WhatsApp d'assistance (format international sans +). Base d'abord, variable d'environnement en repli. */
  whatsappNumber: string;
  contactEmail: string;
  registrationsOpen: boolean;
  /** Message affiché aux visiteurs quand les inscriptions sont fermées. */
  registrationNotice: string;
};

const DEFAULT_NOTICE = "Les inscriptions sont momentanément fermées. Revenez bientôt ou contactez l'équipe pour la prochaine session.";

/** Réglages du site (cachés par requête ; invalidés à chaque mise à jour depuis /admin/parametres).
 *  Base injoignable (build CI, coupure réseau) → valeurs par défaut plutôt qu'échec de rendu. */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const db = getDb();
  const rows = db ? await db.site_settings.findMany({ select: { key: true, value: true } }).catch(() => [] as { key: string; value: string }[]) : [];
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    whatsappNumber: (map.get(settingKeys.whatsappNumber) || siteConfig.whatsappNumber).replace(/\D/g, ""),
    contactEmail: map.get(settingKeys.contactEmail) ?? "",
    registrationsOpen: (map.get(settingKeys.registrationsOpen) ?? "true") !== "false",
    registrationNotice: map.get(settingKeys.registrationNotice) || DEFAULT_NOTICE,
  };
});
