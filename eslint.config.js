import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

const jsxUsesVars = {
  meta: { type: "problem", schema: [] },
  create(context) {
    return {
      JSXIdentifier(node) {
        let scope = context.sourceCode.getScope(node);
        while (scope) {
          const variable = scope.set.get(node.name);
          if (variable) {
            variable.eslintUsed = true;
            return;
          }
          scope = scope.upper;
        }
      },
    };
  },
};

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "node_modules.damaged*/**",
      ".npm-cache/**",
      "design-evidence/**",
      "audit-evidence/**",
      "work/**",
      "tmp/**",
      "public/**",
      "runtime-public/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      local: { rules: { "jsx-uses-vars": jsxUsesVars } },
      "react-hooks": reactHooks,
    },
    rules: {
      "local/jsx-uses-vars": "error",
      "react-hooks/rules-of-hooks": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^(?:_|Legacy)" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
