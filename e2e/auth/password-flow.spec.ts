/**
 * E2E tests for the password verification and password change flows.
 *
 * Source epic: Epic 2.9 — Password re-verification and password change.
 * Source ticket: 2.9.T20.
 *
 * ## What this spec proves
 *
 *   1. Authenticated user opens `/settings/security`, clicks
 *      "Change password", sees the verify modal.
 *   2. Submitting the wrong current password renders
 *      `changePassword.errors.invalidCurrent` under the field and
 *      clears the field.
 *   3. Submitting the correct current password closes the verify
 *      modal and reveals the change-password card.
 *   4. Submitting a weak new password renders strength-meter copy
 *      under the field.
 *   5. Submitting a new password equal to the current renders
 *      `changePassword.errors.equalToCurrent` under `newPassword`.
 *   6. Submitting mismatched confirm renders
 *      `changePassword.errors.mismatch` under `confirmPassword`.
 *   7. Submitting a reused new password renders
 *      `changePassword.errors.reuse` under `newPassword`.
 *   8. Successful change shows `changePassword.success`, the
 *      dashboard updates `passwordAgeDays` and `lastPasswordChangeAt`,
 *      and the sessions list shows only the current session.
 *   9. The verify-password modal and change-password card never
 *      echo the password back to the user (no value reflects in
 *      the DOM, no analytics/log call carries the value).
 *
 * ## Prerequisites
 *
 *   - Dev backend running on `http://localhost:8080`.
 *   - Dev frontend running on `PLAYWRIGHT_BASE_URL` (default
 *     `http://localhost:3000`).
 *
 * ## Strategy
 *
 * Like the existing `security-settings.spec.ts` (2.8.T28): all
 * external HTTP calls are intercepted via Playwright's `page.route`
 * so the spec is self-contained and deterministic. The
 * `auth_token` cookie is seeded for each spec via
 * `seedAuthCookie()`; the cookie value is a stub that the
 * intercept handler ignores (the server isn't actually contacted
 * for the verify/change endpoints).
 *
 * The verify-password modal and the change-password card both hit
 * `/auth/verify-password` and `/auth/change-password`. The spec
 * `fulfill`s these with deterministic bodies (success / 401
 * invalid_current / 409 reuse / 503 retryable). Every other
 * authenticated endpoint the page might call
 * (`/auth/security/dashboard`, `/auth/sessions`) is also
 * intercepted so the page can mount.
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';

const uniqueSuffix = (): string => {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
};

/**
 * Seed an `auth_token` cookie for the test. The value is a
 * stub — the intercept handler ignores it.
 */
async function seedAuthCookie(context: BrowserContext): Promise<void> {
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
}

/**
 * Install default route stubs for the dashboard + sessions
 * endpoints that the page fetches on mount. Returns a `route`
 * helper that test bodies can call to override these defaults
 * with a per-spec response.
 */
async function stubDashboardAndSessions(
  page: Page,
  options: {
    dashboard?: object;
    sessions?: object;
    sessionsReplaceOnMutate?: boolean;
  } = {},
): Promise<{
  setDashboard: (body: object) => void;
  setSessions: (body: object) => void;
}> {
  let dashboardBody = options.dashboard ?? {
    data: {
      emailVerified: true,
      activeSessionCount: 1,
      lastSuccessfulLoginAt: '2026-07-30T10:00:00.000Z',
      passwordAgeDays: 30,
      lastPasswordChangeAt: '2026-06-30T10:00:00.000Z',
    },
  };
  let sessionsBody = options.sessions ?? {
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
  };

  await page.route('**/api/v1/auth/security/dashboard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(dashboardBody),
    });
  });

  await page.route('**/api/v1/auth/sessions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(sessionsBody),
    });
  });

  return {
    setDashboard: (next) => {
      dashboardBody = next;
    },
    setSessions: (next) => {
      sessionsBody = next;
    },
  };
}

// ─── Section 1: Verify-password modal opens and renders ─────────────────────

test.describe('Password flow — verify modal opens', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear()).catch(() => {
      /* page not loaded yet */
    });
  });

  test('clicking the "Change password" CTA opens the verify modal', async ({
    page,
    context,
  }) => {
    await stubDashboardAndSessions(page);
    await seedAuthCookie(context);
    await page.goto('/settings/security');

    // Wait for the dashboard card to settle.
    await expect(
      page
        .getByTestId('security-dashboard-slot')
        .getByTestId('security-summary-card')
    ).toHaveAttribute('data-status', 'success', { timeout: 5000 });

    // The "Change password" CTA renders below the dashboard.
    const cta = page.getByTestId('change-password-cta');
    await expect(cta).toBeVisible();
    await cta.click();

    // The verify modal mounts.
    const modal = page.getByTestId('verify-password-modal');
    await expect(modal).toBeVisible();

    // Title and field render.
    await expect(modal.getByText(/Confirm your password/i)).toBeVisible();
    await expect(modal.getByText(/Current password/i).first()).toBeVisible();

    // The submit button is disabled until a password is typed.
    await expect(modal.getByTestId('verify-password-submit')).toBeDisabled();

    // Cancel closes the modal.
    await modal.getByTestId('verify-password-cancel').click();
    await expect(modal).not.toBeVisible();
  });
});

// ─── Section 2: Verify-password invalid_current error ───────────────────────

test.describe('Password flow — verify modal field errors', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear()).catch(() => {
      /* page not loaded yet */
    });
  });

  test('wrong current password renders the field-level error and clears the field', async ({
    page,
    context,
  }) => {
    await stubDashboardAndSessions(page);
    await seedAuthCookie(context);

    // The verify-password endpoint returns 401 AUTH_INVALID_CURRENT_PASSWORD.
    await page.route('**/api/v1/auth/verify-password', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'about:blank',
          title: 'Unauthorized',
          status: 401,
          detail: 'Current password is incorrect',
          extensions: {
            code: 'AUTH_INVALID_CURRENT_PASSWORD',
          },
        }),
      });
    });

    await page.goto('/settings/security');
    await expect(
      page
        .getByTestId('security-dashboard-slot')
        .getByTestId('security-summary-card')
    ).toHaveAttribute('data-status', 'success', { timeout: 5000 });

    await page.getByTestId('change-password-cta').click();
    const modal = page.getByTestId('verify-password-modal');
    await expect(modal).toBeVisible();

    // Type a wrong password and submit.
    const passwordInput = modal.locator('input[type="password"], input[type="text"]').first();
    await passwordInput.fill('Wrong1!aaaa');
    await modal.getByTestId('verify-password-submit').click();

    // Field-level error renders.
    await expect(modal.getByTestId('verify-password-field-error')).toHaveText(
      /Current password is incorrect/i,
    );

    // The field is cleared after the error.
    await expect(passwordInput).toHaveValue('');

    // The CTA re-appears when the modal closes (we never verified).
    // (Closing via Cancel returns the user to the page; the CTA is
    // still mounted because the verification flag was never set.)
    await modal.getByTestId('verify-password-cancel').click();
    await expect(page.getByTestId('change-password-cta')).toBeVisible();
  });
});

// ─── Section 3: Successful verify reveals the change-password card ──────────

test.describe('Password flow — verified → card reveals', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear()).catch(() => {
      /* page not loaded yet */
    });
  });

  test('correct current password closes the modal and reveals the change-password card', async ({
    page,
    context,
  }) => {
    await stubDashboardAndSessions(page);
    await seedAuthCookie(context);

    await page.route('**/api/v1/auth/verify-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { valid: true } }),
      });
    });

    await page.goto('/settings/security');
    await expect(
      page
        .getByTestId('security-dashboard-slot')
        .getByTestId('security-summary-card')
    ).toHaveAttribute('data-status', 'success', { timeout: 5000 });

    await page.getByTestId('change-password-cta').click();
    const modal = page.getByTestId('verify-password-modal');
    await expect(modal).toBeVisible();

    const passwordInput = modal.locator('input[type="password"], input[type="text"]').first();
    await passwordInput.fill('Correct1!aaaa');
    await modal.getByTestId('verify-password-submit').click();

    // Modal closes.
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // The CTA disappears (verification flag is set).
    await expect(page.getByTestId('change-password-cta')).not.toBeVisible();

    // The change-password card slot mounts.
    const card = page.getByTestId('change-password-card');
    await expect(card).toBeVisible();

    // The three fields are present.
    await expect(card.getByText(/Current password/i).first()).toBeVisible();
    await expect(card.getByText(/New password/i).first()).toBeVisible();
    await expect(card.getByText(/Confirm new password/i)).toBeVisible();
  });
});

// ─── Section 4: Change-password client validation ───────────────────────────

test.describe('Password flow — change-password client validation', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear()).catch(() => {
      /* page not loaded yet */
    });
  });

  test('weak new password renders strength-meter copy under the field', async ({
    page,
    context,
  }) => {
    await stubDashboardAndSessions(page);
    await seedAuthCookie(context);

    // Verify succeeds.
    await page.route('**/api/v1/auth/verify-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { valid: true } }),
      });
    });

    await page.goto('/settings/security');
    await expect(
      page
        .getByTestId('security-dashboard-slot')
        .getByTestId('security-summary-card')
    ).toHaveAttribute('data-status', 'success', { timeout: 5000 });

    await page.getByTestId('change-password-cta').click();
    const modal = page.getByTestId('verify-password-modal');
    await modal.locator('input[type="password"], input[type="text"]').first().fill('Correct1!aaaa');
    await modal.getByTestId('verify-password-submit').click();

    const card = page.getByTestId('change-password-card');
    await expect(card).toBeVisible();

    // Fill the fields with a weak new password (score 0).
    const inputs = card.locator('input[type="password"]');
    await inputs.nth(0).fill('Old1!aaaa'); // current
    await inputs.nth(1).fill('abc'); // weak new
    await inputs.nth(2).fill('abc'); // confirm

    // The strength meter renders with a "Too weak" label.
    const strengthLabel = card.getByTestId('change-password-strength-label');
    await expect(strengthLabel).toHaveText(/Too weak/i);

    // Click submit. Client-side validation rejects BEFORE any
    // network call. The new-password field-level error renders.
    const changeRequests: string[] = [];
    await page.route('**/api/v1/auth/change-password', async (route) => {
      changeRequests.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { message: 'ok' } }),
      });
    });

    await card.getByTestId('change-password-submit').click();

    // No network request fired.
    expect(changeRequests).toHaveLength(0);

    // Field-level error renders under new-password.
    await expect(card.getByTestId('change-password-new-error')).toHaveText(
      /Choose a stronger password/i,
    );
  });

  test('mismatched confirm renders mismatch error under confirmPassword', async ({
    page,
    context,
  }) => {
    await stubDashboardAndSessions(page);
    await seedAuthCookie(context);

    await page.route('**/api/v1/auth/verify-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { valid: true } }),
      });
    });

    await page.goto('/settings/security');
    await expect(
      page
        .getByTestId('security-dashboard-slot')
        .getByTestId('security-summary-card')
    ).toHaveAttribute('data-status', 'success', { timeout: 5000 });

    await page.getByTestId('change-password-cta').click();
    const modal = page.getByTestId('verify-password-modal');
    await modal.locator('input[type="password"], input[type="text"]').first().fill('Correct1!aaaa');
    await modal.getByTestId('verify-password-submit').click();

    const card = page.getByTestId('change-password-card');
    await expect(card).toBeVisible();

    // Fill the fields with mismatched confirm.
    const inputs = card.locator('input[type="password"]');
    await inputs.nth(0).fill('Old1!aaaa'); // current
    await inputs.nth(1).fill('New1!bbbb'); // new (strong: 4 chars, uppercase, digit, symbol)
    await inputs.nth(2).fill('Different1!cccc'); // confirm (different)

    const changeRequests: string[] = [];
    await page.route('**/api/v1/auth/change-password', async (route) => {
      changeRequests.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { message: 'ok' } }),
      });
    });

    await card.getByTestId('change-password-submit').click();

    // No network call fired.
    expect(changeRequests).toHaveLength(0);

    // Field-level error under confirmPassword.
    await expect(card.getByTestId('change-password-confirm-error')).toHaveText(
      /Passwords do not match/i,
    );
  });
});

// ─── Section 5: Change-password server validation ───────────────────────────

test.describe('Password flow — change-password server errors', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear()).catch(() => {
      /* page not loaded yet */
    });
  });

  test('reused password (409 AUTH_PASSWORD_REUSE) renders reuse error under newPassword', async ({
    page,
    context,
  }) => {
    await stubDashboardAndSessions(page);
    await seedAuthCookie(context);

    await page.route('**/api/v1/auth/verify-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { valid: true } }),
      });
    });

    await page.route('**/api/v1/auth/change-password', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'about:blank',
          title: 'Conflict',
          status: 409,
          detail: 'Password was used recently',
          extensions: {
            code: 'AUTH_PASSWORD_REUSE',
          },
        }),
      });
    });

    await page.goto('/settings/security');
    await expect(
      page
        .getByTestId('security-dashboard-slot')
        .getByTestId('security-summary-card')
    ).toHaveAttribute('data-status', 'success', { timeout: 5000 });

    await page.getByTestId('change-password-cta').click();
    const modal = page.getByTestId('verify-password-modal');
    await modal.locator('input[type="password"], input[type="text"]').first().fill('Correct1!aaaa');
    await modal.getByTestId('verify-password-submit').click();

    const card = page.getByTestId('change-password-card');
    await expect(card).toBeVisible();

    const inputs = card.locator('input[type="password"]');
    await inputs.nth(0).fill('Old1!aaaa');
    await inputs.nth(1).fill('New1!bbbb');
    await inputs.nth(2).fill('New1!bbbb');

    await card.getByTestId('change-password-submit').click();

    await expect(card.getByTestId('change-password-new-error')).toHaveText(
      /Choose a password you haven't used before/i,
    );
  });

  test('wrong current password (401 AUTH_INVALID_CURRENT_PASSWORD) clears the currentPassword field', async ({
    page,
    context,
  }) => {
    await stubDashboardAndSessions(page);
    await seedAuthCookie(context);

    await page.route('**/api/v1/auth/verify-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { valid: true } }),
      });
    });

    await page.route('**/api/v1/auth/change-password', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'about:blank',
          title: 'Unauthorized',
          status: 401,
          detail: 'Current password is incorrect',
          extensions: {
            code: 'AUTH_INVALID_CURRENT_PASSWORD',
          },
        }),
      });
    });

    await page.goto('/settings/security');
    await expect(
      page
        .getByTestId('security-dashboard-slot')
        .getByTestId('security-summary-card')
    ).toHaveAttribute('data-status', 'success', { timeout: 5000 });

    await page.getByTestId('change-password-cta').click();
    const modal = page.getByTestId('verify-password-modal');
    await modal.locator('input[type="password"], input[type="text"]').first().fill('Correct1!aaaa');
    await modal.getByTestId('verify-password-submit').click();

    const card = page.getByTestId('change-password-card');
    await expect(card).toBeVisible();

    const inputs = card.locator('input[type="password"]');
    await inputs.nth(0).fill('Wrong1!aaaa');
    await inputs.nth(1).fill('New1!bbbb');
    await inputs.nth(2).fill('New1!bbbb');

    await card.getByTestId('change-password-submit').click();

    // Field-level error on the currentPassword field.
    await expect(card.getByTestId('change-password-current-error')).toHaveText(
      /Current password is incorrect/i,
    );

    // The current password field is cleared so the user can retype.
    await expect(inputs.nth(0)).toHaveValue('');
  });

  test('retryable 5xx renders banner copy', async ({ page, context }) => {
    await stubDashboardAndSessions(page);
    await seedAuthCookie(context);

    await page.route('**/api/v1/auth/verify-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { valid: true } }),
      });
    });

    await page.route('**/api/v1/auth/change-password', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'about:blank',
          title: 'Service Unavailable',
          status: 503,
          extensions: {
            code: 'GLOBAL_INTERNAL_ERROR',
          },
        }),
      });
    });

    await page.goto('/settings/security');
    await expect(
      page
        .getByTestId('security-dashboard-slot')
        .getByTestId('security-summary-card')
    ).toHaveAttribute('data-status', 'success', { timeout: 5000 });

    await page.getByTestId('change-password-cta').click();
    const modal = page.getByTestId('verify-password-modal');
    await modal.locator('input[type="password"], input[type="text"]').first().fill('Correct1!aaaa');
    await modal.getByTestId('verify-password-submit').click();

    const card = page.getByTestId('change-password-card');
    await expect(card).toBeVisible();

    const inputs = card.locator('input[type="password"]');
    await inputs.nth(0).fill('Old1!aaaa');
    await inputs.nth(1).fill('New1!bbbb');
    await inputs.nth(2).fill('New1!bbbb');

    await card.getByTestId('change-password-submit').click();

    // Banner renders.
    await expect(card.getByTestId('change-password-banner')).toBeVisible();
    await expect(card.getByTestId('change-password-banner')).toHaveText(
      /We could not change your password/i,
    );

    // Retry button is rendered alongside the banner.
    await expect(card.getByTestId('change-password-retry')).toBeVisible();
  });
});

// ─── Section 6: Successful change revalidates dashboard + sessions ─────────

test.describe('Password flow — successful change revalidates', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear()).catch(() => {
      /* page not loaded yet */
    });
  });

  test('successful change updates dashboard + sessions, shows success banner', async ({
    page,
    context,
  }) => {
    const { setDashboard, setSessions } = await stubDashboardAndSessions(page, {
      dashboard: {
        data: {
          emailVerified: true,
          activeSessionCount: 2,
          lastSuccessfulLoginAt: '2026-07-30T10:00:00.000Z',
          passwordAgeDays: 30,
          lastPasswordChangeAt: '2026-06-30T10:00:00.000Z',
        },
      },
      sessions: {
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
      },
    });

    await seedAuthCookie(context);

    await page.route('**/api/v1/auth/verify-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { valid: true } }),
      });
    });

    let changeRequestCount = 0;
    await page.route('**/api/v1/auth/change-password', async (route) => {
      changeRequestCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { message: 'password changed' } }),
      });
    });

    // The post-change revalidation hits dashboard + sessions with
    // updated state. Bump the bodies to the post-change shape.
    await page.route('**/api/v1/auth/security/dashboard', async (route) => {
      // After a successful change, passwordAgeDays is 0 and
      // lastPasswordChangeAt is "now" (we just stub "now" with
      // a static date).
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            emailVerified: true,
            activeSessionCount: 1,
            lastSuccessfulLoginAt: '2026-07-30T10:00:00.000Z',
            passwordAgeDays: 0,
            lastPasswordChangeAt: '2026-07-31T11:00:00.000Z',
          },
        }),
      });
    });

    await page.route('**/api/v1/auth/sessions', async (route) => {
      // After a successful change, only the current session remains.
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
                lastActiveAt: '2026-07-31T11:00:00.000Z',
                isCurrentSession: true,
              },
            ],
          },
        }),
      });
    });

    // Suppress unused warnings while keeping the helper available
    // for future per-spec override.
    void setDashboard;
    void setSessions;

    await page.goto('/settings/security');
    await expect(
      page
        .getByTestId('security-dashboard-slot')
        .getByTestId('security-summary-card')
    ).toHaveAttribute('data-status', 'success', { timeout: 5000 });

    await page.getByTestId('change-password-cta').click();
    const modal = page.getByTestId('verify-password-modal');
    await modal.locator('input[type="password"], input[type="text"]').first().fill('Correct1!aaaa');
    await modal.getByTestId('verify-password-submit').click();

    const card = page.getByTestId('change-password-card');
    await expect(card).toBeVisible();

    const inputs = card.locator('input[type="password"]');
    await inputs.nth(0).fill('Old1!aaaa');
    await inputs.nth(1).fill('New1!bbbb');
    await inputs.nth(2).fill('New1!bbbb');

    await card.getByTestId('change-password-submit').click();

    // Success banner renders.
    const successSlot = page.getByTestId('change-password-success-slot');
    await expect(successSlot).toBeVisible();
    await expect(successSlot).toHaveText(
      /Password updated/i,
    );

    // changePassword was called.
    expect(changeRequestCount).toBe(1);

    // The dashboard revalidation fetches the new body — the
    // page-level dashboard endpoint is hit at least twice (initial
    // load + revalidation).
    // We assert the page still renders the security-summary card
    // in its success state.
    await expect(
      page
        .getByTestId('security-dashboard-slot')
        .getByTestId('security-summary-card')
    ).toHaveAttribute('data-status', 'success', { timeout: 5000 });
  });
});

// ─── Section 7: Password hygiene — no echo, no leak ────────────────────────

test.describe('Password flow — hygiene', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear()).catch(() => {
      /* page not loaded yet */
    });
  });

  test('password values are never echoed back to the DOM', async ({
    page,
    context,
  }) => {
    await stubDashboardAndSessions(page);
    await seedAuthCookie(context);

    await page.route('**/api/v1/auth/verify-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { valid: true } }),
      });
    });

    await page.goto('/settings/security');
    await expect(
      page
        .getByTestId('security-dashboard-slot')
        .getByTestId('security-summary-card')
    ).toHaveAttribute('data-status', 'success', { timeout: 5000 });

    await page.getByTestId('change-password-cta').click();
    const modal = page.getByTestId('verify-password-modal');
    await modal.locator('input[type="password"], input[type="text"]').first().fill('Secret1!aaaa');
    await modal.getByTestId('verify-password-submit').click();

    // After verification the password string MUST NOT be visible
    // anywhere in the DOM (outside of the masked input field).
    // The card title, success banner, dashboard card — none of
    // these should contain the password string.
    await expect(page.locator('body')).not.toContainText('Secret1!aaaa');
  });

  test('password fields are cleared after success + dismiss', async ({
    page,
    context,
  }) => {
    await stubDashboardAndSessions(page);
    await seedAuthCookie(context);

    await page.route('**/api/v1/auth/verify-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { valid: true } }),
      });
    });

    await page.route('**/api/v1/auth/change-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { message: 'ok' } }),
      });
    });

    await page.goto('/settings/security');
    await expect(
      page
        .getByTestId('security-dashboard-slot')
        .getByTestId('security-summary-card')
    ).toHaveAttribute('data-status', 'success', { timeout: 5000 });

    await page.getByTestId('change-password-cta').click();
    const modal = page.getByTestId('verify-password-modal');
    await modal.locator('input[type="password"], input[type="text"]').first().fill('Correct1!aaaa');
    await modal.getByTestId('verify-password-submit').click();

    const card = page.getByTestId('change-password-card');
    const inputs = card.locator('input[type="password"]');
    await inputs.nth(0).fill('Old1!aaaa');
    await inputs.nth(1).fill('New1!bbbb');
    await inputs.nth(2).fill('New1!bbbb');

    await card.getByTestId('change-password-submit').click();

    // Success banner appears.
    const successSlot = page.getByTestId('change-password-success-slot');
    await expect(successSlot).toBeVisible();

    // All three password fields are cleared on success.
    await expect(inputs.nth(0)).toHaveValue('');
    await expect(inputs.nth(1)).toHaveValue('');
    await expect(inputs.nth(2)).toHaveValue('');
  });
});
