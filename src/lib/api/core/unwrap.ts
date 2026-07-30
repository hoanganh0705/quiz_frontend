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
 * The function is generic `<T>` so callers can specify the expected inner
 * type. The return type widens to `T | null | unknown` because:
 *
 * - case 1 returns `null`;
 * - case 3 may return `T`, `null`, an array, or any object;
 * - cases 2 and 4 return `unknown` (a value of arbitrary shape).
 *
 * Callers that need a narrower type should narrow with their own type
 * guard at the use site (orval-generated SDKs provide per-endpoint
 * type narrowing).
 *
 * @example
 *   unwrapEnvelope({ data: { id: 1 }, meta: {} });  // → { id: 1 }
 *   unwrapEnvelope({ data: null });                  // → null
 *   unwrapEnvelope({ data: [1, 2, 3], meta: { ... } }); // → [1, 2, 3]
 *   unwrapEnvelope(null);                            // → null
 *   unwrapEnvelope(42);                              // → 42
 *   unwrapEnvelope({ foo: 'bar' });                  // → { foo: 'bar' }
 */

export function unwrapEnvelope<T = unknown>(payload: unknown): T | null | unknown {
  if (payload === null || payload === undefined) {
    return null;
  }

  if (typeof payload !== 'object') {
    return payload;
  }

  if ('data' in payload) {
    return (payload as { data: T | null | unknown }).data;
  }

  return payload;
}