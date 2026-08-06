/**
 * `__tests__/TagFormFields.spec.tsx`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.D1.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TagFormFields } from '../TagFormFields';

// Hoisted mock — hoisted to module level so vi.mocked() can reference it
// without needing a dynamic `require()` call inside a test body.
const mockUseTagSlugAvailability = vi.hoisted(() =>
  vi.fn(() => ({
    status: 'unknown' as const,
    debouncedSlug: '',
    conflictingTag: null,
  })),
);

vi.mock('../../hooks/useTagSlugAvailability', () => ({
  useTagSlugAvailability: mockUseTagSlugAvailability,
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function slugStatus(status: 'unknown' | 'available' | 'taken' | 'invalid', conflictName?: string) {
  return {
    status,
    debouncedSlug: 'test-slug',
    conflictingTag:
      status === 'taken' && conflictName
        ? { tagId: 'tag-other', name: conflictName, slug: 'test-slug' }
        : null,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('TagFormFields', () => {
  afterEach(() => {
    mockUseTagSlugAvailability.mockReturnValue({
      status: 'unknown',
      debouncedSlug: '',
      conflictingTag: null,
    });
  });

  it('renders name and slug text inputs', () => {
    render(<TagFormFields mode='create' />);

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(2);
  });

  it('name input has correct min/max length attributes', () => {
    render(<TagFormFields mode='create' />);

    const nameInput = screen.getAllByRole('textbox')[0]!;
    expect(nameInput).toHaveAttribute('minLength', '1');
    expect(nameInput).toHaveAttribute('maxLength', '120');
  });

  it('slug input has correct maxLength attribute', () => {
    render(<TagFormFields mode='create' />);

    const slugInput = screen.getAllByRole('textbox')[1]!;
    expect(slugInput).toHaveAttribute('maxLength', '120');
  });

  it('pre-populates initialName and initialSlug in edit mode', () => {
    render(
      <TagFormFields
        mode='edit'
        initialName='JavaScript'
        initialSlug='javascript'
      />,
    );

    const inputs = screen.getAllByRole('textbox');
    expect(inputs[0]).toHaveValue('JavaScript');
    expect(inputs[1]).toHaveValue('javascript');
  });

  it('disables inputs when disabled prop is true', () => {
    render(<TagFormFields mode='create' disabled />);

    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input) => {
      expect(input).toBeDisabled();
    });
  });

  it('calls onChange on name input change', () => {
    const onChange = vi.fn();
    render(<TagFormFields mode='create' onChange={onChange} />);

    fireEvent.change(screen.getAllByRole('textbox')[0]!, {
      target: { value: 'Rust' },
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Rust' }),
    );
  });

  it('renders regex preview chip', () => {
    render(<TagFormFields mode='create' />);

    expect(screen.getByText('a-z 0-9 -')).toBeInTheDocument();
  });

  it('shows taken hint with conflicting tag name', () => {
    mockUseTagSlugAvailability.mockReturnValue(slugStatus('taken', 'Math'));

    render(<TagFormFields mode='create' />);

    expect(screen.getByText(/Math/)).toBeInTheDocument();
  });
});
