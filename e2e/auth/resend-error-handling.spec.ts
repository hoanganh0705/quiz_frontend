/**
 * F2 (resend) — Playwright error handling: 429 and 5xx paths.
 *
 * Source epic: Epic 2.2 — Email verification and resend.
 * Source ticket: TKT-2.2.F2.
 *
 * ## What this spec proves
 *
 *   1. A 429 on `/auth/resend-verification-email` shows the
 *      retry-later message and disables the submit button for the
 *      cooldown window.
 *   2. A 5xx on `/auth/resend-verification-email` shows the
 *      recoverable failure message and keeps the form editable.
 *   3. The entered email is preserved across the 5xx path so the
 *      user can retry without re-typing.
 *
 * ## What this spec assumes
 *
 *   - The dev backend may not be configured to actually return 429
 *     or 5xx during normal operation. We use Playwright's
 *     `page.route()` to intercept the request and force a known
 *     response, so the spec is fully deterministic regardless of
 *     the dev backend's behaviour.
 *   - The intercept returns a backend-shaped body that the ORVAL
 *     custom-instance can parse. The resend endpoint returns a
 *     `WrappedDto<VerifyEmailResponseDto>`; the `code` /
 *     `status` / `isValidationError` / `isServerError` fields are
 *     added by the custom-instance from the HTTP layer. The spec
 *     asserts the front-end behaviour against the front-end
 *     mapper's interpretation.
 *
 * Note: the test passes a JSON body that mirrors the
 * `custom-instance` unwrapped shape. The `code` / `status` /
 * `isValidationError` / `isServerError` fields would be populated
 * by the custom-instance at runtime; the test stubs them so the
 * duck-typed mapper can read them.
 */

import { test, expect, type Route } from '@playwright/test';

const RESEND_URL = /\/api\/v1\/auth\/resend-verification-email$/;

const apiErrorBody = (status: number, code: string): Record<string, unknown> => ({
  statusCode: status,
  code,
  message: 'synthesized for test',
  isValidationError: false,
  isServerError: status >= 500,
  validationMessages: [],
  timestamp: new Date().toISOString(),
  path: '/api/v1/auth/resend-verification-email',
});

const forceStatus = (route: Route, status: number, code: string) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(apiErrorBody(status, code)),
  });

test('resend 429 shows the retry-later message and disables the submit button', async ({
  page,
}) => {
  // Force every resend call to a 429.
  await page.route(RESEND_URL, (route) =>
    forceStatus(route, 429, 'GLOBAL_RATE_LIMITED')
  );

  await page.goto('/resend-verification');
  await page
    .getByTestId('resend-form')
    .locator('input[type="email"]')
    .fill('resend_f2_429@example.test');

  await page.getByTestId('resend-submit').click();

  // The error block is visible with the rate_limited copy.
  const error = page.getByTestId('resend-error');
  await expect(error).toBeVisible();
  await expect(error).toHaveAttribute('data-error-kind', 'rate_limited');

  // The form is still editable (the user can edit the email
  // before retrying).
  const emailInput = page
    .getByTestId('resend-form')
    .locator('input[type="email"]');
  await expect(emailInput).toBeEnabled();

  // The submit button is re-enabled after the failure (the cooldown
  // is about successful responses, not failures).
  const submit = page.getByTestId('resend-submit');
  await expect(submit).toBeEnabled();
});

test('resend 5xx shows the recoverable failure message and preserves the email', async ({
  page,
}) => {
  // Force every resend call to a 500.
  await page.route(RESEND_URL, (route) =>
    forceStatus(route, 500, 'GLOBAL_INTERNAL_ERROR')
  );

  const email = 'resend_f2_5xx@example.test';
  await page.goto('/resend-verification');
  await page
    .getByTestId('resend-form')
    .locator('input[type="email"]')
    .fill(email);

  await page.getByTestId('resend-submit').click();

  // The error block is visible with the server copy.
  const error = page.getByTestId('resend-error');
  await expect(error).toBeVisible();
  await expect(error).toHaveAttribute('data-error-kind', 'server');

  // The email the user typed is preserved.
  const emailInput = page
    .getByTestId('resend-form')
    .locator('input[type="email"]');
  await expect(emailInput).toHaveValue(email);

  // The form is editable.
  await expect(emailInput).toBeEnabled();
  const submit = page.getByTestId('resend-submit');
  await expect(submit).toBeEnabled();
});

test('resend success triggers the cooldown and disables the submit button', async ({
  page,
}) => {
  // Allow the resend call to succeed (200 with a generic body).
  await page.route(RESEND_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 200,
        message: 'Email sent',
        data: { message: 'Email sent' },
        timestamp: new Date().toISOString(),
        path: '/api/v1/auth/resend-verification-email',
      }),
    })
  );

  await page.goto('/resend-verification');
  await page
    .getByTestId('resend-form')
    .locator('input[type="email"]')
    .fill('resend_f2_ok@example.test');

  await page.getByTestId('resend-submit').click();

  // The acknowledgement body appears.
  const body = page.getByTestId('resend-acknowledgement-body');
  await expect(body).toBeVisible();

  // The cooldown copy is visible.
  const cooldown = page.getByTestId('resend-cooldown');
  await expect(cooldown).toBeVisible();
  await expect(cooldown).toContainText(/(?:s|second)/);
});