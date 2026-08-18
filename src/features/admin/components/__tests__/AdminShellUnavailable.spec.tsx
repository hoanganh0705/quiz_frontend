

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminShellUnavailable } from '../AdminShellUnavailable';

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
