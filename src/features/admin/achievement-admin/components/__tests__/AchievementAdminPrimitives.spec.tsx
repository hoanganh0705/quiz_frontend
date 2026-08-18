

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

import { AchievementAdminSkeleton } from '../AchievementAdminSkeleton';
import { AchievementAdminEmptyState } from '../AchievementAdminEmptyState';
import { AchievementAdminErrorState } from '../AchievementAdminErrorState';

function makeApiError(code: string, requestId?: string): ApiError {
return new ApiError({
isAxiosError: true,
response: {
status: 500,
data: {
status: 500,
detail: code,
title: code,
extensions: { code, requestId },
      },
    },
name: 'AxiosError',
message: code,
  });
}

describe('AchievementAdminSkeleton', () => {
it('AC #1 — renders default count of 5 skeleton rows', () => {
render(<AchievementAdminSkeleton />);
expect(screen.getAllByTestId('achievement-admin-skeleton-row')).toHaveLength(5);
  });

it('AC #1 — renders custom count', () => {
render(<AchievementAdminSkeleton count={3} />);
expect(screen.getAllByTestId('achievement-admin-skeleton-row')).toHaveLength(3);
  });
});

describe('AchievementAdminEmptyState', () => {
it('AC #2 — renders documented empty copy', () => {
render(<AchievementAdminEmptyState />);
expect(screen.getByTestId('achievement-admin-empty-state')).toBeInTheDocument();
expect(screen.getByTestId('achievement-admin-empty-state-description')).toHaveTextContent(
'This user has no badges yet.',
    );
  });

it('AC #2 — renders userId in description when provided', () => {
render(<AchievementAdminEmptyState userId="uid-123" />);
expect(screen.getByTestId('achievement-admin-empty-state-description')).toHaveTextContent(
'uid-123',
    );
  });
});

describe('AchievementAdminErrorState', () => {
it('AC #3 — renders null when error is null', () => {
render(<AchievementAdminErrorState error={null} />);
expect(screen.queryByTestId('achievement-admin-error-state')).not.toBeInTheDocument();
  });

it('AC #3 — renders error state with requestId', () => {
render(<AchievementAdminErrorState error={makeApiError('ADMIN_FORBIDDEN', 'req-xyz')} />);
expect(screen.getByTestId('achievement-admin-error-state')).toBeInTheDocument();
expect(screen.getByTestId('achievement-admin-error-state-request-id')).toHaveTextContent(
'req-xyz',
    );
  });

it('AC #3 — renders without requestId when not provided', () => {
render(<AchievementAdminErrorState error={makeApiError('GLOBAL_INTERNAL_ERROR')} />);
expect(screen.getByTestId('achievement-admin-error-state')).toBeInTheDocument();
expect(
screen.queryByTestId('achievement-admin-error-state-request-id'),
    ).not.toBeInTheDocument();
  });
});
