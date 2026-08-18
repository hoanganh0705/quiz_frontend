

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminFeatureFlagBoundary } from '../AdminFeatureFlagBoundary';

vi.mock('../../hooks/useAdminFeatureFlag', () => ({
useAdminFeatureFlag: vi.fn(),
}));

import { useAdminFeatureFlag } from '../../hooks/useAdminFeatureFlag';

function setFlag(value: 'live' | 'placeholder') {
vi.mocked(useAdminFeatureFlag).mockReturnValue({
flag: 'admin_live',
value,
isLive: value === 'live',
isPlaceholder: value === 'placeholder',
  });
}

describe('AdminFeatureFlagBoundary', () => {
it('renders children when flag is live', () => {
setFlag('live');
render(
<AdminFeatureFlagBoundary>
<div data-testid="admin-shell">Admin Shell</div>
</AdminFeatureFlagBoundary>,
    );
expect(screen.getByTestId('admin-shell')).toBeInTheDocument();
expect(
screen.queryByText('Admin surfaces coming soon'),
    ).not.toBeInTheDocument();
  });

it('renders coming-soon notice when flag is placeholder', () => {
setFlag('placeholder');
render(
<AdminFeatureFlagBoundary>
<div data-testid="admin-shell">Admin Shell</div>
</AdminFeatureFlagBoundary>,
    );
expect(
screen.getByText('Admin surfaces coming soon'),
    ).toBeInTheDocument();
expect(screen.queryByTestId('admin-shell')).not.toBeInTheDocument();
  });

it('does not crash when children are null', () => {
setFlag('placeholder');
render(<AdminFeatureFlagBoundary>{null}</AdminFeatureFlagBoundary>);
expect(
screen.getByText('Admin surfaces coming soon'),
    ).toBeInTheDocument();
  });
});
