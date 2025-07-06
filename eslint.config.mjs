import js from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

export default [
    {
        ignores: [
            ".next/**",
            "dist/**",
            "node_modules/**",
            "coverage/**",
            "*.config.js",
            "*.config.mjs",
            "*.config.ts"
        ]
    },
    js.configs.recommended,
    {
        files: ["**/*.{ts,tsx}"],
        plugins: {
            "@typescript-eslint": typescriptEslint,
        },
        languageOptions: {
            parser: tsParser,
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.node,
                ...globals.browser,
            },
            parserOptions: {
                project: "./tsconfig.json",
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        rules: {
            ...typescriptEslint.configs.recommended.rules,
            "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-non-null-assertion": "warn",
            "@typescript-eslint/no-require-imports": "warn",
            "prefer-const": "warn",
            "no-var": "error",
            "no-undef": "off",
            "no-unused-vars": "off",
        },
    },
]; 