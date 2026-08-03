/**
 * `PrivacySettings.spec.tsx` — unit tests for the rewritten PrivacySettings component.
 *
 * Source epic:   Epic 4.3 — Edit profile + user settings.
 * Source ticket: TKT-4.3.C3.
 *
 * NOTE: `afterEach(cleanup())` is provided by the jsdom project's `setupFiles`.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { PrivacySettings } from '../PrivacySettings';
import type { UserMeResponseDto } from '@/features/users/types/user-backend';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeProfile(privacy?: Record<string, unknown>): UserMeResponseDto {
  return {
    userId: 'user-1',
    username: 'johndoe',
    email: 'john@example.com',
    displayName: 'John Doe',
    avatarUrl: null,
    bio: null,
    xpTotal: 0,
    currentStreak: 0,
    longestStreak: 0,
    settings: {
      privacy: {
        profileVisibility: 'public',
        showOnlineStatus: true,
        showQuizHistory: true,
        showAchievements: true,
        allowFriendRequests: true,
        showInLeaderboard: true,
        shareActivityWithFriends: true,
        ...(privacy ?? {}),
      },
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

// ─── Shared mock state ──────────────────────────────────────────────────────

const mockState = {
  mutate: vi.fn().mockResolvedValue(undefined),
  isPending: false,
  isSuccess: false,
  isError: false,
  lastError: null,
  lastApiError: null,
  resetError: vi.fn(),
};

vi.mock('@/features/users/hooks/useUpdateMySettings', () => ({
  useUpdateMySettings: vi.fn().mockImplementation(() => mockState),
}));

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('PrivacySettings', () => {
  it('renders skeletons while profile is null', () => {
    const { container } = render(<PrivacySettings profile={null} />);
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders the header', () => {
    render(<PrivacySettings profile={makeProfile()} />);
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: /Privacy Settings/i,
      }),
    ).toBeInTheDocument();
  });

  it('renders the visibility select', () => {
    render(<PrivacySettings profile={makeProfile()} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders all six privacy toggles', () => {
    render(<PrivacySettings profile={makeProfile()} />);
    expect(screen.getByLabelText(/Toggle Show Online Status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Toggle Show Quiz History/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Toggle Show Achievements/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Toggle Allow Friend Requests/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Toggle Show in Leaderboard/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Toggle Share Activity with Friends/i)).toBeInTheDocument();
  });

  it('disables toggles while pending', () => {
    mockState.isPending = true;
    const { rerender } = render(<PrivacySettings profile={makeProfile()} />);
    rerender(<PrivacySettings profile={makeProfile()} />);
    const toggles = screen.getAllByRole('switch');
    for (const toggle of toggles) {
      expect(toggle).toBeDisabled();
    }
  });
});
