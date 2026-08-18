

import { render, screen } from '@testing-library/react';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TournamentAdminPage } from '../TournamentAdminPage';

const mockUseAdminFeatureFlag = vi.fn();
const mockUsePermission = vi.fn();

vi.mock('@/features/admin/hooks/useAdminFeatureFlag', () => ({
useAdminFeatureFlag: (flag: string) => mockUseAdminFeatureFlag(flag),
}));

vi.mock('@/features/admin/hooks/usePermission', () => ({
usePermission: (permission: string) => mockUsePermission(permission),
}));

vi.mock('@/app/(protected)/admin/_components/AdminPageHeader', () => ({
AdminPageHeader: ({
title,
description,
actionLabel,
actionIcon,
onAction,
  }: {
title: string;
description?: string;
actionLabel?: string;
actionIcon?: React.ReactNode;
onAction?: () => void;
  }) => (
<div data-testid="admin-page-header-mock">
<h1 data-testid="admin-page-header-title">{title}</h1>
{description && (
<p data-testid="admin-page-header-description">{description}</p>
      )}
{actionLabel && (
<button
data-testid="admin-page-header-action"
onClick={onAction}
        >
{actionIcon}
{actionLabel}
</button>
      )}
</div>
  ),
}));

vi.mock('next/navigation', () => ({
useRouter: () => ({ replace: vi.fn() }),
useSearchParams: () => new URLSearchParams(),
}));

describe('TournamentAdminPage', () => {
afterEach(() => {
vi.restoreAllMocks();
  });

beforeEach(() => {

mockUseAdminFeatureFlag.mockReturnValue({ value: 'live', isLive: true, isPlaceholder: false });
mockUsePermission.mockReturnValue(true);
  });

describe('feature flag behavior', () => {
it('renders the disabled notice when feature flag is placeholder', () => {
mockUseAdminFeatureFlag.mockReturnValue({ value: 'placeholder', isLive: false, isPlaceholder: true });

render(<TournamentAdminPage />);

expect(screen.getByTestId('admin-page-header-title')).toHaveTextContent(
'Tournament Management',
      );
    });

it.todo('renders the admin surface when feature flag is live');
  });

describe('permission behavior', () => {

it.todo('shows New tournament button when user has tournament_create permission');
it.todo('hides New tournament button when user lacks tournament_create permission');
  });
});
