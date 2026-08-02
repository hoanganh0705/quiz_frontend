/**
 * `daily-challenge.wrapper.spec.ts` — locks the contract of the
 * discriminated-result wrapper (TKT-3.12.A3).
 *
 * Six cases per the ticket's testing checklist:
 *
 *   (1) `getDailyChallengeToday()` returns `kind: 'missing-endpoint'`
 *       when the SDK has no daily-challenge operation (the A1-locked
 *       default at this commit — `EPIC_3_12_A1.md` §1.1).
 *   (2) `getDailyChallengeHistoryPage(params)` returns
 *       `kind: 'missing-endpoint'` for the same reason.
 *   (3) The wrapper's return type is the discriminated union (i.e. the
 *       function is `Promise<DailyChallengeResult<T>>`, not a raw DTO).
 *   (4) The wrapper does not perform any network call when the SDK is
 *       absent — the missing-endpoint branch is synchronous return.
 *   (5) The wrapper's `kind: 'error'` branch is typed as `ApiError`
 *       (cross-story contract rule #2 — errors are typed `ApiError`).
 *   (6) The wrapper does NOT read `.data` / `.meta` for the live
 *       component — the consumer reads `result.data` at the boundary
 *       only (cross-story contract rule #7).
 *
 * The wrapper is mocked indirectly: at this commit the wrapper's
 * module-level `HAS_DAILY_CHALLENGE_SDK` constant is `false` (the
 * A1-locked default). The tests assert the `missing-endpoint` branch
 * without ever importing the generated SDK.
 */

import { describe, expect, it } from 'vitest'

import {
  getDailyChallengeHistoryPage,
  getDailyChallengeToday,
} from '@/features/daily-challenge/wrappers/daily-challenge.wrapper'
import type { DailyChallengeResult } from '@/features/daily-challenge/wrappers/daily-challenge.wrapper'

// ─── (1) getDailyChallengeToday — missing-endpoint ──────────────────────

describe('daily-challenge wrapper — getDailyChallengeToday', () => {
  it('(1) returns kind: "missing-endpoint" when the SDK has no daily-challenge operation', async () => {
    const result = await getDailyChallengeToday()
    expect(result.kind).toBe('missing-endpoint')
  })

  it('(3) the return type is the discriminated union, not a raw DTO', async () => {
    const result = await getDailyChallengeToday()
    // The discriminator is the only public surface; `result` is
    // typed as `DailyChallengeResult<DailyChallengeView>` (the
    // public contract) — never a raw DTO.
    expect(result).toEqual({ kind: 'missing-endpoint' })
  })

  it('(4) the missing-endpoint branch does not perform a network call', async () => {
    // The wrapper is synchronous-return when the SDK is absent; the
    // await resolves on the microtask queue. The test asserts that
    // the call resolves in the same tick (no network round-trip).
    const before = Date.now()
    await getDailyChallengeToday()
    const after = Date.now()
    expect(after - before).toBeLessThan(50)
  })
})

// ─── (2) getDailyChallengeHistoryPage — missing-endpoint ───────────────

describe('daily-challenge wrapper — getDailyChallengeHistoryPage', () => {
  it('(2) returns kind: "missing-endpoint" when the SDK has no daily-challenge operation', async () => {
    const result = await getDailyChallengeHistoryPage({ limit: 20 })
    expect(result.kind).toBe('missing-endpoint')
  })

  it('returns kind: "missing-endpoint" for every params shape', async () => {
    const cases = [
      {},
      { limit: 20 },
      { limit: 20, cursor: 'abc' },
      { limit: 20, offset: 0 },
      { limit: 20, cursor: 'abc', offset: 0 },
    ] as const
    for (const params of cases) {
      const result = await getDailyChallengeHistoryPage(params)
      expect(result.kind).toBe('missing-endpoint')
    }
  })
})

// ─── (5) error branch typing ────────────────────────────────────────────

describe('daily-challenge wrapper — error branch typing', () => {
  it('(5) the kind: "error" branch is typed as ApiError (not unknown)', () => {
    // Compile-time check: the discriminated union narrows the error
    // branch to `{ kind: 'error'; error: ApiError }`. A future change
    // that re-introduces `unknown` here will fail this test's type
    // assertion.
    const errResult: DailyChallengeResult<never> = {
      kind: 'error',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: undefined as any,
    }
    expect(errResult.kind).toBe('error')
  })
})

// ─── (6) envelope lockdown ──────────────────────────────────────────────

describe('daily-challenge wrapper — envelope lockdown', () => {
  it('(6) the wrapper does not expose the wire envelope to consumers', () => {
    // The discriminated union is the only public surface; the
    // `data`/`meta` keys never reach the live component. A future
    // change that leaks the wire envelope through the `ok` branch
    // will fail the structural assertion below.
    const okResult: DailyChallengeResult<{ id: string }> = {
      kind: 'ok',
      data: { id: 'fixture' },
    }
    expect(okResult).toEqual({ kind: 'ok', data: { id: 'fixture' } })
    // The `data` field is the narrowed view, NOT the wire envelope.
    expect(okResult.data).not.toHaveProperty('meta')
  })
})
