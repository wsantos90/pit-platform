const coreWebVitals = require("eslint-config-next/core-web-vitals");
const typescript = require("eslint-config-next/typescript");

module.exports = [
  {
    ignores: ["coverage/**"],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["src/app/(dashboard)/moderation/components/ClaimQueue.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  {
    files: ["eslint.config.js", "tailwind.config.ts", "scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];
