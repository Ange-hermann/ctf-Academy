# CTF ACADEMY

Site public et portail d'inscription de **CTF ACADEMY**, la plateforme de formation du
**Centre de Transformation des Familles**. Next.js 16 (App Router), TypeScript strict,
Tailwind CSS v4, React Three Fiber, Supabase.

## Installation

```powershell
npm.cmd install
npm.cmd run dev     # http://localhost:3000
```

Sous Windows / PowerShell, utiliser `npm.cmd` / `npx.cmd` (`npm.ps1` est bloqué par la
stratégie d'exécution). Pour ajouter une dépendance :
`npm.cmd install <paquet> --before=<date J-7>` (versions publiées depuis au moins 7 jours).

## Variables d'environnement

Copier `env.example` vers `.env.local`. Tout est **optionnel** : sans Supabase, le site
fonctionne en **mode démonstration** (comptes et candidatures simulés dans des cookies
httpOnly, contenus statiques issus de `src/content/`).

| Variable | Rôle |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | URL publique (SEO, sitemap, liens absolus) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Auth (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Écritures serveur sans Prisma — jamais côté client |
| `DATABASE_URL` | Connexion PostgreSQL utilisée par **Prisma** (pooler Supabase). Couche données principale |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Numéro d'assistance (format international sans `+`) |
| `PAYMENT_PROVIDER` | `mock` (défaut) — futur : CinetPay / PayDunya / FedaPay |
| `EMAIL_PROVIDER` + `RESEND_API_KEY` / `SMTP_*` | Envoi d'e-mails (mock sinon) |
| `WHATSAPP_PROVIDER` + `WHATSAPP_BUSINESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | Notifications WhatsApp (mock sinon) |

## Commandes

| Commande | Effet |
| --- | --- |
| `npm.cmd run dev` | Serveur de développement (Turbopack) |
| `npm.cmd run build` | Build de production + vérification TypeScript |
| `npm.cmd run lint` | ESLint |
| `npm.cmd run brand` | Régénère les assets de marque depuis `public/logo.jpeg` |

Démo des composants : `/design-system`.

## Structure

```
src/app/(site)/        Pages publiques (accueil, découvrir, formations, admissions, compte,
                       inscription, galerie/photos, galerie/videos, evenements, admin)
src/components/shell/  Enveloppe noir & or : ShellFrame, SidebarNav, TopBar, MegaMenu,
                       FullMenu, MobileDrawer, SearchPalette, BrandMedallion, GoldArcs
src/components/home/   Accueil : MediaTabs (Photos/Vidéo/Événements), StageViewer, StageTitle
src/components/gallery/ Médiathèque : PhotosGallery, Lightbox, VideosGallery, VideoModal,
                       EventsGallery, EventCard, EventCountdown
src/components/ui/     Design system (FloatingField, StepPath, badges, accordions…)
src/components/forms/  Formulaires (compte, inscription en 5 étapes)
src/components/three/  Scènes WebGL (imports dynamiques, repli 2D)
src/content/           Contenus éditables (formations, navigation, media, identité, FAQ…)
src/lib/data/          Couche de lecture publique (repli Prisma → Supabase → démo)
supabase/              Migrations SQL + seeds (RLS incluses)
public/brand/          Assets générés (emblem, logo-full, og, logo-ctf.svg)
public/media/          Visuels « Exemple » générés (scripts/gen-media.mjs)
```

## Enveloppe (shell) noir & or

Les trois espaces partagent le même cadre : **barre latérale fixe à gauche** (médaillon,
entrées à pilule dorée glissante, arcs lumineux) + **barre supérieure** (entrées avec
chevrons, méga-menus, ligne dorée animée, recherche `Ctrl/Cmd+K`, menu plein écran).
Sur mobile : tiroir latéral + bouton « S'inscrire » fixe.

- `PublicShell` — site public (7 entrées latérales, 5 entrées supérieures).
- `StudentShell` — espace étudiant (menu adapté à la formation, barre du bas mobile,
  lecteur de cours en mode concentration sans aucun effet).
- `AdminShell` — la page `/admin` actuelle est déjà enveloppée par le shell public,
  sobre ; le back-office complet arrive avec le prompt d'administration.

## Modifier la navigation

Toute la navigation vit dans **`src/content/navigation.ts`** (source unique — ne jamais
dupliquer un menu dans un composant) : `mainNav` (barre supérieure + méga-menus),
`publicSidebarNav` (barre latérale), `mediaNav`, `routes` et la règle d'état actif
`activeSidebarIndex`. Ajouter une entrée = ajouter un objet `{ label, href, icon,
description }` à la liste correspondante.

## Médiathèque et événements

Rubriques publiques : `/galerie/photos` (+ `…/[albumSlug]`, visionneuse plein écran),
`/galerie/videos` (lecteur en modale — **l'iframe n'est chargée qu'au clic**),
`/evenements` (+ détail, export `.ics`, lien Google Calendar).

Données : tables `media_albums`, `media_photos`, `media_videos`, `events`
(migration `supabase/migrations/20261019000001_media_events_pastorale.sql`, seed
`supabase/seed-media.sql`). Ordre de repli de lecture : **Prisma → Supabase (RLS,
éléments publiés) → contenus « Exemple »** (`src/content/media.ts`, couche
`src/lib/data/media.ts`). Pour ajouter un contenu, insérer une ligne dans la table
correspondante via le tableau de bord Supabase (`is_example = false` une fois officiel).

## Formations

Quatre parcours : **EDS**, **EDM**, **Diacres**, **École de pastorale**
(`/formations/pastorale`, contenus marqués `// TODO` en attendant les textes officiels).
Pour ajouter/éditer une formation : `src/content/formations.ts` (+ entrée de navigation
et slug SQL dans `formations`). Les étudiants pastorale ont une page dédiée
`/espace-etudiant/pastorale/fonctions` (périmètre à définir).

## Contenus éditables

Les textes publics sont centralisés dans `src/content/`. Les passages à valider par
l'Église sont marqués `// TODO: texte officiel` ; les tarifs et durées affichés portent
un badge « Exemple » tant que les valeurs officielles ne sont pas fournies.

## Parcours d'inscription (`/inscription`)

Cinq étapes : **formation → formulaire → paiement → validation → accès**.
Trois statuts strictement indépendants, suivis dans `/compte/candidature` :

- **Inscription** : `draft → submitted → complete`
- **Paiement** : `pending → confirmed | failed | refunded | partial`
- **Admission** : `under_review → admitted | rejected | waitlisted`

Le montant est toujours recalculé côté serveur ; le paiement passe par l'interface
`PaymentProvider` (`src/lib/payments/provider.ts`, mock par défaut — un numéro finissant
par `0000` simule un échec). E-mails et WhatsApp passent par des abstractions
(`src/lib/notifications/`). Sans session utilisateur, un compte est créé à la volée ;
la reprise du dossier repose sur un cookie `id.jeton` dont seul le haché est stocké
(`application_access_tokens`).

## Base de données : Prisma + Supabase

- **Prisma** est l'ORM des données applicatives : schéma `prisma/schema.prisma`
  (miroir de la migration SQL), client généré dans `src/generated/prisma/`
  (`postinstall` = `prisma generate`), singleton `src/lib/db.ts`.
- **Supabase** reste en charge de l'**authentification** (e-mail, cookies `@supabase/ssr`,
  `src/proxy.ts`) et de la création de profil via trigger `handle_new_user`.
- Ordre de repli des lectures/écritures : **Prisma → Supabase → démonstration**
  (cookies httpOnly). Sans `DATABASE_URL`, tout fonctionne en mode démo.

Commandes :

```powershell
npx.cmd prisma generate      # régénérer le client
npx.cmd prisma migrate dev   # créer/appliquer une migration (DATABASE_URL requis)
npx.cmd prisma db pull       # resynchroniser le schéma depuis la base
```

Pour déployer le schéma initial : exécuter `supabase/migrations/20261015000001_public_site.sql`
puis `supabase/seed.sql` dans le SQL Editor Supabase — ou utiliser `prisma migrate diff`
pour générer l'équivalent depuis `prisma/schema.prisma`.

Les tables publiques (formations, sessions, FAQ) sont lues par tous ; profils,
candidatures et paiements sont protégés par RLS.

## Accessibilité et performance

- Mobile first, cibles tactiles ≥ 44 px, contrastes AA.
- `prefers-reduced-motion` respecté ; bascule « mode allégé » dans le pied de page.
- Scènes 3D en import dynamique avec repli 2D (particules dorées CSS).
- PWA : `manifest.webmanifest`, service worker (`public/sw.js`, prod uniquement) et
  page `/hors-ligne`.
- SEO : métadonnées par page, Open Graph / Twitter, `sitemap.xml`, `robots.txt`,
  JSON-LD (Organisation, Course, FAQ, fil d'Ariane).
