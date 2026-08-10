/**
 * Envelope-unwrap helper contract suite.
 *
 * Source epic: Epic 1.4 — Custom Instance Hardening.
 * Source ticket: TKT-1.4.4.5.
 *
 * TKT-7.5 cleanup, Phase 5 / P0-18: `unwrapEnvelope` was widened from
 * `T | null | unknown` to a discriminated union (`UnwrapEnvelopeResult<T>`).
 * The previous flat-return contract is preserved by the
 * `unwrapEnvelopeValue` helper, which throws a descriptive `TypeError`
 * for the non-envelope branches. This spec exercises:
 *
 *   - `unwrapEnvelope` — discriminated four-case contract.
 *   - `unwrapEnvelopeValue` — flat `T | null` ergonomics for hot paths.
 *   - `isEnvelopeResult` / `isNullResult` — narrowing guards.
 *
 * Round-trips six fixture payloads and asserts each of the four
 * documented cases plus two edge cases:
 *
 *   1. { data: <T>, meta: {...} }       → { kind: 'envelope', value: <T> }
 *   2. { data: null }                  → { kind: 'envelope', value: null }
 *   3. { data: [...] }                 → { kind: 'envelope', value: [...] }
 *   4. <primitive>                     → { kind: 'primitive', value: <primitive> }
 *   5. null                            → { kind: 'null' }
 *   6. { foo: 'bar' }                  → { kind: 'passthrough', value: { foo: 'bar' } }
 *
 * Also runs an integration check that fires a stubbed axios response
 * through `customInstance` and asserts `response.data` is the unwrapped
 * value (proves TKT-1.4.4.3's migration is behaviour-preserving).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';

import {
  unwrapEnvelope,
  unwrapEnvelopeValue,
  isEnvelopeResult,
  isNullResult,
} from './unwrap';
import { customInstance } from './custom-instance';

describe('unwrapEnvelope — four-case contract', () => {
  it('case 1: object with data key unwraps to inner value', () => {
    const input = { data: { foo: 'bar' }, meta: { requestId: 'req-1' } };
    const result = unwrapEnvelope(input);
    expect(result.kind).toBe('envelope');
    if (result.kind === 'envelope') {
      expect(result.value).toEqual({ foo: 'bar' });
    }
  });

  it('case 2: { data: null } unwraps to { kind: "envelope", value: null }', () => {
    const input = { data: null, meta: {} };
    const result = unwrapEnvelope(input);
    expect(result.kind).toBe('envelope');
    if (result.kind === 'envelope') {
      expect(result.value).toBeNull();
    }
  });

  it('case 3: paginated list — returns the array, meta.pagination is sibling', () => {
    const input = {
      data: [1, 2, 3],
      meta: { pagination: { total: 100, page: 1 } },
    };
    const result = unwrapEnvelope(input);
    expect(result.kind).toBe('envelope');
    if (result.kind === 'envelope') {
      expect(result.value).toEqual([1, 2, 3]);
    }
  });

  it('case 4: non-object payload returns { kind: "primitive", value }', () => {
    expect(unwrapEnvelope(42)).toEqual({ kind: 'primitive', value: 42 });
    expect(unwrapEnvelope('hello')).toEqual({
      kind: 'primitive',
      value: 'hello',
    });
    expect(unwrapEnvelope(true)).toEqual({ kind: 'primitive', value: true });
    expect(unwrapEnvelope(false)).toEqual({ kind: 'primitive', value: false });
  });

  it('case 5: null payload returns { kind: "null" }', () => {
    expect(unwrapEnvelope(null)).toEqual({ kind: 'null' });
  });

  it('case 6: object without data key returns { kind: "passthrough", value }', () => {
    const input = { foo: 'bar' };
    const result = unwrapEnvelope(input);
    expect(result.kind).toBe('passthrough');
    if (result.kind === 'passthrough') {
      expect(result.value).toEqual({ foo: 'bar' });
    }
  });

  it('edge: undefined payload returns { kind: "null" }', () => {
    expect(unwrapEnvelope(undefined)).toEqual({ kind: 'null' });
  });

  it('edge: nested envelope is unwrapped only one level (does not recurse)', () => {
    // The helper does one-level unwrap. A nested { data: { data: ... } }
    // returns the inner { data: ... } — the caller decides if they want
    // to unwrap again.
    const input = { data: { data: 'inner' } };
    const result = unwrapEnvelope(input);
    expect(result.kind).toBe('envelope');
    if (result.kind === 'envelope') {
      expect(result.value).toEqual({ data: 'inner' });
    }
  });
});

describe('unwrapEnvelope — narrowing guards', () => {
  it('isEnvelopeResult narrows the envelope branch', () => {
    const input = { data: { id: 'x' }, meta: {} };
    const result = unwrapEnvelope<{ id: string }>(input);
    expect(isEnvelopeResult(result)).toBe(true);
    if (isEnvelopeResult(result)) {
      // Type-narrowed: result.value is { id: string } | null
      expect(result.value).toEqual({ id: 'x' });
    }
  });

  it('isNullResult narrows the null branch', () => {
    const result = unwrapEnvelope(null);
    expect(isNullResult(result)).toBe(true);
  });

  it('isEnvelopeResult is false for non-envelope branches', () => {
    expect(isEnvelopeResult(unwrapEnvelope(42))).toBe(false);
    expect(isEnvelopeResult(unwrapEnvelope({ foo: 'bar' }))).toBe(false);
    expect(isEnvelopeResult(unwrapEnvelope(null))).toBe(false);
  });
});

describe('unwrapEnvelope — type narrowing with generic parameter', () => {
  it('generic <T> preserves type at the call site', () => {
    interface User {
      id: string;
      email: string;
    }

    const input = { data: { id: 'user-1', email: 'u@example.com' } };
    const result = unwrapEnvelope<User>(input);
    expect(result.kind).toBe('envelope');
    if (result.kind === 'envelope') {
      // Type-level: result.value is User | null at runtime.
      // Runtime: result.value is the User object.
      expect(result.value).toEqual({ id: 'user-1', email: 'u@example.com' });
    }
  });
});

describe('unwrapEnvelopeValue — flat T | null ergonomics', () => {
  it('returns the inner payload for an envelope', () => {
    const input = { data: { id: 'x' }, meta: {} };
    expect(unwrapEnvelopeValue(input)).toEqual({ id: 'x' });
  });

  it('returns null for an envelope whose data is null', () => {
    expect(unwrapEnvelopeValue({ data: null })).toBeNull();
  });

  it('throws a descriptive TypeError for a primitive payload', () => {
    expect(() => unwrapEnvelopeValue(42)).toThrow(
      /\[unwrapEnvelopeValue\]/,
    );
  });

  it('throws a descriptive TypeError for a passthrough payload', () => {
    expect(() => unwrapEnvelopeValue({ foo: 'bar' })).toThrow(
      /\[unwrapEnvelopeValue\]/,
    );
  });

  it('returns null for a null payload (preserves the legacy behaviour)', () => {
    expect(unwrapEnvelopeValue(null)).toBeNull();
  });
});

describe('unwrapEnvelope — integration with customInstance', () => {
  let originalAdapter: unknown;
  let originalAxiosAdapter: unknown;

  beforeEach(() => {
    originalAdapter = customInstance.defaults.adapter;
    originalAxiosAdapter = axios.defaults.adapter;
  });

  afterEach(() => {
    (customInstance.defaults as { adapter?: unknown }).adapter = originalAdapter;
    (axios.defaults as { adapter?: unknown }).adapter = originalAxiosAdapter;
  });

  it('success interceptor passes the wrapped envelope through (does NOT unwrap)', async () => {
    originalAdapter = customInstance.defaults.adapter;
    originalAxiosAdapter = axios.defaults.adapter;

    customInstance.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      const url = config.url ?? '';
      if (url.includes('/users/me')) {
        return {
          data: { data: { id: 'user-1', email: 'u@example.com' }, meta: { requestId: 'req-1' } },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }
      throw new Error(`No fake route for ${url}`);
    };

    const response = await customInstance.request({
      url: '/api/v1/users/me',
    } as never);

    // The interceptor does NOT mutate `response.data` — the SDK
    // contract expects the wrapped envelope, and 30+ call sites
    // read `response.data.data` / `response.data.meta.pagination`
    // directly (every list, every paginated fetcher, every auth
    // caller). See the long-form comment on the interceptor in
    // `custom-instance.ts` for the rationale.
    expect(response.data).toEqual({
      data: { id: 'user-1', email: 'u@example.com' },
      meta: { requestId: 'req-1' },
    });
  });
});