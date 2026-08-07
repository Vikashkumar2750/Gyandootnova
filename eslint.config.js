import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

<<<<<<< HEAD
// Unicode ranges covering emoji + pictographic symbols. Public-facing UI
// must use Lucide icons instead of emoji for consistent theming/a11y.
const EMOJI_REGEX =
  "[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{1F000}-\\u{1F2FF}\\u{1F900}-\\u{1F9FF}\\u{1FA00}-\\u{1FAFF}]";

const emojiMessage =
  "Emojis are not allowed in public-facing UI. Use a Lucide icon (e.g. <Star />) instead.";

export default tseslint.config(
  { ignores: ["dist", "supabase/functions/**"] },
=======
export default tseslint.config(
  { ignores: ["dist"] },
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
<<<<<<< HEAD
  // No-emoji rule for public pages + shared components.
  // Excludes admin/, dashboard toasts, and test files where emoji are acceptable internally.
  {
    files: ["src/pages/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    ignores: [
      "src/pages/admin/**",
      "src/pages/Admin*.tsx",
      "src/components/admin/**",
      "**/*.test.{ts,tsx}",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=/${EMOJI_REGEX}/u]`,
          message: emojiMessage,
        },
        {
          selector: `TemplateElement[value.raw=/${EMOJI_REGEX}/u]`,
          message: emojiMessage,
        },
        {
          selector: `JSXText[value=/${EMOJI_REGEX}/u]`,
          message: emojiMessage,
        },
      ],
    },
  },
=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
);
