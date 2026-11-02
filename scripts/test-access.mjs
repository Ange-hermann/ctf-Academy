// Tests d'accès de l'espace étudiant (serveur local requis : npm.cmd run dev).
// Connecte les comptes de démonstration via Supabase Auth, puis vérifie les redirections de proxy.ts.
// Usage : npm.cmd run test:access   (BASE_URL=http://localhost:3000 par défaut)
import { createServerClient } from "@supabase/ssr";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: key } = process.env;
const PASSWORD = "Exemple2026";

async function sessionCookie(email) {
  const jar = new Map();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`${email} : ${error.message}`);
  return [...jar].map(([n, v]) => `${n}=${v}`).join("; ");
}

let failed = 0;
async function expectPath(label, cookie, path, expected) {
  const res = await fetch(BASE + path, { headers: cookie ? { cookie } : {}, redirect: "manual" });
  const location = res.headers.get("location");
  const landed = res.status >= 300 && res.status < 400 ? new URL(location, BASE).pathname : path;
  const ok = landed === expected && (res.status < 400 || res.status === 404);
  if (!ok) failed++;
  console.log(`${ok ? "✔" : "✘"} ${label} → ${landed} (${res.status})`);
}

const eds = await sessionCookie("eds.demo@example.com");
const dia = await sessionCookie("diacre.demo@example.com");
const cand = await sessionCookie("candidat.demo@example.com");

await expectPath("Visiteur → connexion", null, "/espace-etudiant", "/compte/connexion");
await expectPath("Étudiant EDS → tableau de bord", eds, "/espace-etudiant", "/espace-etudiant");
await expectPath("EDS ne peut pas ouvrir l'espace mémoire des diacres", eds, "/espace-etudiant/diacres/memoire", "/espace-etudiant");
await expectPath("Diacre ne peut pas ouvrir les niveaux EDS", dia, "/espace-etudiant/eds/niveaux", "/espace-etudiant");
await expectPath("Candidat en étude → suivi de candidature", cand, "/espace-etudiant", "/espace-etudiant/candidature");
await expectPath("Candidat en étude : aucune autre page", cand, "/espace-etudiant/cours", "/espace-etudiant/candidature");
await expectPath("Candidat : suivi accessible", cand, "/espace-etudiant/candidature", "/espace-etudiant/candidature");

console.log(failed ? `\n${failed} test(s) en échec` : "\nTous les tests d'accès sont passés.");
process.exit(failed ? 1 : 0);
