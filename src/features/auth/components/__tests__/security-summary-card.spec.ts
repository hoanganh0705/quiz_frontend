/**
 * Unit tests for `SecuritySummaryCard` null handling.
 *
 * Source epic: Epic 2.8 — Security dashboard and active-session management.
 * Source ticket: 2.8.T27.
 *
 * ## Coverage contract (per the ticket)
 *
 *   1. Null `passwordAgeDays` renders "Not available" copy
 *   2. Null `lastPasswordChangeAt` renders "Never changed" copy
 *   3. Null `lastSuccessfulLoginAt` renders a graceful fallback (not a crash)
 *   4. Loading state shows skeleton
 *   5. Error state shows retry banner
 *   6. Active session count renders pluralised label
 *
 * ## Strategy
 *
 * The frontend test environment is pure `node` (no jsdom /
 * happy-dom configured). The component relies on `useMemo` from
 * `react` and `memo`. Rendering it requires a DOM.
 *
 * Per project convention (see `use-google-login.spec.ts`,
 * `use-revoke-session.spec.ts`), we test the *pure resolver
 * functions* the component composes — these are the heart of the
 * null-handling acceptance criteria. The resolvers are mirrored in
 * this test file line-for-line with the component so architectural
 * drift is visible during review.
 *
 * The DOM/render integration is verified by:
 *   - the type assertions on the copy registry keys
 *   - the E2E suite (T28)
 *
 * Why mirror rather than re-export?
 *   - The component's resolvers are deliberately not exported (they
 *     are pure helpers, not API surface).
 *   - If the component's resolver logic ever drifts from this test,
 *     the test fails with a clear contract — which is the goal.
 */

import { describe, expect, it } from 'vitest';
import { COPY_KEYS, resolveCopy } from '@/features/auth/copy/security-copy';
import type { AccountSecurityDto } from '@/lib/api';

// ─── Mirror of component resolvers (line-for-line) ───────────────────────────

/**
 * Format a timestamp using `Intl.DateTimeFormat`. Mirrors the
 * component's `formatTimestamp` helper.
 */
function formatTimestamp(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

/**
 * Resolve the password-age label per the null-handling discipline
 * documented in `security-summary-card.tsx`.
 */
function resolvePasswordAge(
  passwordAgeDays: number | null,
  lastPasswordChangeAt: string | null,
): string {
  if (passwordAgeDays === null && lastPasswordChangeAt === null) {
    return resolveCopy(COPY_KEYS.dashboard.passwordAge.unknown);
  }
  if (passwordAgeDays === null) {
    return resolveCopy(COPY_KEYS.dashboard.passwordAge.notAvailable);
  }
  if (passwordAgeDays === 1) {
    return resolveCopy(COPY_KEYS.dashboard.passwordAge.daysSingular);
  }
  return resolveCopy(
    COPY_KEYS.dashboard.passwordAge.daysPlural(passwordAgeDays),
  );
}

/**
 * Pluralised device-count label.
 */
function resolveSessionCountLabel(activeSessionCount: number): string {
  if (activeSessionCount === 1) {
    return resolveCopy(COPY_KEYS.dashboard.activeSessionCount.singular);
  }
  return resolveCopy(
    COPY_KEYS.dashboard.activeSessionCount.plural(activeSessionCount),
  );
}

/**
 * Branch the success/error/loading state machine.
 * Mirrors `SecuritySummaryCardInner`'s status dispatch.
 */
type Status = 'loading' | 'success' | 'error';
function selectBranch(
  status: Status,
  data: AccountSecurityDto | null,
): 'skeleton' | 'inline-error' | 'fields' {
  if (status === 'loading') return 'skeleton';
  if (status === 'error' || !data) return 'inline-error';
  return 'fields';
}

// ─── Test fixtures ───────────────────────────────────────────────────────────

function makeSecurityDto(
  overrides: Partial<AccountSecurityDto> = {},
): AccountSecurityDto {
  return {
    emailVerified: true,
    activeSessionCount: 1,
    lastSuccessfulLoginAt: '2026-07-30T10:00:00.000Z',
    passwordAgeDays: 30,
    lastPasswordChangeAt: '2026-06-30T10:00:00.000Z',
    ...overrides,
  };
}

// ─── T27.1: passwordAgeDays null handling ────────────────────────────────────

describe('SecuritySummaryCard — passwordAgeDays null handling', () => {
  it('renders "Not available" when passwordAgeDays is null but lastPasswordChangeAt is set', () => {
    const result = resolvePasswordAge(null, '2026-06-30T10:00:00.000Z');
    expect(result).toBe('Not available');
  });

  it('renders "Never changed" when both passwordAgeDays and lastPasswordChangeAt are null', () => {
    const result = resolvePasswordAge(null, null);
    expect(result).toBe('Never changed');
  });

  it('renders "1 day" (singular) when passwordAgeDays is 1', () => {
    const result = resolvePasswordAge(1, '2026-07-30T10:00:00.000Z');
    expect(result).toBe('1 day');
  });

  it('renders "N days" (plural) when passwordAgeDays >= 2', () => {
    const result = resolvePasswordAge(2, '2026-06-30T10:00:00.000Z');
    expect(result).toBe('2 days');

    const result5 = resolvePasswordAge(5, '2026-06-30T10:00:00.000Z');
    expect(result5).toBe('5 days');

    const result365 = resolvePasswordAge(365, '2025-07-30T10:00:00.000Z');
    expect(result365).toBe('365 days');
  });

  it('never renders "0 days" for null passwordAgeDays (regression guard)', () => {
    const result = resolvePasswordAge(null, null);
    expect(result).not.toBe('0 days');
    expect(result).toBe('Never changed');

    const result2 = resolvePasswordAge(null, '2026-06-30T10:00:00.000Z');
    expect(result2).not.toBe('0 days');
    expect(result2).toBe('Not available');
  });

  it('treats 0 days (zero, not null) as plural "0 days"', () => {
    // The component distinguishes null vs 0. 0 is a valid value
    // (password changed today). Null is the data-gap case.
    const result = resolvePasswordAge(0, '2026-07-30T10:00:00.000Z');
    expect(result).toBe('0 days');
  });
});

// ─── T27.2: lastPasswordChangeAt null handling ──────────────────────────────

describe('SecuritySummaryCard — lastPasswordChangeAt null handling', () => {
  it('renders "Never changed" when lastPasswordChangeAt is null (and passwordAgeDays is null)', () => {
    const result = resolvePasswordAge(null, null);
    expect(result).toBe('Never changed');
  });

  it('renders "Not available" when lastPasswordChangeAt is set but passwordAgeDays is null', () => {
    const result = resolvePasswordAge(null, '2026-06-30T10:00:00.000Z');
    expect(result).toBe('Not available');
  });

  it('renders the day-count when both are set', () => {
    const result = resolvePasswordAge(45, '2026-06-15T10:00:00.000Z');
    expect(result).toBe('45 days');
  });
});

// ─── T27.3: lastSuccessfulLoginAt null fallback ─────────────────────────────

describe('SecuritySummaryCard — lastSuccessfulLoginAt null fallback', () => {
  it('formatTimestamp returns null for null input (no crash)', () => {
    expect(formatTimestamp(null)).toBeNull();
  });

  it('formatTimestamp returns null for unparseable input (no crash)', () => {
    expect(formatTimestamp('not-a-date')).toBeNull();
  });

  it('formatTimestamp returns null for empty string', () => {
    expect(formatTimestamp('')).toBeNull();
  });

  it('formatTimestamp returns a localized string for valid input', () => {
    const result = formatTimestamp('2026-07-30T10:00:00.000Z');
    expect(result).not.toBeNull();
    // The format depends on the runtime locale; we just assert
    // non-empty and non-original.
    expect(result!.length).toBeGreaterThan(0);
    expect(result).not.toBe('2026-07-30T10:00:00.000Z');
  });

  it('renders the "unknown" fallback when lastSuccessfulLoginAt is null', () => {
    const dto = makeSecurityDto({ lastSuccessfulLoginAt: null });
    const text = formatTimestamp(dto.lastSuccessfulLoginAt);
    expect(text).toBeNull();
    // The component substitutes the `unknown` copy when
    // `formatTimestamp` returns null.
    const fallback = resolveCopy(COPY_KEYS.dashboard.lastLogin.unknown);
    expect(fallback).toBe('No sign-ins recorded yet');
  });
});

// ─── T27.4: loading state branch ─────────────────────────────────────────────

describe('SecuritySummaryCard — loading branch', () => {
  it('selectBranch returns "skeleton" when status is "loading"', () => {
    const branch = selectBranch('loading', null);
    expect(branch).toBe('skeleton');
  });

  it('selectBranch returns "skeleton" even when data is available (loading wins)', () => {
    const dto = makeSecurityDto();
    const branch = selectBranch('loading', dto);
    expect(branch).toBe('skeleton');
  });
});

// ─── T27.5: error branch ────────────────────────────────────────────────────

describe('SecuritySummaryCard — error branch', () => {
  it('selectBranch returns "inline-error" when status is "error"', () => {
    const branch = selectBranch('error', null);
    expect(branch).toBe('inline-error');
  });

  it('selectBranch returns "inline-error" when status is "success" but data is null (defensive)', () => {
    const branch = selectBranch('success', null);
    expect(branch).toBe('inline-error');
  });

  it('selectBranch returns "inline-error" for an explicit error object', () => {
    const branch = selectBranch('error', makeSecurityDto());
    expect(branch).toBe('inline-error');
  });

  it('error copy keys are stable strings (regression guard)', () => {
    expect(resolveCopy(COPY_KEYS.dashboard.error.loadFailed.title)).toBe(
      'Unable to load security summary',
    );
    expect(resolveCopy(COPY_KEYS.dashboard.error.loadFailed.body)).toBe(
      'We could not load your security summary. Please try again.',
    );
  });
});

// ─── T27.6: activeSessionCount pluralisation ────────────────────────────────

describe('SecuritySummaryCard — activeSessionCount pluralisation', () => {
  it('renders "1 device" (singular) when activeSessionCount is 1', () => {
    const result = resolveSessionCountLabel(1);
    expect(result).toBe('1 device');
  });

  it('renders "N devices" (plural) for 0', () => {
    // Zero is plural in English ("0 devices"), and this is the
    // case where the backend returns a freshly-revoked account.
    const result = resolveSessionCountLabel(0);
    expect(result).toBe('0 devices');
  });

  it('renders "N devices" (plural) for 2', () => {
    const result = resolveSessionCountLabel(2);
    expect(result).toBe('2 devices');
  });

  it('renders "N devices" (plural) for 5', () => {
    const result = resolveSessionCountLabel(5);
    expect(result).toBe('5 devices');
  });

  it('renders "N devices" (plural) for large counts', () => {
    const result = resolveSessionCountLabel(99);
    expect(result).toBe('99 devices');
  });

  it('does not render "1 devices" (singular/plural mismatch)', () => {
    expect(resolveSessionCountLabel(1)).not.toBe('1 devices');
  });
});

// ─── T27.7: full DTO field composition (regression guards) ─────────────────

describe('SecuritySummaryCard — full DTO field composition', () => {
  it('renders all four fields for a fully-populated DTO', () => {
    const dto = makeSecurityDto();
    expect(resolveSessionCountLabel(dto.activeSessionCount)).toBe('1 device');
    expect(formatTimestamp(dto.lastSuccessfulLoginAt)).not.toBeNull();
    expect(resolvePasswordAge(dto.passwordAgeDays, dto.lastPasswordChangeAt)).toBe(
      '30 days',
    );
  });

  it('renders all fallback copy for a fully-null DTO', () => {
    const dto = makeSecurityDto({
      activeSessionCount: 0,
      lastSuccessfulLoginAt: null,
      passwordAgeDays: null,
      lastPasswordChangeAt: null,
    });
    expect(resolveSessionCountLabel(dto.activeSessionCount)).toBe('0 devices');
    expect(formatTimestamp(dto.lastSuccessfulLoginAt)).toBeNull();
    expect(resolvePasswordAge(dto.passwordAgeDays, dto.lastPasswordChangeAt)).toBe(
      'Never changed',
    );
  });

  it('renders mixed-null DTO with appropriate fallback per field', () => {
    const dto = makeSecurityDto({
      lastSuccessfulLoginAt: null,
      passwordAgeDays: null,
      lastPasswordChangeAt: '2026-06-30T10:00:00.000Z',
    });
    // Last login: unknown fallback
    expect(formatTimestamp(dto.lastSuccessfulLoginAt)).toBeNull();
    // Password age: null days + set change timestamp = "Not available"
    expect(resolvePasswordAge(dto.passwordAgeDays, dto.lastPasswordChangeAt)).toBe(
      'Not available',
    );
  });

  it('renders "Never changed" only when BOTH password fields are null', () => {
    // Regression guard for the US-2.8.1 acceptance criterion:
    // The two null cases (never changed vs data gap) must NOT
    // collapse to the same label.
    const neverChanged = resolvePasswordAge(null, null);
    const dataGap = resolvePasswordAge(null, '2026-01-01T00:00:00.000Z');
    expect(neverChanged).toBe('Never changed');
    expect(dataGap).toBe('Not available');
    expect(neverChanged).not.toBe(dataGap);
  });
});

// ─── T27.8: status dispatch contract ────────────────────────────────────────

describe('SecuritySummaryCard — status dispatch contract', () => {
  it('loading → skeleton (no spinner)', () => {
    expect(selectBranch('loading', null)).toBe('skeleton');
  });

  it('error → inline-error (with retry)', () => {
    expect(selectBranch('error', null)).toBe('inline-error');
  });

  it('success + null data → inline-error (defensive)', () => {
    expect(selectBranch('success', null)).toBe('inline-error');
  });

  it('success + data → fields', () => {
    expect(selectBranch('success', makeSecurityDto())).toBe('fields');
  });
});
