/**
 * Google Identity SDK configuration.
 *
 * Source epic: Epic 2.6 — Google sign-in parity.
 * Source ticket: TKT-2.6.T4.
 *
 * ## Design principles
 *
 * All configuration is read from environment variables at runtime (client-side).
 * This ensures:
 *
 *   1. The Google Client ID can be changed without a rebuild.
 *   2. The feature degrades gracefully when unconfigured.
 *   3. No secrets are embedded in the client bundle.
 *
 * ## Environment variables
 *
 * Required:
 *   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — Google OAuth 2.0 Client ID
 *
 * The Client ID is the web application's identifier in Google's OAuth system.
 * It must match the allowed origins configured in the Google Cloud Console.
 */

/**
 * Google OAuth 2.0 Client ID from the Google Cloud Console.
 *
 * Must be set in `.env.local` as `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
 * Will be empty string in environments where the variable is not set.
 */
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

/**
 * Scopes requested during the Google Sign-In flow.
 *
 * These scopes determine what user information Google shares with us.
 * - `openid`   — OpenID Connect basic profile
 * - `email`    — User's email address
 * - `profile`  — User's name and profile picture
 */
export const GOOGLE_SCOPES = ['openid', 'email', 'profile'] as const;

/**
 * Returns true when Google Sign-In is configured with a valid Client ID.
 *
 * Use this guard to:
 *   - Hide the Google sign-in button when unconfigured.
 *   - Skip SDK initialization when not needed.
 *   - Show appropriate messaging when the feature is unavailable.
 *
 * @example
 * if (!isGoogleAuthConfigured()) {
 *   return null; // Don't render the Google button
 * }
 */
export function isGoogleAuthConfigured(): boolean {
  return GOOGLE_CLIENT_ID.length > 0;
}

/**
 * Returns the configured Google Client ID.
 *
 * Returns empty string if `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is not set.
 * Prefer `isGoogleAuthConfigured()` for availability checks.
 */
export function getGoogleClientId(): string {
  return GOOGLE_CLIENT_ID;
}

/**
 * Returns the Google OAuth consent URL for programmatic configuration.
 *
 * This is used internally by the SDK loader to initialize the Google
 * Identity Services library with the correct parameters.
 */
export function getGoogleAuthRequestConfig(): {
  client_id: string;
  scope: string;
} {
  return {
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_SCOPES.join(' '),
  };
}
