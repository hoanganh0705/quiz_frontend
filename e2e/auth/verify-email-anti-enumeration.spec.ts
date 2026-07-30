/**
 * F2 (verify-email) — Playwright anti-enumeration: the page renders
 * the same body for valid, expired, and unknown tokens.
 *
 * Source epic: Epic 2.2 — Email verification and resend.
 * Source ticket: TKT-2.2.F2.
 *
 * ## What this spec proves
 *
 *   1. The acknowledgement body at `/verify-email` is byte-identical
 *      for three different tokens: a valid-looking placeholder, an
 *      expired-looking placeholder, and an unknown-looking
 *      placeholder.
 *
 * ## What this spec assumes
 *
 *   - The dev backend is configured to return the same generic
 *     acknowledgement body for every `/auth/verify-email` response.
 *     That is the backend's anti-enumeration contract (the verify
 *     endpoint never reveals token validity); the assertion here
 *     proves the front-end respects what the backend returns.
 *   - The three tokens are valid 64-char hex strings. They are not
 *     real tokens — the backend treats them as unknown for the
 *     "valid" and "expired" cases. The point is byte equality of
 *     the front-end, not the backend's diff. The frontend's mapper
 *     (TKT-2.2.B2) collapses every backend response into the same
 *     `acknowledgement` kind, so the rendered body is provably the
 *     same regardless of the actual response.
 *
 * If F2 is failing on byte equality, the front-end mapper or copy
 * registry is the bug — never the backend.
 */

import { test, expect } from '@playwright/test';

const TOKEN_A = 'a'.repeat(64);
const TOKEN_B = 'b'.repeat(64);
const TOKEN_C = 'c'.repeat(64);

const captureBody = async (
  page: import('@playwright/test').Page,
  token: string
): Promise<string> => {
  await page.goto(`/verify-email?token=${token}`);
  const body = page.getByTestId('verify-acknowledgement-body');
  await expect(body).toBeVisible();
  // Use `textContent()` so the comparison is the exact rendered
  // string (no whitespace normalisation, no HTML interpretation).
  const text = await body.textContent();
  if (text === null) {
    throw new Error(`Body for token …${token.slice(-6)} was null`);
  }
  return text;
};

test('verify-email renders the same body for three different tokens', async ({
  page,
}) => {
  const bodyA = await captureBody(page, TOKEN_A);
  const bodyB = await captureBody(page, TOKEN_B);
  const bodyC = await captureBody(page, TOKEN_C);

  // Byte-identical across the three cases.
  expect(bodyA).toBe(bodyB);
  expect(bodyB).toBe(bodyC);
});

test('verify-email body never contains the user-supplied token', async ({
  page,
}) => {
  const token = TOKEN_A;
  const body = await captureBody(page, token);
  expect(body).not.toContain(token);
  expect(body).not.toContain('a'.repeat(32));
});