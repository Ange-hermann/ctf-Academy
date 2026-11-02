// Outil de vérification : récupère une page en tant que compte de démonstration.
// Usage : node --env-file=.env.local scripts/fetch-as.mjs <eds|edm|diacre|candidat> <chemin> [texte attendu…]
import { createServerClient } from "@supabase/ssr";

const [who = "eds", path = "/espace-etudiant", ...expected] = process.argv.slice(2);
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const jar = new Map();
const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
  },
});
const { error } = await supabase.auth.signInWithPassword({ email: `${who}.demo@example.com`, password: "Exemple2026" });
if (error) throw error;
const cookie = [...jar].map(([n, v]) => `${n}=${v}`).join("; ");

const res = await fetch(BASE + path, { headers: { cookie }, redirect: "manual" });
const html = await res.text();
console.log(`${res.status} ${path}${res.headers.get("location") ? ` → ${res.headers.get("location")}` : ""}`);
const err = html.match(/<template data-dgst[^>]*>|"digest":"[^"]+"|Application error|Unhandled Runtime Error/);
if (err) console.log("⚠ Erreur détectée :", err[0]);
for (const text of expected) console.log(`${html.includes(text) ? "✔" : "✘"} « ${text} »`);
