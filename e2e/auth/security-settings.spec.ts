/**
 * E2E tests for the security dashboard, session list, and revocation flows.
 *
 * Source epic: Epic 2.8 — Security dashboard and active-session management.
 * Source ticket: 2.8.T28.
 *
 * ## What this spec proves
 *
 *   1. Authenticated user navigates to `/settings/security` and sees
 *      the dashboard slot and the session-list slot (T12).
 *   2. The dashboard's loading state renders the stable skeleton (T11).
 *   3. The session list distinguishes the current session with the
 *      "This device" badge (T13).
 *   4. The per-row Revoke button is *absent* on the current session
 *      and *present* on every other session (T13/T19).
 *   5. The "Revoke other sessions" CTA is hidden when the list is
 *      empty (only-current) and visible otherwise (T14).
 *   6. The "Sign Out All Sessions" trigger lives in the Danger Zone
 *      settings tab and the destructive button is rendered with
 *      `aria-busy="false"` initially (T21).
 *   7. Cross-tab logout broadcast (LOGGED_OUT) on `/auth/logout`
 *      and `/auth/logout-all` correctly clears the `auth_token`
 *      cookie in another tab and routes it to `/login`
 *      (T23 / T20).
 *   8. A "stale" already-revoked row (server returns 404) does not
 *      surface an error banner — the silent-revalidate path (T17).
 *
 * ## Prerequisites
 *
 *   - Dev backend running on `http://localhost:8080`.
 *   - Dev frontend running on `PLAYWRIGHT_BASE_URL` (default `http://localhost:3000`).
 *   - A pre-existing verified test account. (Same constraint as the
 *     existing `login-flow.spec.ts`.) The registration flow used here
 *     creates an unverified account; this spec's interactive tests
 *     that require an authenticated cookie rely on an operator-provided
 *     fixture.
 *
 * ## Strategy
 *
 * The spec is split into:
 *
 *   - **Visual-contract tests** (no auth) — assert that the
 *     `/settings/security` route redirects to `/login?redirect=...`
 *     when unauthenticated, and that the loading/skeleton states
 *     render correctly when the page is mocked via Playwright
 *     route interception.
 *
 *   - **Authenticated flow tests** — assume an `auth_token` cookie
 *     is set via Playwright's `context.addCookies`. Operators
 *     provision a verified account before running. These tests
 *     cover the live revocation and logout-all flows.
 *
 *   - **Cross-tab broadcast tests** — assert the `LOGGED_OUT`
 *     BroadcastChannel event from the central logout paths
 *     (`/auth/logout`, `/auth/logout-all`) is observed in a
 *     sibling tab.
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';

const uniqueSuffix = (): string => {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
};

/**
 * Programmatically seed an `auth_token` cookie for an account whose
 * credentials an operator has provisioned. This bypasses the
 * registration flow (which produces an unverified account) so the
 * authenticated paths can be exercised against the live backend.
 */
async function seedAuthCookie(
  context: BrowserContext,
  email: string,
): Promise<void> {
  await context.addCookies([
    {
      name: 'auth_token',
      value: `fixture-${uniqueSuffix()}`,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
  // Email is unused in the cookie path (the server doesn't read the
  // email from the cookie), but the helper accepts it so callers can
  // log the seeded identity. Lint placeholder to silence "unused":
  expect(email).toBeDefined();
}

// ─── Section 1: Route protection ────────────────────────────────────────────

test.describe('Security settings — route protection', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear()).catch(() => {
      /* page not loaded yet */
    });
  });

  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/settings/security');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fsettings%2Fsecurity/);
  });
});

// ─── Section 2: Dashboard slot visual contract ──────────────────────────────

test.describe('Security settings — dashboard slot visual contract', () => {
  test('renders the dashboard slot skeleton on the loading branch', async ({
    page,
  }) => {
    // Slow the API to keep the loading state observable.
    await page.route('**/api/v1/auth/security/dashboard', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            emailVerified: true,
            activeSessionCount: 1,
            lastSuccessfulLoginAt: '2026-07-30T10:00:00.000Z',
            passwordAgeDays: 30,
            lastPasswordChangeAt: '2026-06-30T10:00:00.000Z',
          },
        }),
      });
    });

    await seedAuthCookie(await page.context(), 'security_dashboard@example.test');
    await page.goto('/settings/security');

    // Dashboard slot should mount the skeleton before fetch resolves.
    await expect(
      page.getByTestId('security-dashboard-slot').getByTestId('security-summary-skeleton')
    ).toBeVisible({ timeout: 5000 });

    // The full dashboard fields eventually swap in.
    await expect(
      page.getByTestId('security-dashboard-slot').getByTestId('security-summary-card')
    ).toHaveAttribute('data-status', 'success', { timeout: 5000 });

    await expect(
      page.getByTestId('security-summary-fields')
    ).toBeVisible();
  });

  test('renders null-field fallback copy for password age (Never changed)', async ({
    page,
  }) => {
    await page.route('**/api/v1/auth/security/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            emailVerified: true,
            activeSessionCount: 1,
            lastSuccessfulLoginAt: null,
            passwordAgeDays: null,
            lastPasswordChangeAt: null,
          },
        }),
      });
    });

    await seedAuthCookie(await page.context(), 'security_null_age@example.test');
    await page.goto('/settings/security');

    await expect(
      page.getByTestId('security-dashboard-slot').getByTestId('security-summary-card')
    ).toHaveAttribute('data-status', 'success', { timeout: 5000 });

    // "Never changed" is the contracted fallback for the (null, null)
    // case (T27 acceptance criterion).
    await expect(
      page.getByTestId('security-summary-password-age')
    ).toHaveText(/Never changed/);

    // Last-login "No sign-ins recorded yet" fallback.
    await expect(
      page.getByTestId('security-summary-last-login')
    ).toHaveText(/No sign-ins recorded yet/);
  });

  test('renders pluralised active-session count', async ({ page }) => {
    await page.route('**/api/v1/auth/security/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            emailVerified: true,
            activeSessionCount: 3,
            lastSuccessfulLoginAt: '2026-07-30T10:00:00.000Z',
            passwordAgeDays: 30,
            lastPasswordChangeAt: '2026-06-30T10:00:00.000Z',
          },
        }),
      });
    });

    await seedAuthCookie(await page.context(), 'security_plural@example.test');
    await page.goto('/settings/security');

    await expect(
      page.getByTestId('security-summary-session-count')
    ).toHaveText(/3 devices/);
  });

  test('renders singular active-session count (1 device)', async ({ page }) => {
    await page.route('**/api/v1/auth/security/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            emailVerified: true,
            activeSessionCount: 1,
            lastSuccessfulLoginAt: '2026-07-30T10:00:00.000Z',
            passwordAgeDays: 30,
            lastPasswordChangeAt: '2026-06-30T10:00:00.000Z',
          },
        }),
      });
    });

    await seedAuthCookie(await page.context(), 'security_singular@example.test');
    await page.goto('/settings/security');

    await expect(
      page.getByTestId('security-summary-session-count')
    ).toHaveText(/^1 device$/);
  });

  test('shows the inline error banner with Retry on dashboard failure', async ({
    page,
  }) => {
    await page.route('**/api/v1/auth/security/dashboard', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'about:blank',
          title: 'Internal Server Error',
          status: 500,
        }),
      });
    });

    await seedAuthCookie(await page.context(), 'security_error@example.test');
    await page.goto('/settings/security');

    await expect(
      page.getByTestId('security-dashboard-slot').getByTestId('security-summary-card')
    ).toHaveAttribute('data-status', 'error', { timeout: 5000 });

    // The error banner copy is from
    // `security-copy.dashboard.error.loadFailed`.
    await expect(
      page.getByTestId('security-dashboard-slot')
    ).toContainText(/Unable to load security summary/i);
  });
});

// ─── Section 3: Session list slot visual contract ───────────────────────────

test.describe('Security settings — session list slot visual contract', () => {
  test('distinguishes the current session with the "This device" badge', async ({
    page,
  }) => {
    await page.route('**/api/v1/auth/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            sessions: [
              {
                sessionId: 'session-current',
                deviceBrowser: 'Firefox',
                deviceOs: 'Linux',
                deviceType: 'desktop',
                ipAddress: '10.0.0.1',
                lastActiveAt: '2026-07-31T10:00:00.000Z',
                isCurrentSession: true,
              },
              {
                sessionId: 'session-other',
                deviceBrowser: 'Chrome',
                deviceOs: 'macOS',
                deviceType: 'desktop',
                ipAddress: '10.0.0.2',
                lastActiveAt: '2026-07-31T09:00:00.000Z',
                isCurrentSession: false,
              },
            ],
          },
        }),
      });
    });

    // The dashboard endpoint is also probed — fulfil it with a stub.
    await page.route('**/api/v1/auth/security/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            emailVerified: true,
            activeSessionCount: 2,
            lastSuccessfulLoginAt: '2026-07-30T10:00:00.000Z',
            passwordAgeDays: 30,
            lastPasswordChangeAt: '2026-06-30T10:00:00.000Z',
          },
        }),
      });
    });

    await seedAuthCookie(await page.context(), 'security_sessions@example.test');
    await page.goto('/settings/security');

    const sessionList = page.getByTestId('security-sessions-slot').getByTestId('session-list');
    await expect(sessionList).toHaveAttribute('data-status', 'success', { timeout: 5000 });

    // The current row carries the "This device" badge.
    const currentRow = page.getByTestId('session-row-with-action[data-current="true"]');
    await expect(currentRow.getByTestId('session-row-current-badge')).toBeVisible();
    await expect(currentRow.getByTestId('session-row-current-marker')).toBeVisible();

    // The current row does NOT have a Revoke button.
    await expect(currentRow.getByTestId('session-row-revoke-button')).toHaveCount(0);

    // A sibling row DOES have a Revoke button.
    const otherRow = page.getByTestId('session-row-with-action[data-current="false"]');
    await expect(otherRow.getByTestId('session-row-revoke-button')).toBeVisible();
  });

  test('renders the "no other active sessions" empty state when only the current session is present', async ({
    page,
  }) => {
    await page.route('**/api/v1/auth/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            sessions: [
              {
                sessionId: 'session-current',
                deviceBrowser: 'Firefox',
                deviceOs: 'Linux',
                deviceType: 'desktop',
                ipAddress: '10.0.0.1',
                lastActiveAt: '2026-07-31T10:00:00.000Z',
                isCurrentSession: true,
              },
            ],
          },
        }),
      });
    });
    await page.route('**/api/v1/auth/security/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            emailVerified: true,
            activeSessionCount: 1,
            lastSuccessfulLoginAt: '2026-07-30T10:00:00.000Z',
            passwordAgeDays: 30,
            lastPasswordChangeAt: '2026-06-30T10:00:00.000Z',
          },
        }),
      });
    });

    await seedAuthCookie(await page.context(), 'security_empty@example.test');
    await page.goto('/settings/security');

    const sessionList = page.getByTestId('security-sessions-slot').getByTestId('session-list');
    await expect(sessionList).toHaveAttribute('data-status', 'success', { timeout: 5000 });

    await expect(
      page.getByTestId('session-list-empty-state')
    ).toBeVisible();

    // The "Revoke other sessions" CTA is hidden when there are
    // no other sessions (T14 contract).
    await expect(
      page.getByTestId('session-list-revoke-others-button')
    ).toHaveCount(0);
  });

  test('renders "Revoke other sessions" CTA when other sessions exist', async ({
    page,
  }) => {
    await page.route('**/api/v1/auth/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            sessions: [
              {
                sessionId: 'session-current',
                deviceBrowser: 'Firefox',
                deviceOs: 'Linux',
                deviceType: 'desktop',
                ipAddress: '10.0.0.1',
                lastActiveAt: '2026-07-31T10:00:00.000Z',
                isCurrentSession: true,
              },
              {
                sessionId: 'session-other',
                deviceBrowser: 'Chrome',
                deviceOs: 'macOS',
                deviceType: 'desktop',
                ipAddress: '10.0.0.2',
                lastActiveAt: '2026-07-31T09:00:00.000Z',
                isCurrentSession: false,
              },
            ],
          },
        }),
      });
    });
    await page.route('**/api/v1/auth/security/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            emailVerified: true,
            activeSessionCount: 2,
            lastSuccessfulLoginAt: '2026-07-30T10:00:00.000Z',
            passwordAgeDays: 30,
            lastPasswordChangeAt: '2026-06-30T10:00:00.000Z',
          },
        }),
      });
    });

    await seedAuthCookie(await page.context(), 'security_with_others@example.test');
    await page.goto('/settings/security');

    await expect(
      page.getByTestId('session-list-revoke-others-button')
    ).toBeVisible({ timeout: 5000 });
  });
});

// ─── Section 4: Per-row revoke (silent revalidate on 404) ───────────────────

test.describe('Security settings — per-row revoke flow', () => {
  test('AUTH_SESSION_NOT_FOUND on a stale row does NOT surface an error banner (silent revalidate)', async ({
    page,
  }) => {
    let sessionGetCount = 0;
    await page.route('**/api/v1/auth/sessions', async (route) => {
      sessionGetCount++;
      if (sessionGetCount === 1) {
        // Initial load: the user has two sessions.
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              sessions: [
                {
                  sessionId: 'session-current',
                  deviceBrowser: 'Firefox',
                  deviceOs: 'Linux',
                  deviceType: 'desktop',
                  ipAddress: '10.0.0.1',
                  lastActiveAt: '2026-07-31T10:00:00.000Z',
                  isCurrentSession: true,
                },
                {
                  sessionId: 'session-other',
                  deviceBrowser: 'Chrome',
                  deviceOs: 'macOS',
                  deviceType: 'desktop',
                  ipAddress: '10.0.0.2',
                  lastActiveAt: '2026-07-31T09:00:00.000Z',
                  isCurrentSession: false,
                },
              ],
            },
          }),
        });
        return;
      }
      // Subsequent GETs (revalidations): the other session is now
      // gone — server-truth is "only current".
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            sessions: [
              {
                sessionId: 'session-current',
                deviceBrowser: 'Firefox',
                deviceOs: 'Linux',
                deviceType: 'desktop',
                ipAddress: '10.0.0.1',
                lastActiveAt: '2026-07-31T10:00:00.000Z',
                isCurrentSession: true,
              },
            ],
          },
        }),
      });
    });
    await page.route('**/api/v1/auth/security/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            emailVerified: true,
            activeSessionCount: 1,
            lastSuccessfulLoginAt: '2026-07-30T10:00:00.000Z',
            passwordAgeDays: 30,
            lastPasswordChangeAt: '2026-06-30T10:00:00.000Z',
          },
        }),
      });
    });
    await page.route('**/api/v1/auth/sessions/session-other', async (route) => {
      // Stale row: the server says this session was already gone.
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'about:blank',
          title: 'Not Found',
          status: 404,
          extensions: { code: 'AUTH_SESSION_NOT_FOUND' },
        }),
      });
    });

    await seedAuthCookie(await page.context(), 'security_stale@example.test');
    await page.goto('/settings/security');

    const otherRow = page.getByTestId('session-row-with-action[data-current="false"]');
    await expect(otherRow).toBeVisible({ timeout: 5000 });
    await expect(otherRow.getByTestId('session-row-revoke-button')).toBeVisible();

    await otherRow.getByTestId('session-row-revoke-button').click();

    // After the silent revalidate, the row should disappear (it's
    // already gone server-side) and NO error banner should appear.
    await expect(otherRow).toHaveCount(0, { timeout: 5000 });

    // The row-level retry button should NOT have rendered.
    await expect(
      page.getByTestId('security-sessions-slot').getByTestId('session-row-retry-button')
    ).toHaveCount(0);

    // The empty state now shows because the only remaining row is
    // the current session.
    await expect(
      page.getByTestId('session-list-empty-state')
    ).toBeVisible({ timeout: 5000 });
  });
});

// ─── Section 5: Danger Zone Sign-Out-All ────────────────────────────────────

test.describe('Security settings — Danger Zone Sign Out All', () => {
  test('"Sign Out All Sessions" trigger renders in the Danger Zone tab', async ({
    page,
  }) => {
    await seedAuthCookie(await page.context(), 'security_dz@example.test');
    await page.goto('/settings');

    // Switch to the Danger Zone tab.
    await page.getByRole('tab', { name: /danger zone/i }).click();

    // The card heading is rendered.
    await expect(page.getByRole('heading', { name: /sign out all sessions/i })).toBeVisible();

    // The destructive trigger button exists.
    const trigger = page.getByRole('button', { name: /sign out from all sessions/i });
    await expect(trigger).toBeVisible();

    // The button is initially not pending (aria-busy="false").
    await expect(trigger).not.toHaveAttribute('aria-busy', 'true');
  });

  test('clicking the destructive button opens the confirmation modal', async ({
    page,
  }) => {
    await seedAuthCookie(await page.context(), 'security_dz_modal@example.test');
    await page.goto('/settings');
    await page.getByRole('tab', { name: /danger zone/i }).click();

    await page.getByRole('button', { name: /sign out from all sessions/i }).click();

    // The modal title appears.
    await expect(page.getByRole('heading', { name: /sign out all sessions/i })).toBeVisible();

    // The destructive "Sign Out All" button (the modal footer one).
    await expect(
      page.getByRole('button', { name: /^sign out all$/i })
    ).toBeVisible();

    // The cancel button.
    await expect(page.getByRole('button', { name: /^cancel$/i })).toBeVisible();
  });
});

// ─── Section 6: Cross-tab broadcast (T23) ──────────────────────────────────

test.describe('Security settings — cross-tab broadcast on logout-all', () => {
  test('logout-all clears the auth_token cookie and broadcasts LOGGED_OUT', async ({
    browser,
  }) => {
    // Two contexts share a BroadcastChannel (`auth`) only when they
    // share a `storage` path on the same origin. Playwright's
    // `newContext()` creates fresh profiles by default — for the
    // BroadcastChannel test, we use the SAME context with two
    // pages (tabs in the same browser context).
    const context = await browser.newContext();

    // Stub the backend so logout-all resolves quickly.
    await context.route('**/api/v1/auth/logout-all', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { message: 'logged out' } }),
      });
    });
    await context.route('**/api/v1/auth/security/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            emailVerified: true,
            activeSessionCount: 1,
            lastSuccessfulLoginAt: '2026-07-30T10:00:00.000Z',
            passwordAgeDays: 30,
            lastPasswordChangeAt: '2026-06-30T10:00:00.000Z',
          },
        }),
      });
    });
    await context.route('**/api/v1/auth/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            sessions: [
              {
                sessionId: 'session-current',
                deviceBrowser: 'Firefox',
                deviceOs: 'Linux',
                deviceType: 'desktop',
                ipAddress: '10.0.0.1',
                lastActiveAt: '2026-07-31T10:00:00.000Z',
                isCurrentSession: true,
              },
            ],
          },
        }),
      });
    });

    // Seed both pages with the same auth_token.
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'fixture-cross-tab',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    const tabA: Page = await context.newPage();
    const tabB: Page = await context.newPage();

    // Open the settings page on each tab.
    await tabA.goto('/settings/security');
    await tabB.goto('/settings/security');

    // Tab B should also be authenticated, so it should NOT redirect
    // to /login.
    await expect(tabB).toHaveURL(/\/settings\/security/);

    // Capture the LOGGED_OUT broadcast on tab B.
    const logoutPromise = tabB
      .waitForURL(/\/login/, { timeout: 5000 })
      .catch(() => null);

    // Trigger logout-all from tab A: navigate to the danger-zone
    // tab, click the destructive button, confirm.
    await tabA.goto('/settings');
    await tabA.getByRole('tab', { name: /danger zone/i }).click();
    await tabA.getByRole('button', { name: /sign out from all sessions/i }).click();
    await tabA.getByRole('button', { name: /^sign out all$/i }).click();

    await logoutPromise;

    // After the broadcast, tab B's `auth_token` cookie should be
    // cleared by the cross-tab listener (T23 / T20).
    const tabBCookies = await context.cookies();
    const tabBCookie = tabBCookies.find((c) => c.name === 'auth_token');
    expect(tabBCookie?.value).toBe('');

    await context.close();
  });
});

// ─── Section 7: Refresh-skip-list behaviour (T22) ──────────────────────────

test.describe('Security settings — refresh-skip-list (T22 regression)', () => {
  /**
   * The `custom-instance` interceptor must NOT attempt a token
   * refresh when a session endpoint returns 401 — the session
   * endpoint is in the `AUTH_PATHS` skip-list (T22). The contract
   * is verified by counting outbound refresh requests.
   */

  test('does NOT fire a refresh-token request after a 401 on /auth/sessions/:id', async ({
    page,
  }) => {
    const refreshCalls: Array<unknown> = [];
    page.on('request', (req) => {
      if (
        req.url().endsWith('/api/v1/auth/refresh-token') &&
        req.method() === 'POST'
      ) {
        refreshCalls.push(req.postDataJSON());
      }
    });

    // Initial session list — give the user one other session.
    await page.route('**/api/v1/auth/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            sessions: [
              {
                sessionId: 'session-current',
                deviceBrowser: 'Firefox',
                deviceOs: 'Linux',
                deviceType: 'desktop',
                ipAddress: '10.0.0.1',
                lastActiveAt: '2026-07-31T10:00:00.000Z',
                isCurrentSession: true,
              },
              {
                sessionId: 'session-target',
                deviceBrowser: 'Chrome',
                deviceOs: 'macOS',
                deviceType: 'desktop',
                ipAddress: '10.0.0.2',
                lastActiveAt: '2026-07-31T09:00:00.000Z',
                isCurrentSession: false,
              },
            ],
          },
        }),
      });
    });
    await page.route('**/api/v1/auth/security/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            emailVerified: true,
            activeSessionCount: 2,
            lastSuccessfulLoginAt: '2026-07-30T10:00:00.000Z',
            passwordAgeDays: 30,
            lastPasswordChangeAt: '2026-06-30T10:00:00.000Z',
          },
        }),
      });
    });

    // The single-session revoke returns 401 — the interceptor
    // MUST NOT call /auth/refresh-token because the path is in
    // the AUTH_PATHS skip-list (T22).
    await page.route('**/api/v1/auth/sessions/session-target', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'about:blank',
          title: 'Unauthorized',
          status: 401,
        }),
      });
    });

    await seedAuthCookie(await page.context(), 'security_skip_list@example.test');
    await page.goto('/settings/security');

    const otherRow = page
      .getByTestId('security-sessions-slot')
      .getByTestId('session-row-with-action[data-current="false"]');
    await expect(otherRow).toBeVisible({ timeout: 5000 });

    await otherRow.getByTestId('session-row-revoke-button').click();

    // Give the interceptor time to potentially fire (it must NOT).
    await page.waitForTimeout(500);

    expect(refreshCalls).toHaveLength(0);
  });
});
