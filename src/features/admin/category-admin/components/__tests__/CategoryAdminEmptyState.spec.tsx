

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CategoryAdminEmptyState } from '../CategoryAdminEmptyState';

describe('CategoryAdminEmptyState', () => {
it('renders the active-tab copy and the Add Category CTA when onCreate is provided', () => {
const onCreate = vi.fn();
render(<CategoryAdminEmptyState tab='active' onCreate={onCreate} />);

expect(screen.getByText('No categories yet')).toBeInTheDocument();
expect(
screen.getByRole('button', { name: 'Add Category' }),
    ).toBeInTheDocument();
  });

it('does not render the Add Category CTA when onCreate is omitted', () => {
render(<CategoryAdminEmptyState tab='active' />);

expect(screen.getByText('No categories yet')).toBeInTheDocument();
expect(
screen.queryByRole('button', { name: 'Add Category' }),
    ).not.toBeInTheDocument();
  });

it('renders the deleted-tab copy without a CTA', () => {
render(<CategoryAdminEmptyState tab='deleted' />);

expect(screen.getByText('No soft-deleted categories')).toBeInTheDocument();
expect(
screen.queryByRole('button', { name: 'Add Category' }),
    ).not.toBeInTheDocument();
  });

it('invokes onCreate when the Add Category CTA is clicked', () => {
const onCreate = vi.fn();
render(<CategoryAdminEmptyState tab='active' onCreate={onCreate} />);

screen.getByRole('button', { name: 'Add Category' }).click();
expect(onCreate).toHaveBeenCalledTimes(1);
  });
});