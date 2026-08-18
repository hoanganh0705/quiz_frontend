

import { isSafeRedirectTarget } from './safe-redirect';
import { clearAllAuthCache } from './user-scoped-cache';

const AUTH_RETURN_URL_KEY = 'auth_return_url';
const LOGIN_PATH = '/login';

export function storeReturnUrl(url: string): void {
if (typeof window === 'undefined') return;

if (isSafeRedirectTarget(url)) {
sessionStorage.setItem(AUTH_RETURN_URL_KEY, url);
  }
}

export function getStoredReturnUrl(): string {
if (typeof window === 'undefined') return '/quizzes';

const stored = sessionStorage.getItem(AUTH_RETURN_URL_KEY);
if (stored && isSafeRedirectTarget(stored)) {
return stored;
  }
return '/quizzes';
}

export function clearStoredReturnUrl(): void {
if (typeof window === 'undefined') return;
sessionStorage.removeItem(AUTH_RETURN_URL_KEY);
}

export function popReturnUrl(): string {
const url = getStoredReturnUrl();
clearStoredReturnUrl();
return url;
}

export function redirectToLogin(returnTo?: string): void {
if (typeof window === 'undefined') return;

clearAllAuthCache();

const targetUrl = returnTo ?? window.location.pathname;
if (isSafeRedirectTarget(targetUrl)) {
storeReturnUrl(targetUrl);
  }

window.location.href = LOGIN_PATH;
}

export function redirectToReturnUrl(fallback: string = '/quizzes'): void {
if (typeof window === 'undefined') return;

clearAllAuthCache();

const targetUrl = getStoredReturnUrl();
clearStoredReturnUrl();

const finalUrl = isSafeRedirectTarget(targetUrl) ? targetUrl : fallback;

window.location.href = finalUrl;
}

export function navigateWithinApp(path: string): void {
if (typeof window === 'undefined') return;

if (!isSafeRedirectTarget(path)) {
path = '/quizzes';
  }

window.location.href = path;
}

export function handleTerminal401(): void {
if (typeof window === 'undefined') return;

const currentPath = window.location.pathname + window.location.search;

clearAllAuthCache();

storeReturnUrl(currentPath);

window.location.href = LOGIN_PATH;
}

export function isLoginRedirect(url: string): boolean {
return url.startsWith(LOGIN_PATH);
}
