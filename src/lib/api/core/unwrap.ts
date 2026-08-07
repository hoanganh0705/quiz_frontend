/**
 * Envelope-unwrap helper.
 *
 * Source epic: Epic 1.4 — Custom Instance Hardening.
 * Source ticket: TKT-1.4.4.2.
 *
 * The backend wraps every successful response in a `{ data, meta }` envelope:
 *
 *   { "data": <T>, "meta": { ... } }
 *
 * Axios's response interceptor surfaces this envelope as `response.data`,
 * forcing callers to write `response.data.data` everywhere. This helper
 * performs the one-level unwrap so that the interceptor can do
 *
 *   response.data = unwrapEnvelope(response.data);
 *
 * and callers see the inner payload directly.
 *
 * ## Contract (four cases)
 *
 * 1. `payload` is `null` or `undefined` → returns `null`. (Backend emits
 *    `data: null` for some endpoints; the helper preserves that null
 *    rather than throwing on `payload.data` access.)
 * 2. `payload` is not an object (number, string, boolean) → returns
 *    `payload` unchanged. (Should never happen on the wire because the
 *    backend always wraps, but the contract covers defensive code paths.)
 * 3. `payload` is an object with a `data` key → returns `payload.data`.
 *    The returned value may itself be `null`, an array, or an object.
 * 4. `payload` is an object without a `data` key → returns `payload`
 *    unchanged. (Pre-envelope DTOs, or 4xx responses that do not carry
 *    the envelope, pass through.)
 *
 * ## Discriminated return type (TKT-7.5 cleanup, Phase 5 / P0-18)
 *
 * The previous implementation returned `T | null | unknown`, which forced
 * every caller to either cast or `as` the result. The contract is now
 * represented as a discriminated union so callers can narrow on the
 * `kind` discriminator and receive a tightly-typed payload.
 *
 *   - `kind: 'null'`         → the payload was null/undefined; no value.
 *   - `kind: 'primitive'`    → the payload was a primitive (defensive
 *                              case 2); the value is the payload itself.
 *   - `kind: 'envelope'`     → the payload had a `data` key (case 3);
 *                              the value is the unwrapped inner payload
 *                              (typed `T | null`).
 *   - `kind: 'passthrough'`  → the payload had no `data` key (case 4);
 *                              the value is the payload itself.
 *
 * A flat (`T | null`) helper is also exported as `unwrapEnvelopeValue`
 * for the common, hot-path case where the caller is sure the wire is
 * always `{ data: T | null }` and the four-case discrimination is
 * unnecessary noise. The two helpers compose — `unwrapEnvelopeValue`
 * is implemented in terms of the discriminated `unwrapEnvelope` and
 * returns the inner value for the `envelope` branch (throwing a
 * descriptive `TypeError` for the other branches so misuse is caught
 * at runtime instead of returning a silently wrong value).
 *
 * @example
 *   unwrapEnvelope({ data: { id: 1 }, meta: {} });  // → { kind: 'envelope', value: { id: 1 } }
 *   unwrapEnvelope({ data: null });                  // → { kind: 'envelope', value: null }
 *   unwrapEnvelope({ data: [1, 2, 3], meta: { ... } }); // → { kind: 'envelope', value: [1, 2, 3] }
 *   unwrapEnvelope(null);                            // → { kind: 'null' }
 *   unwrapEnvelope(42);                              // → { kind: 'primitive', value: 42 }
 *   unwrapEnvelope({ foo: 'bar' });                  // → { kind: 'passthrough', value: { foo: 'bar' } }
 */

// ─── Discriminated return union ──────────────────────────────────────────

/**
 * Discriminator for the four contract cases documented above.
 */
export type UnwrapEnvelopeKind =
  | 'null'
  | 'primitive'
  | 'envelope'
  | 'passthrough';

export type UnwrapEnvelopeResult<T> =
  | { readonly kind: 'null' }
  | { readonly kind: 'primitive'; readonly value: unknown }
  | { readonly kind: 'envelope'; readonly value: T | null }
  | { readonly kind: 'passthrough'; readonly value: unknown };

/**
 * Discriminated unwrap. See the file-level doc for the four cases
 * and the `kind` discriminator semantics.
 */
export function unwrapEnvelope<T = unknown>(payload: unknown): UnwrapEnvelopeResult<T> {
  if (payload === null || payload === undefined) {
    return { kind: 'null' };
  }

  if (typeof payload !== 'object') {
    return { kind: 'primitive', value: payload };
  }

  if ('data' in payload) {
    return { kind: 'envelope', value: (payload as { data: T | null }).data };
  }

  return { kind: 'passthrough', value: payload };
}

// ─── Narrow helpers (P0-20 companion) ─────────────────────────────────────

/**
 * Type-guard for `kind: 'envelope'`. Narrows the discriminated
 * result so the caller can read `.value` as `T | null` without a
 * type assertion.
 */
export function isEnvelopeResult<T>(
  result: UnwrapEnvelopeResult<T>,
): result is { readonly kind: 'envelope'; readonly value: T | null } {
  return result.kind === 'envelope';
}

/**
 * Type-guard for `kind: 'null'`. Useful for callers that want to
 * short-circuit when the wire returned `null` / `undefined`.
 */
export function isNullResult<T>(
  result: UnwrapEnvelopeResult<T>,
): result is { readonly kind: 'null' } {
  return result.kind === 'null';
}

// ─── Flat helper (preserves the legacy `T | null` ergonomics) ────────────

/**
 * Flat unwrap. Returns the inner payload for the `envelope` case;
 * throws a descriptive `TypeError` for the other three branches so
 * misuse is caught at runtime instead of returning a silently wrong
 * value.
 *
 * Use this helper when the caller is confident the wire always carries
 * `{ data: T | null }` and the four-case discrimination is unnecessary
 * noise. The discriminated `unwrapEnvelope` is the recommended choice
 * for new code.
 */
export function unwrapEnvelopeValue<T = unknown>(payload: unknown): T | null {
  const result = unwrapEnvelope<T>(payload);
  if (result.kind === 'envelope') return result.value;
  if (result.kind === 'null') return null;
  throw new TypeError(
    `[unwrapEnvelopeValue] expected an envelope-shaped payload ({ data: T | null }) ` +
      `but received kind="${result.kind}". Use \`unwrapEnvelope\` to discriminate ` +
      `the four contract cases instead.`,
  );
}