/**
 * Playwright config for the registration Epic 2.1.
 *
 * Source epic: Epic 2.1 — Registration form and availability guidance.
 * Source tickets: TKT-2.1.F1, TKT-2.1.F2.
 *
 * What this config does NOT do
 *   - It does NOT spin up its own backend. The dev backend is
 *     expected to be running on `http://localhost:8080` and the dev
 *     mailbox provider (Resend or equivalent) to be configured. The
 *     Playwright specs assume a live system; they will not pass
 *     against a stubbed backend.
 *
 *   - It does NOT install browsers automatically. Operators run
 *     `pnpm exec playwright install chromium` once after pulling.
 *
 * The config is intentionally minimal: a single project
 * (`chromium`), the dev URL via `PLAYWRIGHT_BASE_URL`, and a single
 * reporter (`list`). CI configs should swap `list` for `dot`/`html`
 * per the platform's preference.
 */

import { defineConfig } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const HEADLESS = process.env.PLAYWRIGHT_HEADLESS !== '0';

export default defineConfig({
  testDir: './e2e/auth',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    headless: HEADLESS,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    // Anti-enumeration: every spec asserts the EXACT acknowledgement
    // body. Disabling the action timeout's "extra retries" surface
    // ensures deterministic behaviour.
    extraHTTPHeaders: {
      Accept: 'application/json, text/html',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
});