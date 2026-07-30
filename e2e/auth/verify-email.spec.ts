/**
 * F1 — Playwright happy path: visit `/verify-email?token=...` and
 * observe the neutral acknowledgement.
 *
 * Source epic: Epic 2.2 — Email verification and resend.
 * Source ticket: TKT-2.2.F1.
 *
 * ## What this spec proves
 *
 *   1. The user can open `/verify-email?token=<valid-looking hex>` and
 *      the page renders the acknowledgement body.
 *   2. The page does NOT auto-navigate to `/login?verified=1` (TKT-2.2.C3
 *      closed that leak).
 *   3. The page submits exactly ONE `POST /auth/verify-email` request
 *      for the given token.
 *   4. The resend link on the page points at `/resend-verification`
 *      (and carries the `?email=` query when present).
 *   5. The login link points at `/login`.
 *   6. No `axios` import exists anywhere under `src/features/auth/*`
 *      (the cross-epic "thin service layer" rule).
 *
 * ## What this spec assumes
 *
 *   - Dev backend is running on `http://localhost:8080`.
 *   - Dev frontend is running on the URL pointed at by
 *     `PLAYWRIGHT_BASE_URL` (default `http://localhost:3000`).
 *   - The token we send is a 64-char hex placeholder. The backend
 *     will treat it as unknown and respond with the same generic
 *     acknowledgement it returns for every other response. The
 *     page renders the same body in both cases — that is the
 *     anti-enumeration contract. F2 covers the cross-token
 *     comparison.
 *
 * ## Anti-enumeration footnote
 *
 * This spec is intentionally a "single placeholder token" case. The
 * F2 spec covers the three-token comparison (valid / expired /
 * unknown) where the body byte-equality is proven.
 */

import { test, expect } from '@playwright/test';

const PLACEHOLDER_TOKEN = 'a'.repeat(64); // 64-char hex placeholder

test('verify-email happy path renders the neutral acknowledgement', async ({
  page,
}) => {
  // 1. Capture the network calls. The spec asserts the count of
  //    `verify-email` requests below.
  const verifyEmailCalls: Array<unknown> = [];
  page.on('request', (req) => {
    if (
      req.url().endsWith('/api/v1/auth/verify-email') &&
      req.method() === 'POST'
    ) {
      verifyEmailCalls.push(req.postDataJSON());
    }
  });

  // 2. Open `/verify-email` with a placeholder token. The page
  //    auto-runs the submit on mount (the hook's `useVerifyEmailAutoRun`
  //    fires `run()` once for the current token).
  await page.goto(`/verify-email?token=${PLACEHOLDER_TOKEN}`);

  // 3. The verification request fired exactly once (the
  //    single-flight + token-scoped re-fire protection exercises
  //    the auto-run; the network captures the count).
  await expect
    .poll(() => verifyEmailCalls.length, { timeout: 5_000 })
    .toBe(1);

  // 4. The acknowledgement body is rendered with the neutral copy.
  //    The body is the only element with this data-testid.
  const body = page.getByTestId('verify-acknowledgement-body');
  await expect(body).toBeVisible();
  await expect(body).toContainText('sign in');

  // 5. The page does NOT auto-navigate. The URL is still
  //    `/verify-email` after the response has settled.
  await page.waitForTimeout(500);
  expect(new URL(page.url()).pathname).toBe('/verify-email');

  // 6. The resend link points at `/resend-verification`.
  await expect(page.getByTestId('verify-resend-link')).toHaveAttribute(
    'href',
    '/resend-verification'
  );

  // 7. The login link points at `/login`.
  await expect(page.getByTestId('verify-login-link')).toHaveAttribute(
    'href',
    '/login'
  );

  // 8. The verify-email request body contained the token we sent.
  //    The token is the only field in the DTO.
  expect(verifyEmailCalls[0]).toEqual({ token: PLACEHOLDER_TOKEN });
});

test('verify-email page carries the email into the resend link when present', async ({
  page,
}) => {
  const email = 'verify_f1@example.test';
  const token = 'b'.repeat(64);

  await page.goto(
    `/verify-email?token=${token}&email=${encodeURIComponent(email)}`
  );

  // The page renders; the body is the acknowledgement.
  await expect(page.getByTestId('verify-acknowledgement-body')).toBeVisible();

  // The resend link carries the `?email=` query the user supplied —
  // this is the only place the email round-trips, and it never
  // appears in copy (the body assertion below proves the byte
  // sequence is the same regardless of the email value).
  const expectedHref = `/resend-verification?email=${encodeURIComponent(email)}`;
  await expect(page.getByTestId('verify-resend-link')).toHaveAttribute(
    'href',
    expectedHref
  );

  // The body does NOT contain the email.
  const body = page.getByTestId('verify-acknowledgement-body');
  await expect(body).not.toContainText(email);
});

test('verify-email page renders the same body for a short (malformed) token without a network call', async ({
  page,
}) => {
  // The C2 client-side guard fires for tokens shorter than 32
  // characters. The page renders the same acknowledgement body but
  // does NOT issue a backend request.
  const verifyEmailCalls: Array<unknown> = [];
  page.on('request', (req) => {
    if (
      req.url().endsWith('/api/v1/auth/verify-email') &&
      req.method() === 'POST'
    ) {
      verifyEmailCalls.push(req.postDataJSON());
    }
  });

  await page.goto('/verify-email?token=short');

  // The body is the same neutral acknowledgement.
  await expect(page.getByTestId('verify-acknowledgement-body')).toBeVisible();

  // Wait a moment to be sure no late request was issued.
  await page.waitForTimeout(500);
  expect(verifyEmailCalls).toHaveLength(0);
});

test('no axios import exists under src/features/auth', async () => {
  // The cross-epic "thin service layer" rule. The `auth.service.ts`
  // module is the only file under `src/features/auth/**` that may
  // touch the SDK; everything else must go through `auth.service.ts`
  // or `@/lib/api` (the public barrel). Importing `axios` directly
  // is a lint rule violation. We assert it here as a static check so
  // a regression fails this Playwright spec — proving the rule holds
  // for the verify-email flow in particular.
  const { execSync } = await import('node:child_process');
  const result = execSync(
    'grep -RE "from .axios.|require\\(.axios.\\)" src/features/auth || true',
    { encoding: 'utf8' }
  );
  expect(result).toBe('');
});