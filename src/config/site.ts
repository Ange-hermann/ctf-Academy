export const siteConfig = {
  name: "CTF ACADEMY",
  church: "Centre de Transformation des Familles",
  description:
    "CTF ACADEMY, la plateforme de formation du Centre de Transformation des Familles : formation des disciples, École des STAFs, École des Disciples Mentors et formation des diacres.",
  keywords: [
    "Centre de Transformation des Familles",
    "CTF ACADEMY",
    "formation",
    "disciples",
    "disciples-adorateurs",
    "École des STAFs",
    "École des Disciples Mentors",
    "formation des diacres",
    "diacres",
  ],
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "fr_FR",
  themeColor: "#C9A227",
  /** Numéro WhatsApp d'assistance au format international sans « + » (ex. 22500000000). */
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",
} as const;
