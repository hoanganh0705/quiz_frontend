

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SelfRoleRevokeForbiddenNotice } from '../SelfRoleRevokeForbiddenNotice';

describe('SelfRoleRevokeForbiddenNotice', () => {
it('renders the notice text', () => {
render(<SelfRoleRevokeForbiddenNotice />);

expect(
screen.getByText(/cannot revoke your own/i),
    ).toBeInTheDocument();
  });

it('renders the security / privilege escalation explanation', () => {
render(<SelfRoleRevokeForbiddenNotice />);

expect(
screen.getByText(/forbidden by server policy/i),
    ).toBeInTheDocument();
  });

it('renders with the alert role and destructive variant', () => {
const { container } = render(<SelfRoleRevokeForbiddenNotice />);

const notice = screen.getByTestId('self-role-revoke-forbidden-notice');
expect(notice.getAttribute('role')).toBe('alert');

expect(notice.className).toContain('border-destructive');
  });

it('renders without crashing', () => {
expect(() => render(<SelfRoleRevokeForbiddenNotice />)).not.toThrow();
  });
});
