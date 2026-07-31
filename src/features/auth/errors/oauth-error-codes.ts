/**
 * OAuth-specific error code constants for Google sign-in.
 *
 * Source epic: Epic 2.6 — Google sign-in parity.
 * Source ticket: TKT-2.6.T1.
 *
 * These constants mirror the matching keys in `src/lib/api/error-codes.ts`
 * (ErrorCode union). They exist here so that the auth error mapper and
 * service layer can import them as named constants rather than raw string
 * literals, reducing the risk of typos.
 *
 * Adding a new OAuth code here requires adding it to the ErrorCode union in
 * `error-codes.ts` first.
 */

/**
 * The Google ID token is invalid, expired, or malformed.
 * The user should be prompted to attempt signing in with Google again.
 */
export const AUTH_OAUTH_INVALID_TOKEN = 'AUTH_OAUTH_INVALID_TOKEN' as const;

/**
 * A Google account already exists for this email, but the account is not
 * linked to Google sign-in. The user should be asked to log in with
 * their password to complete the linking process.
 */
export const AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS =
  'AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS' as const;

/**
 * The Google account's email requires linking to an existing password-based
 * account. The user should be directed to use an existing supported
 * login path.
 */
export const AUTH_OAUTH_LINKING_REQUIRED = 'AUTH_OAUTH_LINKING_REQUIRED' as const;

/**
 * Type-level aliases so callers can use these in switch statements
 * and exhaustive checks without casting.
 */
export type GoogleOAuthErrorCode =
  | typeof AUTH_OAUTH_INVALID_TOKEN
  | typeof AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS
  | typeof AUTH_OAUTH_LINKING_REQUIRED;

/**
 * All OAuth error codes — useful for exhaustive checks and test fixtures.
 */
export const GOOGLE_OAUTH_ERROR_CODES = Object.freeze([
  AUTH_OAUTH_INVALID_TOKEN,
  AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS,
  AUTH_OAUTH_LINKING_REQUIRED,
] as const);
