<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# CTF ACADEMY — notes projet

- Windows / PowerShell : `npm.ps1` est bloqué → utiliser `npm.cmd` / `npx.cmd`.
- Installer des paquets avec `npm.cmd install --before=<date J-7>` (versions publiées depuis ≥ 7 jours).
- Vérification : `npm.cmd run lint` puis `npm.cmd run build` (le build génère les types `LayoutProps`/`PageProps` ; `tsc --noEmit` seul échoue avant).
- Dev : `npm.cmd run dev` → http://localhost:3000 · démo des composants : `/design-system`.
- Interface en français, code en anglais. Tailwind v4 : tokens dans `src/app/globals.css` (`@theme`), pas de `tailwind.config`.
- Couleurs de la Vision : uniquement pour les mots clés / objectifs ; pour du texte, utiliser `textColor` (contraste ≥ 4.5:1).
- Identité de l'Église (Vision, mots clés, objectifs) : `src/lib/church-identity.ts` (valeurs par défaut, futures tables Supabase).
- Statuts inscription / paiement / admission indépendants : `src/lib/statuses.ts`.
- Logo : source `public/logo.jpeg` (fond blanc). `npm.cmd run brand` régénère `public/brand/emblem.png`, `public/brand/logo-full.png` (fond transparent) et les icônes `src/app/icon.png`, `apple-icon.png`, `favicon.ico`. Composants : `Emblem`, `Logo`, `ChurchLogo` (`src/components/brand/logo.tsx`).
- Navigation des 3 espaces + menus admin par rôle : `src/config/navigation.ts`.
