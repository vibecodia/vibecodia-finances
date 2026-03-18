import js from "@eslint/js";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      // TypeScript
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",

      // Import order
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",    // node:fs, node:path
            "external",   // express, axios
            "internal",   // @/lib/...
            "parent",     // ../
            "sibling",    // ./
            "index",      // ./index
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/no-duplicates": "error",
    },
  },
  {
    // Arquivos a ignorar
    ignores: ["node_modules/**", "dist/**", "build/**"],
  }
);
