import globals from "globals";
import js from "@eslint/js";
import jestPlugin from "eslint-plugin-jest";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import";
import promisePlugin from "eslint-plugin-promise";
import nodePlugin from "eslint-plugin-n";

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
      import: importPlugin,
      promise: promisePlugin,
    },
    rules: {
      ...reactPlugin.configs["jsx-runtime"].rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...importPlugin.configs.recommended.rules,
      ...promisePlugin.configs.recommended.rules,
      "react/prop-types": "off", // Disabled for now
      "import/no-unresolved": "error",
      "import/named": "error",
      "import/default": "error",
      "import/namespace": "error",
      "import/no-absolute-path": "error",
      "import/no-self-import": "error",
      "import/no-cycle": "warn",
      "import/no-unused-modules": "warn",
      "promise/always-return": "error",
      "promise/no-nesting": "warn",
      "promise/param-names": "error",
      "promise/no-return-wrap": "error"
    },
    settings: {
      react: {
        version: "detect"
      },
      "import/resolver": {
        node: {
          extensions: [".js", ".jsx", ".json", ".css"]
        }
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
      "src/main-process/**/*.js",
      "src/utils/**/*.js",
      "test-utils/**/*.js"
    ],
    plugins: {
      n: nodePlugin,
      promise: promisePlugin,
    },
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node
      }
    },
    rules: {
      ...nodePlugin.configs.recommended.rules,
      ...promisePlugin.configs.recommended.rules,
      "n/no-unpublished-require": "off", // Allow dev dependencies in config files
      "n/no-missing-require": "off" // Import plugin handles this better
    }
  },
  {
    // Special config for simulator scripts that need shebangs and process.exit
    files: ["scripts/simulators/**/*.js"],
    plugins: {
      n: nodePlugin,
      promise: promisePlugin,
    },
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node
      }
    },
    rules: {
      ...nodePlugin.configs.recommended.rules,
      ...promisePlugin.configs.recommended.rules,
      "n/hashbang": "off", // Allow shebang for executable scripts
      "n/shebang": "off", // Allow shebang for executable scripts  
      "n/no-process-exit": "off", // Allow process.exit in CLI scripts
      "n/no-unpublished-require": "off",
      "n/no-missing-require": "off"
    }
  }
];
