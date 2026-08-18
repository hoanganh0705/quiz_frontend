

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AchievementAdminUserRouteHandoff } from '../AchievementAdminUserRouteHandoff';

const VALID_USER_ID = '00000000-0000-4000-8000-000000000001';

const mockUseAdminFeatureFlag = vi.hoisted(() =>
vi.fn((_flag?: unknown) => ({
isLive: false,
value: 'placeholder',
isPlaceholder: true,
  })),
);

vi.mock('@/features/admin/hooks/useAdminFeatureFlag', () => ({
useAdminFeatureFlag: (flag?: unknown) => mockUseAdminFeatureFlag(flag),
}));

vi.mock('@/features/admin/achievement-admin/components/AchievementAdminUserPage', () => ({
AchievementAdminUserPage: ({ userId }: { userId: string }) => (
<div data-testid="achievement-admin-user-page">{userId}</div>
  ),
}));

describe('AchievementAdminUserRouteHandoff', () => {
beforeEach(() => {
vi.clearAllMocks();
mockUseAdminFeatureFlag.mockReturnValue({
isLive: false,
value: 'placeholder',
isPlaceholder: true,
    });
  });

afterEach(() => {
vi.restoreAllMocks();
  });

it('renders the documented disabled notice when the flag is placeholder', () => {
render(<AchievementAdminUserRouteHandoff userId={VALID_USER_ID} />);
expect(
screen.getByText(/Achievement admin coming soon/i),
    ).toBeInTheDocument();
expect(
screen.getByTestId('achievement-admin-disabled-notice'),
    ).toBeInTheDocument();
  });

it('delegates to AchievementAdminUserPage when the flag is live', () => {
mockUseAdminFeatureFlag.mockReturnValue({
isLive: true,
value: 'live',
isPlaceholder: false,
    });
render(<AchievementAdminUserRouteHandoff userId={VALID_USER_ID} />);
expect(screen.getByTestId('achievement-admin-user-page')).toBeInTheDocument();
expect(screen.getByTestId('achievement-admin-user-page')).toHaveTextContent(VALID_USER_ID);
  });

it('reads the admin_achievement_live flag', () => {
render(<AchievementAdminUserRouteHandoff userId={VALID_USER_ID} />);
expect(mockUseAdminFeatureFlag).toHaveBeenCalledWith(
'admin_achievement_live',
    );
  });

it('route handoff file source contains no axios or fetch() calls', () => {
const source = readFileSync(
resolve(__dirname, '..', 'AchievementAdminUserRouteHandoff.tsx'),
'utf-8',
    );
expect(source).not.toMatch(/from\s+['"]axios['"]/);
expect(source).not.toMatch(/(?:^|[^.\w])fetch\s*\(/);
  });
});
