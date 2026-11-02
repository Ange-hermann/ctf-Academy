import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Scènes React Three Fiber : la mutation d'objets three.js dans useFrame et la
    // génération aléatoire des géométries sont des idiomes impératifs, hors sémantique
    // de rendu React (react-hooks/purity & immutability sont des faux positifs ici).
    files: ["src/components/three/**"],
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Client Prisma généré : ne pas le linter.
    "src/generated/**",
  ]),
]);

export default eslintConfig;
