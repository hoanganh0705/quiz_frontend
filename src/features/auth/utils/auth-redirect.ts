/**
 * Auth redirect utility — handles post-authentication redirects.
 *
 * Source epic: Epic 2.5 — Auth bootstrap and full-profile hydration.
 * Source ticket: TKT-2.5.10.
 *
 * ## Purpose
 *
 * Manages redirect URLs for post-login navigation and 401 handling.
 * Ensures:
 *
 * 1. Return URLs are validated (no open redirect attacks)
 * 2. URLs are properly encoded for query params
 * 3. Cache is cleared before redirect
 *
 * ## Security
 *
 * This module uses `isSafeRedirectTarget` from `./safe-redirect` to validate
 * all redirect targets. Only paths starting with `/` (and not `/login`) are
 * allowed.
 */

import { isSafeRedirectTarget } from './safe-redirect';
import { clearAllAuthCache } from './user-scoped-cache';

// ─── Constants ───────────────────────────────────────────────────────────────

const AUTH_RETURN_URL_KEY = 'auth_return_url';
const LOGIN_PATH = '/login';

// ─── Return URL Storage ───────────────────────────────────────────────────────

/**
 * Store the return URL for post-login redirect.
 * The URL is validated before storage to prevent open redirect attacks.
 */
export function storeReturnUrl(url: string): void {
  if (typeof window === 'undefined') return;

  if (isSafeRedirectTarget(url)) {
    sessionStorage.setItem(AUTH_RETURN_URL_KEY, url);
  }
}

/**
 * Get the stored return URL.
 * Returns a safe default if no URL is stored or if the stored URL is invalid.
 */
export function getStoredReturnUrl(): string {
  if (typeof window === 'undefined') return '/quizzes';

  const stored = sessionStorage.getItem(AUTH_RETURN_URL_KEY);
  if (stored && isSafeRedirectTarget(stored)) {
    return stored;
  }
  return '/quizzes';
}

/**
 * Clear the stored return URL.
 * Call this after using the URL to prevent replay attacks.
 */
export function clearStoredReturnUrl(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(AUTH_RETURN_URL_KEY);
}

/**
 * Get and clear the return URL in one operation.
 * Use this when redirecting after login.
 */
export function popReturnUrl(): string {
  const url = getStoredReturnUrl();
  clearStoredReturnUrl();
  return url;
}

// ─── Redirect Functions ────────────────────────────────────────────────────────

/**
 * Redirect to login with return URL.
 * Clears auth caches before redirect.
 *
 * @param returnTo - The URL to return to after login (default: current path)
 */
export function redirectToLogin(returnTo?: string): void {
  if (typeof window === 'undefined') return;

  // Clear all auth caches first
  clearAllAuthCache();

  // Store return URL if provided
  const targetUrl = returnTo ?? window.location.pathname;
  if (isSafeRedirectTarget(targetUrl)) {
    storeReturnUrl(targetUrl);
  }

  // Navigate to login
  window.location.href = LOGIN_PATH;
}

/**
 * Redirect to the stored return URL or default.
 * Clears caches before redirect.
 *
 * @param fallback - Fallback URL if no return URL is stored
 */
export function redirectToReturnUrl(fallback: string = '/quizzes'): void {
  if (typeof window === 'undefined') return;

  // Clear caches
  clearAllAuthCache();

  // Get and use return URL
  const targetUrl = getStoredReturnUrl();
  clearStoredReturnUrl();

  // Use fallback if return URL is invalid
  const finalUrl = isSafeRedirectTarget(targetUrl) ? targetUrl : fallback;

  window.location.href = finalUrl;
}

/**
 * Navigate within the app (for authenticated routes).
 * Does NOT clear caches — use for in-app navigation only.
 *
 * @param path - The path to navigate to
 */
export function navigateWithinApp(path: string): void {
  if (typeof window === 'undefined') return;

  // Validate path
  if (!isSafeRedirectTarget(path)) {
    path = '/quizzes';
  }

  window.location.href = path;
}

// ─── 401 Handler ─────────────────────────────────────────────────────────────

/**
 * Handle a terminal 401 error.
 * This is called when /auth/me returns 401 after refresh attempts.
 *
 * The function:
 * 1. Clears all caches
 * 2. Stores current path as return URL
 * 3. Redirects to login
 */
export function handleTerminal401(): void {
  if (typeof window === 'undefined') return;

  // Capture current path for return
  const currentPath = window.location.pathname + window.location.search;

  // Clear everything
  clearAllAuthCache();

  // Store return URL
  storeReturnUrl(currentPath);

  // Redirect to login
  window.location.href = LOGIN_PATH;
}

/**
 * Check if a redirect URL is the login page.
 */
export function isLoginRedirect(url: string): boolean {
  return url.startsWith(LOGIN_PATH);
}
