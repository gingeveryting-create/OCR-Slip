import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    ".next-corrupt-*/**",
    ".open-next/**",
    ".wrangler/**",
    ".agents/**",
    "supabase/.temp/**",
    "tools/**",
    "coverage/**",
    "cloudflare-env.d.ts",
    "next-env.d.ts"
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
]);
