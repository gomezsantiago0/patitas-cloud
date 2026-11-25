/**
 * Configuración de ESLint para la API de Patitas.
 *
 * Usa el formato plano (flat config) en CommonJS, igual que el resto del código de la API.
 * Se aplican las reglas recomendadas de ESLint y se exige comparación estricta.
 */
const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  {
    ignores: ["node_modules/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
    },
  },
];