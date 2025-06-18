import globals from "globals";
import js from "@eslint/js";
import jestPlugin from "eslint-plugin-jest";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**", "playwright-report/**", "test-results/**"]
  },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021
      }
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...reactPlugin.configs["jsx-runtime"].rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/prop-types": "off" // Disabled for now
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  },
  {
    files: ["**/*.test.{js,jsx}", "__mocks__/**", "__tests__/**"],
    ...jestPlugin.configs["flat/recommended"],
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.jest
      }
    },
    rules: {
      ...jestPlugin.configs["flat/recommended"].rules,
      "react/display-name": "off"
    }
  },
  {
    files: [
      "main.js",
      "webpack.config.js",
      "babel.config.js",
      "jest.config.js",
      "jest.config.mock.js",
      "playwright.config.js",
      "electron-preload.js",
      "configIO.js",
      "scripts/**/*.js",
      "src/main/**/*.js",
      "src/utils/**/*.js",
      "test-utils/**/*.js"
    ],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node
      }
    }
  }
];
