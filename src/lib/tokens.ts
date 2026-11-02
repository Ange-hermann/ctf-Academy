/**
 * Miroir JS des tokens de couleur (globals.css) pour les scènes WebGL,
 * qui ne peuvent pas lire les variables CSS. Ne pas utiliser dans le JSX : préférer les classes Tailwind.
 */
export const tokens = {
  noir: "#0A0A0A",
  or: "#C9A227",
  orLight: "#E5C158",
  orDark: "#8B6F1A",
  blanc: "#FAFAF9",
  /** Teinte de départ du métal avant la « gravure » en or. */
  orEngraved: "#1C1608",
} as const;
