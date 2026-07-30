/**
 * E2 (reset-password anti-enumeration) — Playwright: the invalid-link
 * body is byte-identical for unknown, expired, and consumed tokens;
 * the form is rendered for a valid-looking token.
 *
 * Source epic: Epic 2.3 — Forgot-password and reset-password recovery.
 * Source ticket: TKT-2.3.E2.
 *
 * ## What this spec proves
 *
 *   1. The invalid-link body at `/reset-password?token=...` is
 *      byte-identical for an unknown token, an expired token, and a
 *      consumed token — the three states the backend collapses into
 *      `AUTH_INVALID_TOKEN`.
 *   2. A valid-looking token renders the form (not the invalid-link
 *      body). The form presence is structural — the spec asserts
 *      the form is visible, NOT that the request succeeds.
 *   3. The invalid-link body NEVER contains the user-supplied token.
 *
 * ## What this spec assumes
 *
 *   - The dev backend's `/auth/reset-password` endpoint returns
 *     `400` with code `AUTH_INVALID_TOKEN` for unknown, expired,
 *     and consumed tokens. The frontend's mapper (TKT-2.3.B2)
 *     collapses all three into the `'invalid_link'` kind so the
 *     page renders one neutral body for every backend response.
 *   - The three tokens used here are arbitrary 64-char hex
 *     strings. They are NOT real tokens — the backend will treat
 *     them as unknown for all three cases. The point is byte
 *     equality of the rendered body, not the backend's diff.
 *   - For the byte-equality assertion, the invalid-link body is
 *     rendered without a network call when the token is malformed
 *     (C2 client-side guard short-circuits). For the unknown /
 *     expired / consumed cases, the spec routes the
 *     `reset-password` request to a deterministic 400 stub so the
 *     test is fast and CI-friendly.
 *
 * If E2 is failing on byte equality, the front-end mapper or copy
 * registry is the bug — never the backend.
 */

import { test, expect, type Route } from '@playwright/test';

const TOKEN_VALID = 'a'.repeat(64); // well-formed 64-char hex
const TOKEN_UNKNOWN = 'b'.repeat(64); // well-formed but unknown
const TOKEN_EXPIRED = 'c'.repeat(64); // well-formed but expired
const TOKEN_CONSUMED = 'd'.repeat(64); // well-formed but consumed
const TOKEN_SHORT = 'short'; // < 32 chars; client-side guard fires

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

const RESET_URL = /\/api\/v1\/auth\/reset-password$/;

const forceAuthInvalidToken = (route: Route) =>
  route.fulfill({
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify(
      apiErrorBody(400, 'AUTH_INVALID_TOKEN', '/api/v1/auth/reset-password')
    ),
  });

const captureInvalidBody = async (
  page: import('@playwright/test').Page,
  token: string
): Promise<string> => {
  await page.goto(`/reset-password?token=${token}`);
  const body = page.getByTestId('reset-invalid-body');
  await expect(body).toBeVisible({ timeout: 10_000 });
  const text = await body.textContent();
  if (text === null) {
    throw new Error(`Invalid body for token …${token.slice(-6)} was null`);
  }
  return text;
};

test('reset-password renders the form for a valid-looking token', async ({
  page,
}) => {
  // Route reset-password to a 201 stub so the page does not block
  // waiting on a real token. We only assert the form is visible —
  // the success path is covered in `reset-password.spec.ts`.
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

  await page.goto(`/reset-password?token=${TOKEN_VALID}`);
  // The form is rendered (not the invalid-link body).
  await expect(page.getByTestId('reset-form')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId('reset-invalid-body')).toHaveCount(0);
});

test('reset-password renders the same invalid-link body for unknown / expired / consumed tokens', async ({
  page,
}) => {
  // Force every reset-password call to a 400 AUTH_INVALID_TOKEN
  // stub. The backend uses the same code for unknown, expired, and
  // consumed tokens; the mapper collapses all three into
  // `'invalid_link'`.
  await page.route(RESET_URL, forceAuthInvalidToken);

  // We do NOT submit the form — the C2 client-side guard validates
  // the token, the page renders the invalid-link body without
  // submitting, AND if we did submit the stubbed 400 would render
  // the same body. The mapper is exercised by both paths; the body
  // must be identical regardless of which path triggered the
  // invalid-link state.
  //
  // To exercise the mapper path explicitly (i.e. the network call
  // fires and the 400 is mapped to `'invalid_link'`), we submit
  // the form on each token. The mapper collapses the 400 into
  // `'invalid_link'`, the page renders the same body.
  const captureViaSubmit = async (token: string): Promise<string> => {
    await page.goto(`/reset-password?token=${token}`);
    // First, the C2 client-side guard renders the invalid-link body
    // immediately because the page evaluates the token on mount.
    // To exercise the submit path we unblock the form by removing
    // the invalid-link block. The submit will hit the stub and
    // collapse into the same body.
    //
    // Simpler: we trust the C2 short-circuit. The body for the
    // unknown/expired/consumed tokens is identical because the
    // mapper collapses all three; we capture once via submit so
    // the mapper is actually exercised, and the other two via the
    // short-circuit (same body, same registry, same literal).
    await page
      .getByTestId('reset-form')
      .locator('input[type="password"]')
      .first()
      .fill('GoodPass1!');
    await page
      .getByTestId('reset-form')
      .locator('input[type="password"]')
      .nth(1)
      .fill('GoodPass1!');
    await page.getByTestId('reset-submit').click();

    // After the 400 maps to 'invalid_link', the same body renders.
    // We re-target the assertion so the test catches either the
    // pre-submit short-circuit body or the post-submit
    // mapper-collapsed body.
    const body = page.getByTestId('reset-invalid-body');
    await expect(body).toBeVisible({ timeout: 10_000 });
    const text = await body.textContent();
    if (text === null) {
      throw new Error(`Body for token …${token.slice(-6)} was null`);
    }
    return text;
  };

  const bodyUnknown = await captureViaSubmit(TOKEN_UNKNOWN);
  const bodyExpired = await captureViaSubmit(TOKEN_EXPIRED);
  const bodyConsumed = await captureViaSubmit(TOKEN_CONSUMED);

  // Byte-identical across the three backend states.
  expect(bodyUnknown).toBe(bodyExpired);
  expect(bodyExpired).toBe(bodyConsumed);
});

test('reset-password renders the invalid-link body for a missing or malformed token without a network call', async ({
  page,
}) => {
  // The C2 client-side guard fires for tokens shorter than 32
  // characters. The page renders the same invalid-link body but
  // does NOT issue a backend request.
  const resetCalls: Array<unknown> = [];
  page.on('request', (req) => {
    if (
      req.url().endsWith('/api/v1/auth/reset-password') &&
      req.method() === 'POST'
    ) {
      resetCalls.push(req.postDataJSON());
    }
  });

  await page.goto(`/reset-password?token=${TOKEN_SHORT}`);

  // The body is the same invalid-link body.
  await expect(page.getByTestId('reset-invalid-body')).toBeVisible();

  // Wait a moment to be sure no late request was issued.
  await page.waitForTimeout(500);
  expect(resetCalls).toHaveLength(0);
});

test('reset-password body never contains the user-supplied token', async ({
  page,
}) => {
  await page.route(RESET_URL, forceAuthInvalidToken);
  const body = await captureInvalidBody(page, TOKEN_UNKNOWN);
  expect(body).not.toContain(TOKEN_UNKNOWN);
  expect(body).not.toContain(TOKEN_UNKNOWN.slice(0, 16));
});