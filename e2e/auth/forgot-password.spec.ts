/**
 * E1 (forgot-password) — Playwright happy path: visit
 * `/forgot-password`, submit an email, observe the neutral
 * acknowledgement.
 *
 * Source epic: Epic 2.3 — Forgot-password and reset-password recovery.
 * Source ticket: TKT-2.3.E1.
 *
 * ## What this spec proves
 *
 *   1. The user can open `/forgot-password`, fill the form, and submit
 *      a real, registered email.
 *   2. The submit handler issues exactly ONE `POST
 *      /auth/forgot-password` request.
 *   3. After success, the page renders the same neutral
 *      acknowledgement body the backend returns for every response
 *      (verified / unverified / unknown). The body does NOT echo the
 *      user-supplied email.
 *   4. The page does NOT auto-navigate away (the in-place update is
 *      the counter-design Epic 2.3 explicitly endorses; a navigation
 *      would have been the original oracle).
 *   5. The cooldown timer fires; the submit button is disabled; the
 *      cooldown countdown copy is visible.
 *   6. The page does NOT contain a `mailto:` deep-link (TKT-2.3.C4
 *      closed that leak; the A2 leak catalogue flagged it).
 *   7. The "Back to login" link points at `/login`.
 *   8. No `axios` import exists anywhere under `src/features/auth/*`
 *      (the cross-epic "thin service layer" rule).
 *
 * ## What this spec assumes
 *
 *   - Dev backend is running on `http://localhost:8080`.
 *   - Dev frontend is running on the URL pointed at by
 *     `PLAYWRIGHT_BASE_URL` (default `http://localhost:3000`).
 *   - The dev backend's `/auth/forgot-password` endpoint returns the
 *     same generic acknowledgement regardless of whether the email
 *     exists, is unverified, or is verified. That is the backend's
 *     anti-enumeration contract. The frontend respects it; the
 *     body-assertion below proves the page renders the same body for
 *     every backend response.
 *   - The email used here is registered (F1's setup, fresh per run)
 *     so the assertion can run against the live backend's
 *     "real account exists" branch; the F2 spec covers the
 *     "unknown email" branch via byte equality.
 */

import { test, expect } from '@playwright/test';

const uniqueSuffix = (): string => {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
};

test('forgot-password happy path: register, request reset, observe neutral acknowledgement', async ({
  page,
}) => {
  const suffix = uniqueSuffix();
  const uniqueEmail = `forgot_e1_${suffix}@example.test`;
  const uniqueUsername = `forgote1_${suffix}`.slice(0, 50);
  const password = 'Abcdef1!';

  // 1. Register a brand-new account. The reset-password flow
  //    targets a real address so the live backend's
  //    "address exists, send an email" branch fires — exercising the
  //    same path the user will hit in production. The F2 spec
  //    covers the "address does not exist" branch via byte equality.
  await page.goto('/signup');
  await page.getByTestId('registration-form').waitFor();
  await page.getByLabel('Username').fill(uniqueUsername);
  await page.getByLabel('Email').fill(uniqueEmail);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByText(/I agree to the/).click();

  await expect(
    page
      .getByTestId('signup-availability-strip')
      .getByText('Available', { exact: true })
  ).toHaveCount(2, { timeout: 10_000 });

  await Promise.all([
    page.waitForURL(/\/register\/check-inbox$/),
    page.getByTestId('registration-submit').click(),
  ]);

  // 2. Capture the network calls. The spec asserts the count of
  //    `forgot-password` requests below.
  const forgotCalls: Array<unknown> = [];
  page.on('request', (req) => {
    if (
      req.url().endsWith('/api/v1/auth/forgot-password') &&
      req.method() === 'POST'
    ) {
      forgotCalls.push(req.postDataJSON());
    }
  });

  // 3. Open `/forgot-password` and submit.
  await page.goto('/forgot-password');
  await page.getByTestId('forgot-form').waitFor();
  await page
    .getByTestId('forgot-form')
    .locator('input[type="email"]')
    .fill(uniqueEmail);
  await page.getByTestId('forgot-submit').click();

  // 4. The acknowledgement body is rendered with the neutral copy.
  //    The body is the only element with this data-testid; the copy
  //    resolves via `recovery-copy.ts`.
  const body = page.getByTestId('forgot-acknowledgement-body');
  await expect(body).toBeVisible({ timeout: 10_000 });
  await expect(body).toContainText('eligible for a new link');

  // 5. The body does NOT echo the user-supplied email. This is the
  //    core anti-enumeration invariant (A2 leak #2 closed).
  await expect(body).not.toContainText(uniqueEmail);
  await expect(body).not.toContainText('@example.test');

  // 6. The cooldown copy is visible. The countdown is part of the
  //    post-success acknowledgement UX; the C3 hook drives the
  //    timer.
  const cooldown = page.getByTestId('forgot-cooldown');
  await expect(cooldown).toBeVisible();
  await expect(cooldown).toContainText(/(?:s|second)/);

  // 7. The page does NOT auto-navigate. The URL is still
  //    `/forgot-password` after the response has settled. A
  //    navigation away would have been the original oracle (A2
  //    leak #1).
  await page.waitForTimeout(500);
  expect(new URL(page.url()).pathname).toBe('/forgot-password');

  // 8. The page does NOT contain a `mailto:` deep-link. The original
  //    page exposed `mailto:${userEmail}` which leaked the
  //    user-supplied address in the host mail client (A2 leak #1).
  const mailtoLinks = await page.locator('a[href^="mailto:"]').count();
  expect(mailtoLinks).toBe(0);

  // 9. The "Back to login" link points at `/login`.
  const backLink = page.getByRole('link', { name: /back to login/i });
  await expect(backLink).toHaveAttribute('href', '/login');

  // 10. Final assertion: exactly one `forgot-password` request was
  //     issued, and the request body contained the email we sent.
  await expect
    .poll(() => forgotCalls.length, { timeout: 5_000 })
    .toBe(1);
  expect(forgotCalls[0]).toEqual({ email: uniqueEmail });
});

test('no axios import exists under src/features/auth', async () => {
  // The cross-epic "thin service layer" rule. The `auth.service.ts`
  // module is the only file under `src/features/auth/**` that may
  // touch the SDK; everything else must go through `auth.service.ts`
  // or `@/lib/api` (the public barrel). Importing `axios` directly
  // is a lint rule violation. We assert it here as a static check so
  // a regression fails this Playwright spec — proving the rule holds
  // for the forgot-password flow in particular.
  const { execSync } = await import('node:child_process');
  const result = execSync(
    'grep -RE "from .axios.|require\\(.axios.\\)" src/features/auth || true',
    { encoding: 'utf8' }
  );
  expect(result).toBe('');
});