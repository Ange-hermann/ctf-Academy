/** Pays proposés à l'inscription, avec indicatif téléphonique. */
export const countries = [
  { code: "CI", name: "Côte d'Ivoire", dial: "+225" },
  { code: "SN", name: "Sénégal", dial: "+221" },
  { code: "CM", name: "Cameroun", dial: "+237" },
  { code: "BF", name: "Burkina Faso", dial: "+226" },
  { code: "ML", name: "Mali", dial: "+223" },
  { code: "BJ", name: "Bénin", dial: "+229" },
  { code: "TG", name: "Togo", dial: "+228" },
  { code: "NE", name: "Niger", dial: "+227" },
  { code: "GN", name: "Guinée", dial: "+224" },
  { code: "GA", name: "Gabon", dial: "+241" },
  { code: "CG", name: "Congo", dial: "+242" },
  { code: "CD", name: "RD Congo", dial: "+243" },
  { code: "TD", name: "Tchad", dial: "+235" },
  { code: "CF", name: "Centrafrique", dial: "+236" },
  { code: "MG", name: "Madagascar", dial: "+261" },
  { code: "RW", name: "Rwanda", dial: "+250" },
  { code: "BI", name: "Burundi", dial: "+257" },
  { code: "HT", name: "Haïti", dial: "+509" },
  { code: "FR", name: "France", dial: "+33" },
  { code: "BE", name: "Belgique", dial: "+32" },
  { code: "CH", name: "Suisse", dial: "+41" },
  { code: "CA", name: "Canada", dial: "+1" },
  { code: "US", name: "États-Unis", dial: "+1" },
] as const;

export type CountryCode = (typeof countries)[number]["code"];
export const countryCodes = countries.map((c) => c.code) as [CountryCode, ...CountryCode[]];
export const getCountry = (code: string) => countries.find((c) => c.code === code);
