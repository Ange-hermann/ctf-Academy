// Sauvegarde le HTML d'une page en tant que compte de démo : node scripts/dump-as.mjs <compte> <chemin> <fichier-sortie>
import { writeFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";
const [who, path, out] = process.argv.slice(2);
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const jar = new Map();
const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (l) => l.forEach(({ name, value }) => jar.set(name, value)) },
});
const { error } = await supabase.auth.signInWithPassword({ email: `${who}.demo@example.com`, password: "Exemple2026" });
if (error) throw error;
const cookie = [...jar].map(([n, v]) => `${n}=${v}`).join("; ");
const res = await fetch(BASE + path, { headers: { cookie }, redirect: "manual" });
writeFileSync(out, await res.text());
console.log(res.status, "→", out);
