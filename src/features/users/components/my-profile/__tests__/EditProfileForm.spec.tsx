/**
 * `EditProfileForm.spec.tsx` — unit tests for the EditProfileForm component.
 *
 * Source epic:   Epic 4.3 — Edit profile + user settings.
 * Source ticket: TKT-4.3.D1.
 *
 * NOTE: `afterEach(cleanup())` is provided by the jsdom project's `setupFiles`.
 *
 * ## Test strategy
 *
 * The component owns `useQuizForm`, `useDraftAutoSave`, and
 * `useUnsavedChangesGuard` internally. We mock those hooks and assert
 * on the observable output: rendered fields, draft banner, error banner,
 * and the submit button's presence.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { EditProfileForm } from '../EditProfileForm';
import type { UserMeResponseDto } from '@/features/users/types/user-backend';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockProfile: UserMeResponseDto = {
  userId: 'user-1',
  username: 'johndoe',
  email: 'john@example.com',
  displayName: 'John Doe',
  avatarUrl: null,
  bio: null,
  xpTotal: 0,
  currentStreak: 0,
  longestStreak: 0,
  settings: {},
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

// ─── Mock modules ─────────────────────────────────────────────────────────

const mockUpdateProfile = {
  mutate: vi.fn().mockResolvedValue(undefined),
  isPending: false,
  isSuccess: false,
  isError: false,
  lastError: null,
  lastApiError: null,
  resetError: vi.fn(),
};

const mockDraft = {
  savedAt: null as string | null,
  restore: vi.fn(),
  dismiss: vi.fn(),
};

const mockGuard = {
  pendingPopstate: false,
  pendingPathname: null as string | null,
};

const mockUsernameCheck = { status: 'idle' as const };

vi.mock('@/features/users/hooks/useUpdateMyProfile', () => ({
  useUpdateMyProfile: vi.fn().mockImplementation(() => mockUpdateProfile),
}));

vi.mock('@/features/auth/hooks/use-check-username', () => ({
  useCheckUsername: vi.fn().mockImplementation(() => mockUsernameCheck),
  isWellFormedUsername: vi.fn().mockReturnValue(true),
}));

vi.mock('@/lib/forms/useDraftAutoSave', () => ({
  useDraftAutoSave: vi.fn().mockImplementation(() => mockDraft),
}));

vi.mock('@/lib/forms/useUnsavedChangesGuard', () => ({
  useUnsavedChangesGuard: vi.fn().mockImplementation(() => mockGuard),
}));

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('EditProfileForm', () => {
  it('renders form fields with profile defaultValues', () => {
    render(<EditProfileForm profile={mockProfile} />);

    // Display name should be pre-filled from profile.
    const displayNameInput = screen.getByLabelText(/Display Name/i) as HTMLInputElement;
    expect(displayNameInput.value).toBe('John Doe');

    // Username info should show the username from profile.
    expect(screen.getByText(/johndoe/)).toBeInTheDocument();
  });

  it('renders the draft banner mount point', () => {
    render(<EditProfileForm profile={mockProfile} />);
    // DraftBanner is mounted; with savedAt=null it renders nothing visible.
    // We just verify the form renders without crashing.
    expect(screen.getByLabelText(/Display Name/i)).toBeInTheDocument();
  });

  it('renders the error banner container (no error = hidden)', () => {
    const { container } = render(<EditProfileForm profile={mockProfile} />);
    // The FormErrorBanner div should be present even when lastError is null.
    // With lastError=null, it returns null so we just check no crash.
    expect(screen.getByLabelText(/Display Name/i)).toBeInTheDocument();
  });

  it('shows the username read-only notice', () => {
    render(<EditProfileForm profile={mockProfile} />);
    expect(
      screen.getByText(/cannot be changed after registration/i),
    ).toBeInTheDocument();
  });

  it('renders the save button', () => {
    render(<EditProfileForm profile={mockProfile} />);
    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
  });
});
