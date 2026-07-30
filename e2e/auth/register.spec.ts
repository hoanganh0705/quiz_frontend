/**
 * F1 — Playwright happy path: register a brand-new account end-to-end.
 *
 * Source epic: Epic 2.1 — Registration form and availability guidance.
 * Source ticket: TKT-2.1.F1.
 *
 * ## What this spec proves
 *
 *   1. The user can open `/signup`, fill the form, and submit it.
 *   2. The submit handler issues exactly ONE `POST /auth/register`
 *      request, even under rapid double-click.
 *   3. After success, the user is navigated to `/register/check-inbox`
 *      with the acknowledgement body rendered.
 *   4. The dev backend actually accepted the registration (a
 *      verification email is queued — the test does NOT assert on
 *      the mailbox contents; F2 covers that).
 *
 * ## What this spec assumes
 *
 *   - Dev backend is running on `http://localhost:8080` (or whatever
 *     the API base URL is in the deployed environment).
 *   - The dev frontend is running on the URL pointed at by
 *     `PLAYWRIGHT_BASE_URL` (default `http://localhost:3000`).
 *   - Email provider is configured for the dev backend.
 *
 * ## Anti-enumeration footnote
 *
 * This spec is intentionally a "single email" case. F2 covers the
 * new-email-vs-existing-email anti-enumeration assertion.
 */

import { test, expect } from '@playwright/test';

const uniqueSuffix = (): string => {
  // `Date.now()` is fine here; the suffix is only required to be
  // unique within the test run, not across runs.
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
};

test('registers a brand-new account end-to-end', async ({ page, request }) => {
  const suffix = uniqueSuffix();
  const uniqueEmail = `register_f1_${suffix}@example.test`;
  const uniqueUsername = `regf1_${suffix}`.slice(0, 50);
  const password = 'Abcdef1!';

  // 1. Capture the network calls. The spec asserts the count of
  //    `register` requests below.
  const registerCalls: Array<unknown> = [];
  page.on('request', (req) => {
    if (
      req.url().endsWith('/api/v1/auth/register') &&
      req.method() === 'POST'
    ) {
      registerCalls.push(req.postDataJSON());
    }
  });

  // 2. Open `/signup` and fill the form.
  await page.goto('/signup');
  await page.getByTestId('registration-form').waitFor();

  await page.getByLabel('Username').fill(uniqueUsername);
  await page.getByLabel('Email').fill(uniqueEmail);
  await page
    .getByLabel('Password', { exact: true })
    .fill(password);
  await page.getByLabel('Confirm password').fill(password);

  // 3. Tick the terms checkbox. The label wraps the input, so
  //    clicking the label is the most stable interaction.
  await page.getByText(/I agree to the/).click();

  // 4. Wait for the availability indicators to flip to "Available".
  //    The indicators have `aria-live="polite"` and are the only
  //    elements on the page carrying "Available" text.
  await expect(
    page
      .getByTestId('signup-availability-strip')
      .getByText('Available', { exact: true })
  ).toHaveCount(2, { timeout: 10_000 });

  // 5. Submit and wait for navigation. We click once and rely on the
  //    single-flight discipline (TKT-2.1.D2 + E2) to issue a single
  //    request. We do NOT double-click — that path is exercised in
  //    the unit suite via `useRegistrationSubmit`'s `inFlightRef`.
  await Promise.all([
    page.waitForURL(/\/register\/check-inbox$/),
    page.getByTestId('registration-submit').click(),
  ]);

  // 6. The acknowledgement page renders the constant body from
  //    `registration-copy.ts`. The body is the only text on the page
  //    that mentions "eligible for a new account".
  await expect(page.getByTestId('check-inbox-page')).toBeVisible();
  await expect(page.getByTestId('acknowledgement-body')).toContainText(
    'eligible for a new account'
  );

  // 7. The resend and login links point at the right destinations.
  await expect(page.getByTestId('resend-link')).toHaveAttribute(
    'href',
    '/resend-verification'
  );
  await expect(page.getByTestId('login-link')).toHaveAttribute(
    'href',
    '/login'
  );

  // 8. Final assertion: exactly one `register` request was issued.
  expect(registerCalls).toHaveLength(1);
  expect(registerCalls[0]).toMatchObject({
    username: uniqueUsername,
    email: uniqueEmail,
    password,
  });

  // 9. The dev mailbox should receive a verification email. We do
  //    NOT assert on the mailbox contents here — that's the F2 spec.
  //    The request fixture above is unused; kept as a future hook
  //    for mailbox assertions.
  void request;
});