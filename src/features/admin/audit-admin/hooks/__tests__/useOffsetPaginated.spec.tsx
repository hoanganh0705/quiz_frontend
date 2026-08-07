/**
 * `useOffsetPaginated.spec.ts` — useOffsetPaginated hook tests.
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.I2.
 *
 * TKT-7.5 cleanup, Phase 5 / P1-2: the hook was renamed to
 * `useOffsetPaginatedAuditLogs`; the old `useOffsetPaginated` name is
 * still exported as a back-compat re-export, so the spec exercises
 * both names.
 */

import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  useOffsetPaginatedAuditLogs,
  useOffsetPaginated,
} from '../useOffsetPaginatedAuditLogs';

describe('useOffsetPaginatedAuditLogs', () => {
  // ─── Initial state ──────────────────────────────────────────────────

  it('starts at offset 0 with default limit', () => {
    const { result } = renderHook(() =>
      useOffsetPaginatedAuditLogs({
        total: 100,
      }),
    );

    expect(result.current.offset).toBe(0);
    expect(result.current.limit).toBe(20);
    expect(result.current.page).toBe(1);
  });

  it('respects initialOffset and initialLimit', () => {
    const { result } = renderHook(() =>
      useOffsetPaginatedAuditLogs({
        total: 100,
        initialOffset: 40,
        initialLimit: 10,
      }),
    );

    expect(result.current.offset).toBe(40);
    expect(result.current.limit).toBe(10);
    expect(result.current.page).toBe(5);
  });

  // ─── Derived values ─────────────────────────────────────────────────

  it('calculates totalPages correctly', () => {
    const { result } = renderHook(() =>
      useOffsetPaginatedAuditLogs({
        total: 100,
        initialLimit: 20,
      }),
    );

    expect(result.current.totalPages).toBe(5);
  });

  it('calculates hasNextPage correctly', () => {
    const { result } = renderHook(() =>
      useOffsetPaginatedAuditLogs({
        total: 100,
        initialOffset: 0,
        initialLimit: 20,
      }),
    );

    expect(result.current.hasNextPage).toBe(true);

    act(() => {
      result.current.goToPage(5);
    });

    expect(result.current.hasNextPage).toBe(false);
  });

  it('calculates hasPrevPage correctly', () => {
    const { result } = renderHook(() =>
      useOffsetPaginatedAuditLogs({
        total: 100,
        initialOffset: 20,
        initialLimit: 20,
      }),
    );

    expect(result.current.hasPrevPage).toBe(true);

    act(() => {
      result.current.resetPagination();
    });

    expect(result.current.hasPrevPage).toBe(false);
  });

  // ─── Navigation ─────────────────────────────────────────────────────

  it('nextPage advances offset by limit', () => {
    const { result } = renderHook(() =>
      useOffsetPaginatedAuditLogs({
        total: 100,
        initialOffset: 0,
        initialLimit: 20,
      }),
    );

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.offset).toBe(20);
    expect(result.current.page).toBe(2);
  });

  it('prevPage goes back by limit', () => {
    const { result } = renderHook(() =>
      useOffsetPaginatedAuditLogs({
        total: 100,
        initialOffset: 40,
        initialLimit: 20,
      }),
    );

    act(() => {
      result.current.prevPage();
    });

    expect(result.current.offset).toBe(20);
  });

  it('prevPage does not go below 0', () => {
    const { result } = renderHook(() =>
      useOffsetPaginatedAuditLogs({
        total: 100,
        initialOffset: 10,
        initialLimit: 20,
      }),
    );

    act(() => {
      result.current.prevPage();
    });

    expect(result.current.offset).toBe(0);
  });

  it('goToPage navigates to specified page (1-indexed)', () => {
    const { result } = renderHook(() =>
      useOffsetPaginatedAuditLogs({
        total: 100,
        initialLimit: 20,
      }),
    );

    act(() => {
      result.current.goToPage(3);
    });

    expect(result.current.offset).toBe(40);
    expect(result.current.page).toBe(3);
  });

  it('goToPage clamps to valid range (1 to totalPages)', () => {
    const { result } = renderHook(() =>
      useOffsetPaginatedAuditLogs({
        total: 100,
        initialLimit: 20,
      }),
    );

    act(() => {
      result.current.goToPage(100);
    });
    // Should clamp to last page (5)
    expect(result.current.page).toBe(5);

    act(() => {
      result.current.goToPage(0);
    });
    // Should clamp to first page (1)
    expect(result.current.page).toBe(1);
  });

  // ─── resetPagination ────────────────────────────────────────────────

  it('resetPagination resets to offset 0', () => {
    const { result } = renderHook(() =>
      useOffsetPaginatedAuditLogs({
        total: 100,
        initialOffset: 60,
        initialLimit: 20,
      }),
    );

    expect(result.current.offset).toBe(60);

    act(() => {
      result.current.resetPagination();
    });

    expect(result.current.offset).toBe(0);
  });

  // ─── setLimit ───────────────────────────────────────────────────────

  it('setLimit clamps to valid range', () => {
    const { result } = renderHook(() =>
      useOffsetPaginatedAuditLogs({
        total: 100,
        initialLimit: 20,
      }),
    );

    act(() => {
      result.current.setLimit(50);
    });

    expect(result.current.limit).toBe(50);
  });

  it('setLimit resets to first page', () => {
    const { result } = renderHook(() =>
      useOffsetPaginatedAuditLogs({
        total: 100,
        initialOffset: 60,
        initialLimit: 20,
      }),
    );

    act(() => {
      result.current.setLimit(10);
    });

    expect(result.current.offset).toBe(0);
  });

  it('setLimit clamps to maxLimit', () => {
    const { result } = renderHook(() =>
      useOffsetPaginatedAuditLogs({
        total: 100,
        maxLimit: 50,
      }),
    );

    act(() => {
      result.current.setLimit(200);
    });

    expect(result.current.limit).toBe(50);
  });

  // ─── setOffset ──────────────────────────────────────────────────────

  it('setOffset updates offset', () => {
    const { result } = renderHook(() =>
      useOffsetPaginatedAuditLogs({
        total: 100,
        initialLimit: 20,
      }),
    );

    act(() => {
      result.current.setOffset(40);
    });

    expect(result.current.offset).toBe(40);
  });

  it('setOffset clamps to valid range', () => {
    const { result } = renderHook(() =>
      useOffsetPaginatedAuditLogs({
        total: 100,
        initialLimit: 20,
      }),
    );

    act(() => {
      result.current.setOffset(-10);
    });

    // Should not go below 0
    expect(result.current.offset).toBe(0);

    act(() => {
      result.current.setOffset(10000);
    });

    // Should clamp to last page
    expect(result.current.offset).toBeLessThanOrEqual(100);
  });

  // ─── Edge cases ─────────────────────────────────────────────────────

  it('handles total=0', () => {
    const { result } = renderHook(() =>
      useOffsetPaginatedAuditLogs({
        total: 0,
      }),
    );

    expect(result.current.totalPages).toBe(1);
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.hasPrevPage).toBe(false);
  });
});

// ─── Back-compat alias (TKT-7.5 / Phase 5 / P1-2) ─────────────────────

describe('useOffsetPaginated — deprecated alias', () => {
  it('is the same hook under the old name', () => {
    const { result } = renderHook(() =>
      useOffsetPaginated({
        total: 50,
        initialLimit: 10,
      }),
    );

    expect(result.current.offset).toBe(0);
    expect(result.current.limit).toBe(10);
    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(5);
  });

  it('behaves identically when advanced through nextPage', () => {
    const { result } = renderHook(() =>
      useOffsetPaginated({
        total: 50,
        initialLimit: 10,
      }),
    );

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.offset).toBe(10);
    expect(result.current.page).toBe(2);
    expect(result.current.hasNextPage).toBe(true);
  });
});