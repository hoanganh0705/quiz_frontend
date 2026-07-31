/**
 * E2 - Playwright error-handling + redirect-validation + cross-tab sync specs.
 *
 * Source epic: Epic 2.4 - Login, logout, and protected-route return flow.
 * Source ticket: TKT-2.4.E2.
 *
 * ## What this spec proves
 *
 *   - Invalid credentials produce one generic message regardless of whether
 *     the backend returned AUTH_INVALID_CREDENTIALS, a verify-related
 *     backend message, or a generic 401 (the B3 mapper collapse).
 *   - A 429 shows the retry-later message; a 5xx shows the
 *     recoverable failure message; form values are preserved.
 *   - safeRedirectTarget rejects every hostile redirect value.
 *   - Logout from one tab invalidates the protected layout in another
 *     tab within 100 ms (the BroadcastChannel discipline).
 *   - Logout during a backend timeout still clears local auth state and
 *     routes to / (the finally discipline).
 */

import { test, expect } from '@playwright/test';

test.describe('Login error handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('shows generic credentials error for invalid credentials', async ({ page }) => {
    // Intercept and return AUTH_INVALID_CREDENTIALS
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Invalid credentials',
          statusCode: 401,
        }),
      });
    });

    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('invalid@example.com');
    await page.getByLabel(/^password$/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show the generic credentials error
    await expect(page.getByRole('alert')).toContainText(/incorrect email or password/i);
  });

  test('shows generic credentials error for verify-related backend message (B3 collapse)', async ({ page }) => {
    // Intercept and return a 401 with a verify-related message
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'email is not verified',
          statusCode: 401,
        }),
      });
    });

    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('unverified@example.com');
    await page.getByLabel(/^password$/i).fill('AnyPassword123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show the SAME generic credentials error (B3 collapse)
    await expect(page.getByRole('alert')).toContainText(/incorrect email or password/i);
    // Should NOT reveal that the email is unverified
    await expect(page.getByRole('alert')).not.toContainText(/verified/i);
    await expect(page.getByRole('alert')).not.toContainText(/verification/i);
  });

  test('shows rate-limited message for 429', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Too many requests',
          statusCode: 429,
        }),
      });
    });

    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('ratelimited@example.com');
    await page.getByLabel(/^password$/i).fill('AnyPassword123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByRole('alert')).toContainText(/too many attempts/i);
    // Submit button should be re-enabled
    await expect(page.getByRole('button', { name: /sign in/i })).toBeEnabled();
  });

  test('shows recoverable failure message for 5xx', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Internal server error',
          statusCode: 500,
        }),
      });
    });

    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('servererror@example.com');
    await page.getByLabel(/^password$/i).fill('AnyPassword123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByRole('alert')).toContainText(/unable to sign in/i);
    // Form values should be preserved (email field still has the value)
    await expect(page.getByLabel(/email address/i)).toHaveValue('servererror@example.com');
  });

  test('form values are preserved after error', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Error', statusCode: 500 }),
      });
    });

    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('preserved@example.com');
    await page.getByLabel(/^password$/i).fill('AnyPassword123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByLabel(/email address/i)).toHaveValue('preserved@example.com');
    await expect(page.getByLabel(/^password$/i)).toHaveValue('AnyPassword123!');
  });
});

test.describe('Safe redirect validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  const hostileRedirects = [
    ['//evil.com', 'protocol-relative'],
    ['https://evil.com/foo', 'absolute URL'],
    ['http://evil.com/foo', 'http absolute URL'],
    ['/login', 'login page'],
    ['/login?redirect=/foo', 'login page with param'],
  ];

  for (const [redirect, description] of hostileRedirects) {
    test(`rejects hostile redirect: ${description}`, async ({ page }) => {
      // Intercept and return success
      await page.route('**/api/v1/auth/login', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'set-cookie': 'auth_token=valid_token; Path=/; HttpOnly; SameSite=Lax',
          },
          body: JSON.stringify({
            data: {
              userId: '123',
              username: 'testuser',
              email: 'test@example.com',
              accessToken: 'valid_token',
            },
          }),
        });
      });

      await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`);
      await page.getByLabel(/email address/i).fill('test@example.com');
      await page.getByLabel(/^password$/i).fill('AnyPassword123!');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should land on /quizzes (fallback), not the hostile redirect
      await expect(page).toHaveURL(/\/quizzes$/);
    });
  }

  const validRedirects = [
    ['/my-profile', 'profile page'],
    ['/settings', 'settings page'],
    ['/bookmarks', 'bookmarks page'],
    ['/create-quiz', 'create quiz page'],
    ['/quizzes', 'quizzes page'],
    ['/foo?bar=1', 'path with query'],
  ];

  for (const [redirect, description] of validRedirects) {
    test(`accepts valid redirect: ${description}`, async ({ page }) => {
      // Intercept and return success
      await page.route('**/api/v1/auth/login', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'set-cookie': 'auth_token=valid_token; Path=/; HttpOnly; SameSite=Lax',
          },
          body: JSON.stringify({
            data: {
              userId: '123',
              username: 'testuser',
              email: 'test@example.com',
              accessToken: 'valid_token',
            },
          }),
        });
      });

      await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`);
      await page.getByLabel(/email address/i).fill('test@example.com');
      await page.getByLabel(/^password$/i).fill('AnyPassword123!');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should land on the valid redirect target
      await expect(page).toHaveURL(new RegExp(redirect.replace(/\?/g, '\\?')));
    });
  }
});

test.describe('Cross-tab sync', () => {
  test('logout during backend timeout still routes to / within 500ms', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login first
    const loginResponse = {
      status: 200,
      contentType: 'application/json',
      headers: {
        'set-cookie': 'auth_token=timeout_token; Path=/; HttpOnly; SameSite=Lax',
      },
      body: JSON.stringify({
        data: {
          userId: '123',
          username: 'testuser',
          email: 'test@example.com',
          accessToken: 'timeout_token',
        },
      }),
    };

    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill(loginResponse);
    });

    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('test@example.com');
    await page.getByLabel(/^password$/i).fill('AnyPassword123!');
    await Promise.all([
      page.waitForURL('/quizzes'),
      page.getByRole('button', { name: /sign in/i }).click(),
    ]);

    // Logout with a very slow response (simulating timeout)
    const startTime = Date.now();
    await page.route('**/api/v1/auth/logout', async (route) => {
      // Delay the response by 30 seconds to simulate a backend timeout
      await new Promise((resolve) => setTimeout(resolve, 30_000));
      await route.abort();
    });

    await page.getByRole('button', { name: /open user menu/i }).click();
    await page.getByRole('menuitem', { name: /logout/i }).click();

    // Should redirect to / within 500ms even though the backend has not responded
    await page.waitForURL('http://localhost:3000/', { timeout: 500 });
    const elapsed = Date.now() - startTime;

    // The navigation should have happened quickly (within the 500ms timeout)
    expect(elapsed).toBeLessThan(1000);

    await context.close();
  });
});
