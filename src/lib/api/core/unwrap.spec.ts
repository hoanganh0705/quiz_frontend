/**
 * Envelope-unwrap helper contract suite.
 *
 * Source epic: Epic 1.4 — Custom Instance Hardening.
 * Source ticket: TKT-1.4.4.5.
 *
 * Round-trips six fixture payloads through `unwrapEnvelope` and asserts
 * each of the four documented cases plus two edge cases:
 *
 *   1. { data: <T>, meta: {...} }       → <T>      (envelope present, unwrapped)
 *   2. { data: null }                  → null     (null data preserved)
 *   3. { data: [...] }                 → [...]    (paginated list — meta.pagination is a sibling, not unwrapped)
 *   4. <primitive>                     → <primitive> unchanged (defensive)
 *   5. null                            → null     (null payload preserved)
 *   6. { foo: 'bar' }                  → { foo: 'bar' } (no envelope, passes through)
 *
 * Also runs an integration check that fires a stubbed axios response
 * through `customInstance` and asserts `response.data` is the unwrapped
 * value (proves TKT-1.4.4.3's migration is behaviour-preserving).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';

import { unwrapEnvelope } from './unwrap';
import { customInstance } from './custom-instance';

describe('unwrapEnvelope — four-case contract', () => {
  it('case 1: object with data key unwraps to inner value', () => {
    const input = { data: { foo: 'bar' }, meta: { requestId: 'req-1' } };
    const result = unwrapEnvelope(input);
    expect(result).toEqual({ foo: 'bar' });
  });

  it('case 2: { data: null } unwraps to null (preserves null inner)', () => {
    const input = { data: null, meta: {} };
    const result = unwrapEnvelope(input);
    expect(result).toBeNull();
  });

  it('case 3: paginated list — returns the array, meta.pagination is sibling', () => {
    const input = {
      data: [1, 2, 3],
      meta: { pagination: { total: 100, page: 1 } },
    };
    const result = unwrapEnvelope(input);
    expect(result).toEqual([1, 2, 3]);
  });

  it('case 4: non-object payload is returned unchanged', () => {
    expect(unwrapEnvelope(42)).toBe(42);
    expect(unwrapEnvelope('hello')).toBe('hello');
    expect(unwrapEnvelope(true)).toBe(true);
    expect(unwrapEnvelope(false)).toBe(false);
  });

  it('case 5: null payload returns null (does not throw)', () => {
    expect(unwrapEnvelope(null)).toBeNull();
  });

  it('case 6: object without data key passes through unchanged', () => {
    const input = { foo: 'bar' };
    const result = unwrapEnvelope(input);
    expect(result).toEqual({ foo: 'bar' });
  });

  it('edge: undefined payload returns null', () => {
    expect(unwrapEnvelope(undefined)).toBeNull();
  });

  it('edge: nested envelope is unwrapped only one level (does not recurse)', () => {
    // The helper does one-level unwrap. A nested { data: { data: ... } }
    // returns the inner { data: ... } — the caller decides if they want
    // to unwrap again.
    const input = { data: { data: 'inner' } };
    const result = unwrapEnvelope(input);
    expect(result).toEqual({ data: 'inner' });
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
    // Type-level: result is User | null | unknown at runtime.
    // Runtime: result is the User object.
    expect(result).toEqual({ id: 'user-1', email: 'u@example.com' });
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

  it('success interceptor unwraps { data } envelopes', async () => {
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

    // The interceptor replaced `response.data` with the inner payload.
    expect(response.data).toEqual({ id: 'user-1', email: 'u@example.com' });
  });
});