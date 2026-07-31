/**
 * Google ID token handling utilities.
 *
 * Source epic: Epic 2.6 — Google sign-in parity.
 * Source ticket: TKT-2.6.T5.
 *
 * ## What this file provides
 *
 * Pure utility functions for working with Google ID tokens returned by the
 * Google Identity Services library. These functions do not make network
 * requests or have side effects.
 *
 * ## Google ID Token structure
 *
 * Google ID tokens are JWTs (JSON Web Tokens). They consist of three
 * base64url-encoded segments separated by dots:
 *
 *   {header}.{payload}.{signature}
 *
 * The payload contains claims about the user and the token itself:
 *   - `iss`  — Issuer (should be `accounts.google.com`)
 *   - `aud`  — Audience (should be the Client ID)
 *   - `exp`  — Expiration time (Unix timestamp)
 *   - `iat`  — Issued at time (Unix timestamp)
 *   - `sub`  — Subject (Google user ID)
 *   - `email` — User's email
 *
 * Note: We do NOT verify the token signature client-side. The backend is
 * responsible for verifying the token with Google's public keys. This
 * module only extracts and validates the token structure.
 */

/**
 * The shape of a decoded Google ID token payload.
 * Not a full JWT spec — only the fields we care about.
 */
export interface GoogleTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  email?: string;
  email_verified?: boolean;
}

/**
 * Parses a base64url string into a plain object.
 * Returns null if the input is malformed.
 */
function base64urlDecode(str: string): Record<string, unknown> | null {
  try {
    // Convert base64url to base64
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Extracts the ID token from a Google Sign-In response.
 *
 * @param response - The response object from `google.accounts.id.renderButton()`
 *                  or `google.accounts.id.prompt()` callback.
 * @returns The ID token string, or null if not present or malformed.
 */
export function parseGoogleResponse(
  response: GoogleIdentityResponse,
): string | null {
  if (!response) return null;

  // Google Identity Services returns the token in `credential` field
  const token = response.credential ?? (response as unknown as { id_token?: string }).id_token;

  if (typeof token !== 'string' || token.length === 0) {
    return null;
  }

  return token;
}

/**
 * Decodes a Google ID token without verifying the signature.
 * Returns null if the token is malformed.
 *
 * @param token - A Google ID token string (JWT format).
 * @returns The decoded payload, or null if malformed.
 */
export function decodeGoogleToken(token: string): GoogleTokenPayload | null {
  if (typeof token !== 'string' || token.length === 0) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const payload = base64urlDecode(parts[1]);
  if (!payload) {
    return null;
  }

  // Validate required fields exist and have correct types
  if (
    typeof payload.iss !== 'string' ||
    typeof payload.aud !== 'string' ||
    typeof payload.exp !== 'number' ||
    typeof payload.iat !== 'number' ||
    typeof payload.sub !== 'string'
  ) {
    return null;
  }

  return payload as unknown as GoogleTokenPayload;
}

/**
 * Checks if a Google ID token is expired.
 *
 * @param token - A Google ID token string.
 * @returns True if the token is expired or malformed, false otherwise.
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeGoogleToken(token);
  if (!payload) return true; // Treat malformed tokens as expired

  // Get current Unix timestamp in seconds
  const now = Math.floor(Date.now() / 1000);

  // Token is expired if expiration time is in the past
  return payload.exp < now;
}

/**
 * Returns the expiration timestamp from a Google ID token.
 *
 * @param token - A Google ID token string.
 * @returns The Unix timestamp (seconds) when the token expires, or null if malformed.
 */
export function getTokenExpiration(token: string): number | null {
  const payload = decodeGoogleToken(token);
  if (!payload) return null;
  return payload.exp;
}

/**
 * Returns the issued-at timestamp from a Google ID token.
 *
 * @param token - A Google ID token string.
 * @returns The Unix timestamp (seconds) when the token was issued, or null if malformed.
 */
export function getTokenIssuedAt(token: string): number | null {
  const payload = decodeGoogleToken(token);
  if (!payload) return null;
  return payload.iat;
}

/**
 * Returns the Google user ID (subject) from a Google ID token.
 *
 * @param token - A Google ID token string.
 * @returns The Google user ID, or null if malformed.
 */
export function getTokenSubject(token: string): string | null {
  const payload = decodeGoogleToken(token);
  if (!payload) return null;
  return payload.sub;
}

/**
 * Returns the email from a Google ID token, if present.
 *
 * @param token - A Google ID token string.
 * @returns The user's email, or null if not present or malformed.
 */
export function getTokenEmail(token: string): string | null {
  const payload = decodeGoogleToken(token);
  if (!payload) return null;
  return payload.email ?? null;
}

/**
 * The shape of the Google Identity Services response object.
 * Matches the interface from `@types/google.accounts`.
 */
export interface GoogleIdentityResponse {
  credential?: string;
  select_by?: string;
  clientId?: string;
}
