/**
 * `LanguageSettings.spec.tsx` — unit tests for the rewritten LanguageSettings component.
 *
 * Source epic:   Epic 4.3 — Edit profile + user settings.
 * Source ticket: TKT-4.3.C4.
 *
 * NOTE: `afterEach(cleanup())` is provided by the jsdom project's `setupFiles`.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { LanguageSettings } from '../LanguageSettings';
import type { UserMeResponseDto } from '@/features/users/types/user-backend';

// ─── Fixtures ────────────────────────────────────────────────────────────────

type LocaleSettings = {
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
};

function makeProfile(locale?: Partial<LocaleSettings>): UserMeResponseDto {
  const defaults: LocaleSettings = {
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
  };
  const merged = locale ? { ...defaults, ...locale } : defaults;
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
    settings: { locale: merged },
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

vi.mock('@/shared/hooks/use-app-language', () => ({
  useAppLanguage: vi.fn().mockImplementation(() => ({
    setLanguage: vi.fn(),
    language: 'en',
    t: (key: string, fallback: string) => fallback,
  })),
}));

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('LanguageSettings', () => {
  it('renders skeletons while profile is null', () => {
    const { container } = render(<LanguageSettings profile={null} />);
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders the Language & Region header', () => {
    render(<LanguageSettings profile={makeProfile()} />);
    expect(
      screen.getByRole('heading', { level: 3, name: /Language & Region/i }),
    ).toBeInTheDocument();
  });

  it('renders three select triggers (language, timezone, date format)', () => {
    render(<LanguageSettings profile={makeProfile()} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(3);
  });

  it('renders 12-hour and 24-hour time format radio buttons', () => {
    render(<LanguageSettings profile={makeProfile()} />);
    expect(screen.getByRole('radio', { name: /12-hour/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /24-hour/i })).toBeInTheDocument();
  });

  it('disables selects while pending', () => {
    mockState.isPending = true;
    const { rerender } = render(
      <LanguageSettings profile={makeProfile()} />,
    );
    rerender(<LanguageSettings profile={makeProfile()} />);
    const selects = screen.getAllByRole('combobox');
    for (const sel of selects) {
      expect(sel).toBeDisabled();
    }
  });
});
