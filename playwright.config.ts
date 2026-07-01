import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  retries: 0,
  workers: 3,
  globalSetup: "./tests/global-setup.ts",
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    headless: true,
    screenshot: "only-on-failure",
  },
});
