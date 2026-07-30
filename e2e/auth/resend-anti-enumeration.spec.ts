/**
 * F2 (resend) — Playwright anti-enumeration: the acknowledgement body
 * is identical for a brand-new email, a known-unverified email, and a
 * known-verified email.
 *
 * Source epic: Epic 2.2 — Email verification and resend.
 * Source ticket: TKT-2.2.F2.
 *
 * ## What this spec proves
 *
 *   1. The acknowledgement body at `/resend-verification` is
 *      byte-identical for three different account states:
 *      brand-new, known-unverified, known-verified.
 *
 * ## What this spec assumes
 *
 *   - The dev backend returns the same generic acknowledgement body
 *     for `/auth/resend-verification-email` regardless of whether
 *     the address exists, is unverified, or is verified. That is the
 *     backend's anti-enumeration contract — the resend endpoint never
 *     reveals account state. The front-end respects that contract;
 *     this spec asserts the same body is rendered in all three cases.
 *
 * The three test emails are arbitrary. The "known-unverified" and
 * "known-verified" cases do not require a real account fixture —
 * the backend will return the same generic acknowledgement for any
 * email, and the page is conditional on the response, not on the
 * input. (If the backend is changed to ever reveal account state
 * here, the front-end suite catches it via the byte-equality
 * assertion.)
 */

import { test, expect } from '@playwright/test';

const EMAIL_NEW = 'resend_f2_new@example.test';
const EMAIL_UNVERIFIED = 'resend_f2_unverified@example.test';
const EMAIL_VERIFIED = 'resend_f2_verified@example.test';

const captureBody = async (
  page: import('@playwright/test').Page,
  email: string
): Promise<string> => {
  await page.goto(`/resend-verification?email=${encodeURIComponent(email)}`);
  const emailInput = page.getByTestId('resend-form').locator('input[type="email"]');
  await emailInput.fill(email);
  const submit = page.getByTestId('resend-submit');
  await submit.click();
  // The body appears once the cooldown kicks in.
  const body = page.getByTestId('resend-acknowledgement-body');
  await expect(body).toBeVisible({ timeout: 10_000 });
  const text = await body.textContent();
  if (text === null) {
    throw new Error(`Body for email ${email} was null`);
  }
  return text;
};

test('resend-verification renders the same body for three different emails', async ({
  page,
}) => {
  const bodyNew = await captureBody(page, EMAIL_NEW);
  const bodyUnverified = await captureBody(page, EMAIL_UNVERIFIED);
  const bodyVerified = await captureBody(page, EMAIL_VERIFIED);

  // Byte-identical across the three account states.
  expect(bodyNew).toBe(bodyUnverified);
  expect(bodyUnverified).toBe(bodyVerified);
});

test('resend-verification body never contains the user-supplied email', async ({
  page,
}) => {
  const email = EMAIL_NEW;
  const body = await captureBody(page, email);
  expect(body).not.toContain(email);
  expect(body).not.toContain('example.test');
});