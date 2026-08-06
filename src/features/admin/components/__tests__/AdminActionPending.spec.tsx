/**
 * `features/admin/components/__tests__/AdminActionPending.spec.tsx`
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.C6.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminActionPending } from '../AdminActionPending';

describe('AdminActionPending', () => {
  it('renders untouched when isPending is false', () => {
    render(
      <AdminActionPending isPending={false}>
        <button type="button">Click me</button>
      </AdminActionPending>,
    );

    const root = screen.getByTestId('admin-action-pending-root');
    expect(root.getAttribute('aria-busy')).toBe('false');
    expect(root.getAttribute('data-pending')).toBe('false');
    expect(screen.getByRole('button', { name: 'Click me' })).not.toBeDisabled();
    expect(
      screen.queryByTestId('admin-action-pending-overlay'),
    ).not.toBeInTheDocument();
  });

  it('renders aria-busy=true and the spinner overlay when isPending is true', () => {
    render(
      <AdminActionPending isPending={true}>
        <button type="button">Click me</button>
      </AdminActionPending>,
    );

    const root = screen.getByTestId('admin-action-pending-root');
    expect(root.getAttribute('aria-busy')).toBe('true');
    expect(root.getAttribute('data-pending')).toBe('true');
    expect(
      screen.getByTestId('admin-action-pending-overlay'),
    ).toBeInTheDocument();
  });

  it('disables interactive children (button / a / input) when isPending is true', () => {
    render(
      <AdminActionPending isPending={true}>
        <button type="button">Submit</button>
        <a href="/x">Link</a>
        <input type="text" aria-label="name" />
      </AdminActionPending>,
    );

    const button = screen.getByRole('button', { name: 'Submit' });
    const link = screen.getByRole('link', { name: 'Link' });
    const input = screen.getByLabelText('name');

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(input).toBeDisabled();
  });

  it('does not disable non-interactive children', () => {
    render(
      <AdminActionPending isPending={true}>
        <p>Just text</p>
        <span>More text</span>
      </AdminActionPending>,
    );

    expect(screen.getByText('Just text')).toBeInTheDocument();
    expect(screen.getByText('More text')).toBeInTheDocument();
    // Non-interactive children should not get aria-disabled.
    expect(screen.getByText('Just text')).not.toHaveAttribute('aria-disabled');
  });
});
