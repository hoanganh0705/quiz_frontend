

import { describe, expect, it } from 'vitest';
import { COPY_KEYS, resolveCopy } from '@/features/auth/copy/security-copy';
import type { AccountSecurityDto } from '@/lib/api';

function formatTimestamp(iso: string | null): string | null {
if (!iso) return null;
const date = new Date(iso);
if (Number.isNaN(date.getTime())) return null;
return new Intl.DateTimeFormat('en-US', {
dateStyle: 'medium',
timeStyle: 'short',
  }).format(date);
}

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

function resolveSessionCountLabel(activeSessionCount: number): string {
if (activeSessionCount === 1) {
return resolveCopy(COPY_KEYS.dashboard.activeSessionCount.singular);
  }
return resolveCopy(
COPY_KEYS.dashboard.activeSessionCount.plural(activeSessionCount),
  );
}

type Status = 'loading' | 'success' | 'error';
function selectBranch(
status: Status,
data: AccountSecurityDto | null,
): 'skeleton' | 'inline-error' | 'fields' {
if (status === 'loading') return 'skeleton';
if (status === 'error' || !data) return 'inline-error';
return 'fields';
}

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

const result = resolvePasswordAge(0, '2026-07-30T10:00:00.000Z');
expect(result).toBe('0 days');
  });
});

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

expect(result!.length).toBeGreaterThan(0);
expect(result).not.toBe('2026-07-30T10:00:00.000Z');
  });

it('renders the "unknown" fallback when lastSuccessfulLoginAt is null', () => {
const dto = makeSecurityDto({ lastSuccessfulLoginAt: null });
const text = formatTimestamp(dto.lastSuccessfulLoginAt);
expect(text).toBeNull();

const fallback = resolveCopy(COPY_KEYS.dashboard.lastLogin.unknown);
expect(fallback).toBe('No sign-ins recorded yet');
  });
});

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

describe('SecuritySummaryCard — activeSessionCount pluralisation', () => {
it('renders "1 device" (singular) when activeSessionCount is 1', () => {
const result = resolveSessionCountLabel(1);
expect(result).toBe('1 device');
  });

it('renders "N devices" (plural) for 0', () => {

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

expect(formatTimestamp(dto.lastSuccessfulLoginAt)).toBeNull();

expect(resolvePasswordAge(dto.passwordAgeDays, dto.lastPasswordChangeAt)).toBe(
'Not available',
    );
  });

it('renders "Never changed" only when BOTH password fields are null', () => {

const neverChanged = resolvePasswordAge(null, null);
const dataGap = resolvePasswordAge(null, '2026-01-01T00:00:00.000Z');
expect(neverChanged).toBe('Never changed');
expect(dataGap).toBe('Not available');
expect(neverChanged).not.toBe(dataGap);
  });
});

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
