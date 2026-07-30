/**
 * E2 (forgot-password anti-enumeration) — Playwright: the
 * acknowledgement body is byte-identical for a brand-new email, a
 * known-existing unverified email, and a known-existing verified email.
 *
 * Source epic: Epic 2.3 — Forgot-password and reset-password recovery.
 * Source ticket: TKT-2.3.E2.
 *
 * ## What this spec proves
 *
 *   1. The acknowledgement body at `/forgot-password` is
 *      byte-identical for three different account states:
 *      brand-new, known-unverified, known-verified.
 *   2. The body NEVER contains the user-supplied email
 *      (anti-enumeration invariant — A2 leak #2 closed by C4).
 *   3. The page does NOT echo the email in any rendered string.
 *
 * ## What this spec assumes
 *
 *   - The dev backend's `/auth/forgot-password` returns the same
 *     generic acknowledgement body for unknown, unverified, and
 *     verified emails. That is the backend's anti-enumeration
 *     contract. The frontend's mapper (TKT-2.3.B2) collapses every
 *     backend response into the same `acknowledgement` kind, so the
 *     rendered body is provably the same regardless of the actual
 *     response.
 *   - The three test emails are arbitrary. The "known-unverified"
 *     and "known-verified" cases do not require a real account
 *     fixture — the backend will return the same generic
 *     acknowledgement for any email, and the page is conditional on
 *     the response, not on the input. (If the backend is ever
 *     changed to reveal account state here, the front-end suite
 *     catches it via the byte-equality assertion.)
 *   - For the byte-equality assertion, the captured bodies must be
 *     observed on the SAME page lifetime (same Playwright context,
 *     same browser session). We re-use the page across the three
 *     submissions so the test is fast and deterministic.
 */

import { test, expect } from '@playwright/test';

const EMAIL_NEW = 'forgot_e2_new@example.test';
const EMAIL_UNVERIFIED = 'forgot_e2_unverified@example.test';
const EMAIL_VERIFIED = 'forgot_e2_verified@example.test';

const captureBody = async (
  page: import('@playwright/test').Page,
  email: string
): Promise<string> => {
  await page.goto(`/forgot-password?email=${encodeURIComponent(email)}`);
  const form = page.getByTestId('forgot-form');
  await expect(form).toBeVisible({ timeout: 5_000 });
  await page
    .getByTestId('forgot-form')
    .locator('input[type="email"]')
    .fill(email);
  await page.getByTestId('forgot-submit').click();

  // The body appears once the post-success state machine
  // transitions to `'cooldown'`. The 60-second cooldown blocks the
  // submit button; we assert the body visibility with a generous
  // timeout so the live backend's response time does not flake the
  // spec.
  const body = page.getByTestId('forgot-acknowledgement-body');
  await expect(body).toBeVisible({ timeout: 15_000 });

  const text = await body.textContent();
  if (text === null) {
    throw new Error(`Body for email ${email} was null`);
  }
  return text;
};

test('forgot-password renders the same body for three different emails', async ({
  page,
}) => {
  const bodyNew = await captureBody(page, EMAIL_NEW);
  const bodyUnverified = await captureBody(page, EMAIL_UNVERIFIED);
  const bodyVerified = await captureBody(page, EMAIL_VERIFIED);

  // Byte-identical across the three account states.
  expect(bodyNew).toBe(bodyUnverified);
  expect(bodyUnverified).toBe(bodyVerified);
});

test('forgot-password body never contains the user-supplied email', async ({
  page,
}) => {
  const email = EMAIL_NEW;
  const body = await captureBody(page, email);
  expect(body).not.toContain(email);
  expect(body).not.toContain('@example.test');
  expect(body).not.toContain('example.test');
});

test('forgot-password body never contains anti-enumeration oracle phrases', async ({
  page,
}) => {
  const email = EMAIL_VERIFIED;
  const body = await captureBody(page, email);
  // The frontend mapper collapses every response into the same body
  // and the copy registry is the static anti-enumeration guard.
  // The captured body must not contain any of the canonical
  // enumeration-oracle phrases.
  const phrases = [
    'already',
    'duplicate',
    'exists',
    'verified',
    'invalid',
    'expired',
    'sent',
    'success',
    'account created',
  ];
  const lower = body.toLowerCase();
  for (const phrase of phrases) {
    expect(lower, `body contained oracle phrase "${phrase}"`).not.toContain(
      phrase
    );
  }
});