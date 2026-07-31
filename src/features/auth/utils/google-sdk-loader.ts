/**
 * Google Identity Services SDK loader.
 *
 * Source epic: Epic 2.6 — Google sign-in parity.
 * Source ticket: TKT-2.6.T6.
 *
 * ## What this file does
 *
 * Safely loads the Google Identity Services (GIS) library and exposes
 * the `google.accounts` API to feature code. The loader:
 *
 *   1. Loads the GIS script exactly once (singleton pattern).
 *   2. Gracefully degrades when the script is blocked or unavailable.
 *   3. Works in both client and SSR environments.
 *   4. Provides TypeScript types for the GIS API.
 *
 * ## Script URL
 *
 * The GIS library is loaded from Google's CDN:
 *   https://accounts.google.com/gsi/client
 *
 * The library is loaded asynchronously and is ready when `google.accounts.id`
 * is available.
 *
 * ## Error handling
 *
 * The loader handles these failure modes:
 *   - Script blocked by ad blocker or network policy → returns null
 *   - Offline / no network → returns null
 *   - Google Identity Services not available → returns null
 *   - SSR environment → returns null (no window/document)
 */

import { isGoogleAuthConfigured } from '../config/google-identity.config';

/**
 * Singleton slot for the loaded SDK.
 * Module-level so it persists across hook re-renders.
 */
let googleIdentityInstance: GoogleIdentity | null = null;

/**
 * Promise slot for the in-flight load operation.
 * Ensures multiple concurrent calls share the same load promise.
 */
let loadPromise: Promise<GoogleIdentity | null> | null = null;

/**
 * The shape of the global `google.accounts` object from the GIS library.
 * Full reference: https://developers.google.com/identity/gsi/web/reference/js_reference
 */
export interface GoogleAccounts {
  id: GoogleId;
}

/**
 * The shape of the full `google` global object when Google Identity Services is loaded.
 * This is what `window.google` looks like after the GIS script executes.
 */
export interface GoogleIdentity {
  accounts: GoogleAccounts;
}

/**
 * The shape of the `google.accounts.id` API surface.
 */
export interface GoogleId {
  /**
   * Renders the Google Sign-In button.
   */
  renderButton(
    element: HTMLElement,
    options: GoogleSignInButtonOptions,
  ): void;

  /**
   * Requests an ID token by showing the One Tap prompt or
   * automatic selection (if only one session).
   */
  prompt(
    callback?: (response: GoogleTokenResponse) => void,
  ): void;

  /**
   * Revokes a previously granted OAuth grant.
   */
  revoke(
    hint: string,
    callback?: (response: GoogleRevocationResponse) => void,
  ): void;

  /**
   * Cancels the current sign-in prompt.
   */
  cancelButton(): void;

  /**
   * Stores the OAuth token hint or the app session state.
   */
  storeCredential(
    credential: { id: string; provider?: string },
    callback?: (response: { supported: boolean }) => void,
  ): void;

  /**
   * Disables the button auto-selection behavior.
   */
  disableAutoSelect(): void;

  /**
   * Logs out the user from Google (not our app).
   */
  signOut(callback?: () => void): void;
}

export interface GoogleSignInButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
  height?: number;
}

/**
 * Response from the One Tap prompt or button callback.
 */
export interface GoogleTokenResponse {
  /** The OAuth access token (if requested). */
  access_token?: string;
  /** The ID token (JWT). */
  credential?: string;
  /** The client-specific select_by value. */
  select_by?: string;
  /** Error code (e.g., 'popup_closed_by_user'). */
  error?: string;
}

/**
 * Response from the revocation callback.
 */
export interface GoogleRevocationResponse {
  successful: boolean;
  error?: string;
}

/**
 * Checks if the global `google.accounts.id` object is available.
 * Returns false in SSR or when the script hasn't loaded.
 */
function isGoogleSdkAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const g = (window as Window & { google?: { accounts?: { id?: unknown } } }).google;
  return typeof g?.accounts?.id !== 'undefined';
}

/**
 * Injects the Google Identity Services script into the document head.
 * Returns a Promise that resolves when the script is loaded and ready.
 */
function injectScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already injected
    if (document.getElementById('google-identity-services')) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-identity-services';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;

    // When the script loads, `google.accounts.id` will be available.
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Failed to load Google Identity Services script'));

    document.head.appendChild(script);
  });
}

/**
 * Waits for `google.accounts.id` to be available.
 * The script might load asynchronously, so we poll briefly.
 */
async function waitForGoogleId(timeoutMs = 5000): Promise<boolean> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (isGoogleSdkAvailable()) {
      return true;
    }
    // Wait a bit before polling again
    await new Promise((r) => setTimeout(r, 50));
  }

  return false;
}

/**
 * Loads the Google Identity Services SDK exactly once.
 *
 * Call this function to get access to `google.accounts.id`.
 * Multiple concurrent calls share the same load promise.
 *
 * @returns A Promise that resolves to the Google Identity object,
 *          or null if the SDK could not be loaded.
 *
 * @example
 * const google = await loadGoogleSDK();
 * if (google) {
 *   google.id.renderButton(element, { theme: 'outline', size: 'large' });
 * }
 */
export async function loadGoogleSDK(): Promise<GoogleIdentity | null> {
  // SSR guard: no window/document
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  // Check if Google Auth is configured
  if (!isGoogleAuthConfigured()) {
    return null;
  }

  // Return cached instance if available
  if (googleIdentityInstance) {
    return googleIdentityInstance;
  }

  // If a load is already in flight, wait for it
  if (loadPromise) {
    return loadPromise;
  }

  // Start a new load
  loadPromise = doLoad();
  return loadPromise;
}

/**
 * Internal load implementation. Extracted so it can be awaited
 * by the singleton logic above.
 */
async function doLoad(): Promise<GoogleIdentity | null> {
  try {
    // Inject the script
    await injectScript();

    // Wait for google.accounts.id to be available
    const available = await waitForGoogleId();

    if (!available) {
      return null;
    }

    // Cast and cache
    const g = (window as Window & { google?: GoogleIdentity }).google;
    if (!g?.accounts?.id) {
      return null;
    }

    googleIdentityInstance = g;
    return googleIdentityInstance;
  } catch {
    return null;
  }
}

/**
 * Resets the singleton state.
 *
 * This is primarily useful for testing, where you may want to
 * simulate a fresh load after a previous failure or between tests.
 *
 * @internal
 */
export function __resetGoogleSDKLoader(): void {
  googleIdentityInstance = null;
  loadPromise = null;
}
