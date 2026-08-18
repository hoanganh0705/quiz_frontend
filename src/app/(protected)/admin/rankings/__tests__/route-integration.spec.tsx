

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminRankingsPage from '../page';

vi.mock('@/features/admin/hooks/useAdminFeatureFlag', () => ({
useAdminFeatureFlag: vi.fn(),
}));

vi.mock('@/features/admin/hooks/usePermission', () => ({
usePermission: vi.fn(() => ({
isLoading: false,
error: null,
hasPermission: true,
  })),
}));

vi.mock('@/app/(protected)/admin/_components/AdminPageHeader', () => ({
AdminPageHeader: ({
title,
description,
  }: {
title: string;
description?: string;
  }) => (
<div data-testid="admin-page-header">
<h1>{title}</h1>
{description ? <p>{description}</p> : null}
</div>
  ),
}));

vi.mock('@/features/admin/ranking-admin/components/RecalculateRankingPanel', () => ({
RecalculateRankingPanel: () => <div data-testid="mock-recalculate-panel">R</div>,
}));

vi.mock('@/features/admin/ranking-admin/components/PeriodResetPanel', () => ({
PeriodResetPanel: () => <div data-testid="mock-period-reset-panel">P</div>,
}));

vi.mock('@/features/admin/ranking-admin/components/ConsistencyCheckPanel', () => ({
ConsistencyCheckPanel: () => <div data-testid="mock-consistency-panel">C</div>,
}));

const { useAdminFeatureFlag } = await import(
'@/features/admin/hooks/useAdminFeatureFlag'
);

function setup(flagValue: 'live' | 'placeholder') {
vi.mocked(useAdminFeatureFlag).mockReturnValue({
flag: 'admin_ranking_live',
value: flagValue,
isLive: flagValue === 'live',
isPlaceholder: flagValue === 'placeholder',
  });
}

beforeEach(() => {
vi.mocked(useAdminFeatureFlag).mockReset();
});

describe('TKT-7.9.F2 — /admin/rankings route integration', () => {
it('renders RankingAdminPage when flag is live', () => {
setup('live');
render(<AdminRankingsPage />);
expect(screen.getByTestId('ranking-admin-page')).toBeInTheDocument();
expect(
screen.queryByTestId('ranking-admin-disabled-notice'),
    ).not.toBeInTheDocument();
  });

it('renders the disabled notice when flag is placeholder', () => {
setup('placeholder');
render(<AdminRankingsPage />);
expect(
screen.getByTestId('ranking-admin-disabled-notice'),
    ).toBeInTheDocument();
expect(
screen.queryByTestId('ranking-admin-page'),
    ).not.toBeInTheDocument();
  });
});
