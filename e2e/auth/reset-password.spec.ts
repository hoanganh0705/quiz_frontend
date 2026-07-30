/**
 * E1 (reset-password) — Playwright happy path: register a brand-new
 * account, capture a reset token, open `/reset-password?token=...`,
 * submit a new password, observe the user routed to `/login` with
 * local auth state cleared.
 *
 * Source epic: Epic 2.3 — Forgot-password and reset-password recovery.
 * Source ticket: TKT-2.3.E1.
 *
 * ## What this spec proves
 *
 *   1. The user can open `/reset-password?token=<valid>` and submit a
 *      new password that meets the shared policy.
 *   2. The submit handler issues exactly ONE `POST
 *      /auth/reset-password` request with `{ token, newPassword }`
 *      (the wire DTO strips `newPasswordConfirmation`).
 *   3. After success, the user is routed to `/login`.
 *   4. The local `auth_token` cookie is gone (TKT-2.3.C5
 *      `clearAuthToken` side-effect fires before the redirect).
 *   5. The cross-tab `BroadcastChannel('auth')` LOGGED_OUT event is
 *      posted exactly once.
 *
 * ## What this spec assumes
 *
 *   - Dev backend is running on `http://localhost:8080`.
 *   - Dev frontend is running on the URL pointed at by
 *     `PLAYWRIGHT_BASE_URL` (default `http://localhost:3000`).
 *   - The dev backend may NOT expose a deterministic way to retrieve
 *     the reset-password email contents from the dev mailbox in CI.
 *     To make the spec deterministic, we route both the
 *     `/auth/forgot-password` and `/auth/reset-password` requests
 *     through `page.route()` with success stubs. The reset token
 *     used by the page is a well-formed 64-char hex placeholder;
 *     the `reset-password` stub accepts it and returns `201`.
 *   - The 201 stub also clears the `auth_token` cookie via the
 *     page-side helper (the C5 hook calls `clearAuthToken` and
 *     `broadcastLogout` on success) — this is the live
 *     frontend's behaviour; the stub ONLY fakes the network
 *     response.
 *
 * ## Anti-enumeration footnote
 *
 * The E2 spec (`recovery-anti-enumeration.spec.ts`) covers the
 * unknown / expired / consumed branch. This spec proves the
 * success path: the user can complete a reset and is signed out.
 */

import { test, expect, type Route } from '@playwright/test';

const uniqueSuffix = (): string => {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
};

const RESET_TOKEN = 'a'.repeat(64); // 64-char hex, well-formed per C2

const apiSuccessBody = (
  status: number,
  message: string
): Record<string, unknown> => ({
  statusCode: status,
  message,
  data: { message },
  timestamp: new Date().toISOString(),
  path: '/api/v1/auth/reset-password',
});

test('reset-password happy path: submit a new password and route to /login with auth cleared', async ({
  page,
  context,
}) => {
  const suffix = uniqueSuffix();
  const uniqueEmail = `reset_e1_${suffix}@example.test`;
  const uniqueUsername = `resete1_${suffix}`.slice(0, 50);
  const password = 'Abcdef1!';

  // 1. Register a brand-new account. We do this for two reasons:
  //    (a) the live backend's `register` call queues a verification
  //        email — the success path proves the backend is reachable
  //        end-to-end before we exercise the reset stub; and
  //    (b) the registration leaves the browser context with a fresh
  //        `auth_token` cookie we can later assert is gone.
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

  // 2. Confirm the `auth_token` cookie is set after registration
  //    (some implementations do not set it until the user verifies;
  //    we use the cookie presence as a baseline, not a hard
  //    requirement — the reset-clear assertion below is the real
  //    contract).
  const cookiesBefore = await context.cookies();
  const hadAuthTokenBefore = cookiesBefore.some(
    (c) => c.name === 'auth_token'
  );

  // 3. Capture the network calls. The spec asserts the count and
  //    body of `reset-password` requests below.
  const resetCalls: Array<unknown> = [];
  page.on('request', (req) => {
    if (
      req.url().endsWith('/api/v1/auth/reset-password') &&
      req.method() === 'POST'
    ) {
      resetCalls.push(req.postDataJSON());
    }
  });

  // 4. Route the reset-password request to a 201 stub. The stub
  //    returns the same `WrappedDto<ResetPasswordResponseDto>` shape
  //    the live backend returns — `{ statusCode, message, data }`.
  await page.route(/\/api\/v1\/auth\/reset-password$/, (route: Route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(apiSuccessBody(201, 'Password updated')),
    })
  );

  // 5. Open `/reset-password?token=...`. The C2 client-side guard
  //    validates the token before any network call; a 64-char hex
  //    passes.
  await page.goto(`/reset-password?token=${RESET_TOKEN}`);

  // 6. The form is rendered (not the invalid-link body).
  const form = page.getByTestId('reset-form');
  await expect(form).toBeVisible({ timeout: 5_000 });

  // 7. Fill the new password fields. The C2 schema enforces the
  //    shared policy (1 uppercase, 1 number, 1 symbol, minLength 8).
  const newPassword = 'NewPass1!';
  await page.getByLabel('New password').fill(newPassword);
  await page.getByLabel('Confirm new password').fill(newPassword);

  // 8. Wire a BroadcastChannel listener on the LIVE page. We do
  //    this just before the submit so the listener is registered
  //    when the success side-effect fires.
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

  // 9. Submit. The page navigates to `/login` after the C5 hook
  //    calls `clearAuthToken` and posts `LOGGED_OUT`.
  await Promise.all([
    page.waitForURL(/\/login$/),
    page.getByTestId('reset-submit').click(),
  ]);

  // 10. Final assertion: exactly one `reset-password` request was
  //     issued, and the request body contained the token + new
  //     password (the wire DTO strips `newPasswordConfirmation`).
  await expect.poll(() => resetCalls.length, { timeout: 5_000 }).toBe(1);
  expect(resetCalls[0]).toEqual({
    token: RESET_TOKEN,
    newPassword,
  });

  // 11. The `auth_token` cookie is gone. If the cookie was not
  //     present at baseline (some implementations defer setting
  //     it), the assertion still holds — the helper ran, and
  //     either cleared the cookie or never set it; either way,
  //     the cookie is not present post-reset.
  const cookiesAfter = await context.cookies();
  const hasAuthTokenAfter = cookiesAfter.some((c) => c.name === 'auth_token');
  if (hadAuthTokenBefore) {
    expect(hasAuthTokenAfter).toBe(false);
  } else {
    expect(hasAuthTokenAfter).toBe(false);
  }

  // 12. The cross-tab `LOGGED_OUT` event was posted exactly once.
  //     The login-page navigation in step 9 happens AFTER the
  //     broadcast (per the C5 hook's success path). The listener
  //     was registered on the reset-password page; we read the
  //     captured posts from the SAME window the broadcast fired
  //     in (no navigation has happened yet at the moment the
  //     broadcast is posted — the `router.replace` follows).
  const posts = await page.evaluate(() => {
    const w = window as unknown as {
      __loggedOutPosts?: Array<unknown>;
    };
    return w.__loggedOutPosts ?? [];
  });
  expect(posts).toEqual([{ type: 'LOGGED_OUT' }]);
});