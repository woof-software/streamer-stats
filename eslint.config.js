const js = require("@eslint/js");
const prettier = require("eslint-config-prettier");

module.exports = [
  {
    ignores: ["node_modules/", "dist/", ".cursor/", "*.min.js", ".husky/**"],
  },
  js.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {},
    },
    rules: {},
  },
];
