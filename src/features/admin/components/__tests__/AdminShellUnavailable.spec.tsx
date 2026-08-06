/**
 * `features/admin/components/__tests__/AdminShellUnavailable.spec.tsx`
 *
 * Source epic:   Epic 7.2.
 * Source ticket: TKT-7.2.A3.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminShellUnavailable } from '../AdminShellUnavailable';

// Top-level mock — hoisted by vitest automatically.
vi.mock('../../hooks/useAdminFeatureFlag', () => ({
  useAdminFeatureFlag: vi.fn(),
}));

import { useAdminFeatureFlag } from '../../hooks/useAdminFeatureFlag';

function setFlag(value: 'live' | 'placeholder') {
  vi.mocked(useAdminFeatureFlag).mockReturnValue({
    flag: 'phase7_admin',
    value,
    isLive: value === 'live',
    isPlaceholder: value === 'placeholder',
  });
}

describe('AdminShellUnavailable', () => {
  it('renders children when flag is live', () => {
    setFlag('live');
    render(
      <AdminShellUnavailable>
        <div data-testid="shell-children">Admin Shell Content</div>
      </AdminShellUnavailable>,
    );
    expect(screen.getByTestId('shell-children')).toBeInTheDocument();
    expect(screen.queryByText('Admin surfaces coming soon')).not.toBeInTheDocument();
  });

  it('renders the coming-soon notice when flag is placeholder', () => {
    setFlag('placeholder');
    render(
      <AdminShellUnavailable>
        <div data-testid="shell-children">Admin Shell Content</div>
      </AdminShellUnavailable>,
    );
    expect(screen.getByText('Admin surfaces coming soon')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-children')).not.toBeInTheDocument();
  });

  it('does not crash when children are null', () => {
    setFlag('placeholder');
    render(<AdminShellUnavailable>{null}</AdminShellUnavailable>);
    expect(screen.getByText('Admin surfaces coming soon')).toBeInTheDocument();
  });
});
