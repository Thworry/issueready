/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const cspContent =
  "default-src 'self'; " +
  "connect-src 'self' https://api.github.com; " +
  "img-src 'self' data:; " +
  "style-src 'self'; " +
  "script-src 'self'; " +
  "object-src 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self'; " +
  "upgrade-insecure-requests";

const productionCsp = (): Plugin => ({
  name: "issueready-production-csp",
  transformIndexHtml: {
    order: "post",
    handler(_html, context) {
      if (!context.bundle) return [];
      return [
        {
          tag: "meta",
          attrs: {
            "http-equiv": "Content-Security-Policy",
            content: cspContent
          },
          injectTo: "head"
        }
      ];
    }
  }
});

export default defineConfig({
  base: process.env.ISSUEREADY_BASE_PATH ?? "/",
  plugins: [react(), productionCsp()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        "src/main.tsx",
        "src/vite-env.d.ts"
      ],
      reporter: ["text", "json", "html"],
      thresholds: { lines: 90, functions: 90, statements: 90, branches: 85 }
    }
  }
});
