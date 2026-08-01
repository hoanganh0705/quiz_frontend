/**
 * Sentry capture helper — minimal shim for Epic 3.2 / D6.
 *
 * Source epic:   Epic 3.2 — Cursor pagination primitive.
 * Source ticket: TKT-3.2.D6 — cursor-decode Sentry capture.
 *
 * This file is the single seam between the application's hooks / fetcher
 * wrappers and the underlying observability SDK. Today there is no Sentry
 * SDK in the project (it is added in a later epic), so the default
 * capture is a no-op that does nothing. When the SDK is introduced,
 * this file is the only place that needs to be updated to route the
 * capture calls through it.
 *
 * Contract (locked by D6 AC #3):
 *
 *   1. `captureException(error, { tags: { surface, reason } })` is the
 *      single export. Callers MUST pass `{ tags }` so the telemetry
 *      dashboard can group the reports by surface.
 *   2. The default behaviour is a no-op when the Sentry SDK is absent
 *      or initialised. The function never throws; it swallows any SDK
 *      errors silently (an observability call should never break the
 *      application code path).
 *   3. In test environments the no-op behaviour is indistinguishable
 *      from production-without-Sentry, so the hook test does not
 *      require a SDK stub.
 *
 * What this file deliberately does NOT do:
 *
 *   - It does not import `@sentry/react`, `@sentry/nextjs`, or any
 *     other SDK. Adding the SDK is a separate ticket; this file is
 *     the integration seam.
 *   - It does not queue reports on `window.__SENTRY__`-style globals.
 *     If a future ticket wires the SDK, that wiring lives here.
 *
 * Naming convention: a `surface` is the user-facing area of the app
 * the report came from (e.g. `'useCursorPaginated'`, `'AuthForm'`).
 * A `reason` is the narrow cause within the surface
 * (e.g. `'cursor-decode'`, `'rate-limit-exhausted'`). The convention is
 * documented here so future tickets can adopt it consistently.
 */

export interface CaptureContext {
  /**
   * Tags to attach to the captured event. Convention: `{ surface,
   * reason }` for hook-level reports. Tags must be string-coercible;
   * numbers and booleans are rejected with a console.warn to avoid
   * the SDK's silent stringification.
   */
  tags?: Readonly<Record<string, string>>;
  /**
   * Additional structured context — see the Sentry SDK docs for the
   * shape. Not used today; declared for forward compatibility.
   */
  contexts?: Readonly<Record<string, unknown>>;
}

/**
 * Capture an exception with structured context. No-op when the SDK is
 * absent (the default in this project) or when the SDK is initialised
 * but the call fails internally.
 *
 * @example
 *   captureException(new Error('cursor decode failure'), {
 *     tags: { surface: 'useCursorPaginated', reason: 'cursor-decode' }
 *   })
 */
export function captureException(
  error: unknown,
  context?: CaptureContext
): void {
  // No-op. The `void` bindings below keep the parameters referenced
  // (the SDK import will replace them with real calls; the binding
  // shape stays the same).
  void error;
  void context;
}

/**
 * Internal: the tag values pre-defined for the Epic 3.2 hooks. Future
 * tickets add new surfaces / reasons here so the contract has a
 * single grep target.
 */
export const CAPTURE_SURFACES = {
  useCursorPaginated: 'useCursorPaginated'
} as const;

export const CAPTURE_REASONS = {
  cursorDecode: 'cursor-decode'
} as const;

export type CaptureSurface =
  (typeof CAPTURE_SURFACES)[keyof typeof CAPTURE_SURFACES];

export type CaptureReason =
  (typeof CAPTURE_REASONS)[keyof typeof CAPTURE_REASONS];
