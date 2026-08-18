

import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useOffsetPaginatedAuditLogs } from '../useOffsetPaginatedAuditLogs';

describe('useOffsetPaginatedAuditLogs', () => {

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

expect(result.current.page).toBe(5);

act(() => {
result.current.goToPage(0);
    });

expect(result.current.page).toBe(1);
  });

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

expect(result.current.offset).toBe(0);

act(() => {
result.current.setOffset(10000);
    });

expect(result.current.offset).toBeLessThanOrEqual(100);
  });

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