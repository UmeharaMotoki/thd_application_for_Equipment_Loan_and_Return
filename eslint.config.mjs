import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 同梱の AWS CLI 配布物（サードパーティ JS）
    "aws/**",
  ]),
  {
    rules: {
      // 下書き復元・検索デバウンス等で effect 内 setState が多く、実務上は許容する
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
