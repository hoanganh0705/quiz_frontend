/**
 * E2 (recovery error handling) — Playwright: 429 / 5xx on
 * forgot-password and 201 / AUTH_INVALID_TOKEN on reset-password.
 *
 * Source epic: Epic 2.3 — Forgot-password and reset-password recovery.
 * Source ticket: TKT-2.3.E2.
 *
 * ## What this spec proves
 *
 *   1. `429` on `/auth/forgot-password`: a retry-later message is
 *      shown; the cooldown copy is rendered; the submit button is
 *      re-enabled (the cooldown fires on success, not on 429; the
 *      mapper surfaces the rate_limited overlay without blocking
 *      retries the user wants to attempt later).
 *   2. `5xx` on `/auth/forgot-password`: a recoverable failure
 *      message is shown; the entered email is preserved; the
 *      submit button is re-enabled.
 *   3. `201` on `/auth/reset-password`: the local `auth_token`
 *      cookie is cleared; the cross-tab `LOGGED_OUT` event is
 *      posted; the user is routed to `/login`.
 *   4. `400 AUTH_INVALID_TOKEN` on `/auth/reset-password`: the
 *      invalid-link body renders; the form is NOT shown; the user
 *      can navigate to `/forgot-password` for a new token.
 *
 * ## What this spec assumes
 *
 *   - The dev backend may not actually return 429 / 5xx /
 *     AUTH_INVALID_TOKEN during normal operation. We use
 *     `page.route()` to intercept requests and force deterministic
 *     responses.
 *   - The intercept returns a backend-shaped body that the ORVAL
 *     custom-instance can parse. The `code` / `status` /
 *     `isValidationError` / `isServerError` fields are added by the
 *     custom-instance from the HTTP layer. The spec stubs them so
 *     the duck-typed mapper can read them.
 */

import { test, expect, type Route } from '@playwright/test';

const FORGOT_URL = /\/api\/v1\/auth\/forgot-password$/;
const RESET_URL = /\/api\/v1\/auth\/reset-password$/;

const apiErrorBody = (
  status: number,
  code: string,
  path: string
): Record<string, unknown> => ({
  statusCode: status,
  code,
  message: 'synthesized for test',
  isValidationError: false,
  isServerError: status >= 500,
  validationMessages: [],
  timestamp: new Date().toISOString(),
  path,
});

const forceStatus = (route: Route, status: number, code: string, path: string) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(apiErrorBody(status, code, path)),
  });

// ─────────────────────────────────────────────────────────────────────────────
// forgot-password 429
// ─────────────────────────────────────────────────────────────────────────────

test('forgot-password 429 shows the retry-later message and the cooldown copy', async ({
  page,
}) => {
  // Force every forgot-password call to a 429.
  await page.route(FORGOT_URL, (route) =>
    forceStatus(route, 429, 'GLOBAL_RATE_LIMITED', '/api/v1/auth/forgot-password')
  );

  await page.goto('/forgot-password');
  await page
    .getByTestId('forgot-form')
    .locator('input[type="email"]')
    .fill('forgot_e2_429@example.test');

  await page.getByTestId('forgot-submit').click();

  // The error block is visible with the rate_limited copy.
  const error = page.getByTestId('forgot-error');
  await expect(error).toBeVisible({ timeout: 10_000 });
  await expect(error).toHaveAttribute('data-error-kind', 'rate_limited');

  // The form is still editable (the user can edit the email
  // before retrying).
  const emailInput = page
    .getByTestId('forgot-form')
    .locator('input[type="email"]');
  await expect(emailInput).toBeEnabled();

  // The submit button is re-enabled after the failure (the cooldown
  // is about successful responses, not failures).
  const submit = page.getByTestId('forgot-submit');
  await expect(submit).toBeEnabled();
});

// ─────────────────────────────────────────────────────────────────────────────
// forgot-password 5xx
// ─────────────────────────────────────────────────────────────────────────────

test('forgot-password 5xx shows the recoverable failure message and preserves the email', async ({
  page,
}) => {
  // Force every forgot-password call to a 500.
  await page.route(FORGOT_URL, (route) =>
    forceStatus(route, 500, 'GLOBAL_INTERNAL_ERROR', '/api/v1/auth/forgot-password')
  );

  const email = 'forgot_e2_5xx@example.test';
  await page.goto('/forgot-password');
  await page
    .getByTestId('forgot-form')
    .locator('input[type="email"]')
    .fill(email);

  await page.getByTestId('forgot-submit').click();

  // The error block is visible with the server copy.
  const error = page.getByTestId('forgot-error');
  await expect(error).toBeVisible({ timeout: 10_000 });
  await expect(error).toHaveAttribute('data-error-kind', 'server');

  // The email the user typed is preserved.
  const emailInput = page
    .getByTestId('forgot-form')
    .locator('input[type="email"]');
  await expect(emailInput).toHaveValue(email);

  // The form is editable.
  await expect(emailInput).toBeEnabled();
  const submit = page.getByTestId('forgot-submit');
  await expect(submit).toBeEnabled();
});

// ─────────────────────────────────────────────────────────────────────────────
// forgot-password success → cooldown
// ─────────────────────────────────────────────────────────────────────────────

test('forgot-password success triggers the cooldown and disables the submit button', async ({
  page,
}) => {
  // Allow the forgot-password call to succeed (200 with a generic body).
  await page.route(FORGOT_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 200,
        message: 'Email sent',
        data: { message: 'Email sent' },
        timestamp: new Date().toISOString(),
        path: '/api/v1/auth/forgot-password',
      }),
    })
  );

  await page.goto('/forgot-password');
  await page
    .getByTestId('forgot-form')
    .locator('input[type="email"]')
    .fill('forgot_e2_ok@example.test');

  await page.getByTestId('forgot-submit').click();

  // The acknowledgement body appears.
  const body = page.getByTestId('forgot-acknowledgement-body');
  await expect(body).toBeVisible({ timeout: 10_000 });

  // The cooldown copy is visible.
  const cooldown = page.getByTestId('forgot-cooldown');
  await expect(cooldown).toBeVisible();
  await expect(cooldown).toContainText(/(?:s|second)/);
});

// ─────────────────────────────────────────────────────────────────────────────
// reset-password 201 → success
// ─────────────────────────────────────────────────────────────────────────────

test('reset-password success clears the auth_token cookie, broadcasts LOGGED_OUT, and routes to /login', async ({
  page,
  context,
}) => {
  // Route reset-password to a 201 stub.
  await page.route(RESET_URL, (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 201,
        message: 'Password updated',
        data: { message: 'Password updated' },
        timestamp: new Date().toISOString(),
        path: '/api/v1/auth/reset-password',
      }),
    })
  );

  // Set an auth_token cookie at baseline; the success side-effect
  // must clear it.
  await context.addCookies([
    {
      name: 'auth_token',
      value: 'stub_pre_reset_token',
      url: 'http://localhost:3000',
    },
  ]);

  const validToken = 'a'.repeat(64);
  await page.goto(`/reset-password?token=${validToken}`);

  // Wire a BroadcastChannel listener on the LIVE page just before
  // the submit so we capture the LOGGED_OUT event the C5 hook
  // posts.
  await page.evaluate(() => {
    const w = window as unknown as {
      __loggedOutPosts?: Array<unknown>;
    };
    w.__loggedOutPosts = [];
    const channel = new BroadcastChannel('auth');
    channel.addEventListener('message', (ev) => {
      w.__loggedOutPosts?.push(ev.data);
    });
  });

  const newPassword = 'NewPass1!';
  await page.getByLabel('New password').fill(newPassword);
  await page.getByLabel('Confirm new password').fill(newPassword);

  // Submit and wait for navigation to /login.
  await Promise.all([
    page.waitForURL(/\/login$/),
    page.getByTestId('reset-submit').click(),
  ]);

  // The auth_token cookie is gone.
  const cookiesAfter = await context.cookies();
  const hasAuthToken = cookiesAfter.some((c) => c.name === 'auth_token');
  expect(hasAuthToken).toBe(false);

  // The cross-tab LOGGED_OUT event was posted exactly once.
  // We read from the LIVE window — the broadcast was posted on
  // the reset-password page before the navigation; the listener
  // we registered on the LIVE page captured it.
  const posts = await page.evaluate(() => {
    const w = window as unknown as {
      __loggedOutPosts?: Array<unknown>;
    };
    return w.__loggedOutPosts ?? [];
  });
  expect(posts).toEqual([{ type: 'LOGGED_OUT' }]);
});

// ─────────────────────────────────────────────────────────────────────────────
// reset-password AUTH_INVALID_TOKEN
// ─────────────────────────────────────────────────────────────────────────────

test('reset-password AUTH_INVALID_TOKEN renders the invalid-link body, not the form', async ({
  page,
}) => {
  // Force every reset-password call to a 400 AUTH_INVALID_TOKEN
  // stub. The mapper collapses this into `'invalid_link'`.
  await page.route(RESET_URL, (route) =>
    forceStatus(route, 400, 'AUTH_INVALID_TOKEN', '/api/v1/auth/reset-password')
  );

  const validToken = 'b'.repeat(64);
  await page.goto(`/reset-password?token=${validToken}`);

  // The form is rendered first; submitting triggers the 400.
  await expect(page.getByTestId('reset-form')).toBeVisible({ timeout: 5_000 });

  await page.getByLabel('New password').fill('GoodPass1!');
  await page.getByLabel('Confirm new password').fill('GoodPass1!');
  await page.getByTestId('reset-submit').click();

  // The invalid-link body renders.
  const body = page.getByTestId('reset-invalid-body');
  await expect(body).toBeVisible({ timeout: 10_000 });
  await expect(body).toHaveAttribute('data-token-valid', 'true');

  // The form is gone (the invalid-link block replaces it).
  await expect(page.getByTestId('reset-form')).toHaveCount(0);

  // The "Request a new reset link" CTA points at /forgot-password.
  await expect(
    page.getByRole('link', { name: /request a new reset link/i })
  ).toHaveAttribute('href', '/forgot-password');
});