// Vérifie la casse des imports "@/…" : OK sur Windows (insensible), KO sur Linux (sensible).
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const exts = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", "/index.ts", "/index.tsx"];
const realFiles = new Set();

function index(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name).replaceAll("\\", "/");
    if (e.isDirectory()) index(p);
    else realFiles.add(p);
  }
}
index("src");
const lowerMap = new Map();
for (const f of realFiles) lowerMap.set(f.toLowerCase(), f);

const mismatches = [];
const missing = [];
function scan(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name).replaceAll("\\", "/");
    if (e.isDirectory()) {
      if (e.name !== "generated") scan(p);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(e.name)) continue;
    const content = readFileSync(p, "utf8");
    for (const m of content.matchAll(/from\s+["'](@\/[^"']+)["']/g)) {
      const spec = "src/" + m[1].slice(2);
      if (exts.some((x) => existsSync(spec + x))) continue;
      const real = exts.map((x) => lowerMap.get((spec + x).toLowerCase())).find(Boolean);
      if (real) mismatches.push(`${p}  →  ${m[1]}  (réel : ${real.slice(4)})`);
      else missing.push(`${p}  →  ${m[1]}`);
    }
  }
}
scan("src");
console.log("=== Casse incorrecte (OK Windows, KO Linux) ===");
console.log(mismatches.length ? mismatches.join("\n") : "aucune");
console.log("=== Imports introuvables ===");
console.log(missing.length ? missing.join("\n") : "aucun");
