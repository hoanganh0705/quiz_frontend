/**
 * `features/admin/components/__tests__/PermissionDeniedNotice.spec.tsx`
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.C2.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PermissionDeniedNotice } from '../PermissionDeniedNotice';

describe('PermissionDeniedNotice', () => {
  it('renders the documented copy for the route variant (default)', () => {
    render(<PermissionDeniedNotice />);
    expect(
      screen.getByText('Restricted to administrators'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('This page is restricted to administrators.'),
    ).toBeInTheDocument();
  });

  it('renders the documented copy for the route variant (explicit)', () => {
    render(<PermissionDeniedNotice variant="route" />);
    expect(
      screen.getByText('This page is restricted to administrators.'),
    ).toBeInTheDocument();
  });

  it('renders the documented copy for the control variant', () => {
    render(<PermissionDeniedNotice variant="control" />);
    expect(
      screen.getByText('Action not available'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('This action is not available for your account.'),
    ).toBeInTheDocument();
  });

  it('renders the documented copy for the self-action variant', () => {
    render(<PermissionDeniedNotice variant="self-action" />);
    expect(
      screen.getByText('Action not available on your own account'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('You cannot perform this action on your own account.'),
    ).toBeInTheDocument();
  });

  it('never renders permission names or role slugs', () => {
    const { container } = render(<PermissionDeniedNotice variant="route" />);
    const html = container.innerHTML;
    expect(html).not.toMatch(/admin-grant|admin-role|admin-permission/i);
    expect(html).not.toMatch(/moderator/);
  });
});
