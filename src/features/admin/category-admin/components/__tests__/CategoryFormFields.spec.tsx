

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SlugAvailabilityStatus } from '../../hooks/useCategorySlugAvailability';
import { CategoryFormFields } from '../CategoryFormFields';

interface AvailabilityResult {
status: SlugAvailabilityStatus;
debouncedSlug: string;
conflictingCategory: {
categoryId: string;
name: string;
slug: string;
  } | null;
}

const mockUseCategorySlugAvailability = vi.hoisted(() =>
vi.fn<() => AvailabilityResult>(() => ({
status: 'unknown',
debouncedSlug: '',
conflictingCategory: null,
  })),
);

vi.mock('../hooks/useCategorySlugAvailability', () => ({
useCategorySlugAvailability: mockUseCategorySlugAvailability,
}));

vi.mock('@/features/admin/category-admin/hooks/useCategorySlugAvailability', () => ({
useCategorySlugAvailability: mockUseCategorySlugAvailability,
}));

function slugStatus(
status: 'unknown' | 'available' | 'taken' | 'invalid',
conflictName?: string,
) {
return {
status,
debouncedSlug: 'test-slug',
conflictingCategory:
status === 'taken' && conflictName
? {
categoryId: 'cat-other',
name: conflictName,
slug: 'test-slug',
          }
: null,
  };
}

describe('CategoryFormFields', () => {
afterEach(() => {
mockUseCategorySlugAvailability.mockReturnValue({
status: 'unknown',
debouncedSlug: '',
conflictingCategory: null,
    });
  });

it('renders name, slug, description, and image-url fields', () => {
render(<CategoryFormFields mode='create' />);

expect(screen.getByRole('textbox', { name: /^Name/ })).toBeInTheDocument();
expect(screen.getByRole('textbox', { name: /^Slug/ })).toBeInTheDocument();

expect(screen.getByRole('textbox', { name: /^Description/ })).toBeInTheDocument();

expect(screen.getByLabelText(/^Image URL/)).toBeInTheDocument();
  });

it('name input has correct min/max length attributes', () => {
render(<CategoryFormFields mode='create' />);

const nameInput = screen.getByRole('textbox', { name: /^Name/ });
expect(nameInput).toHaveAttribute('minLength', '1');
expect(nameInput).toHaveAttribute('maxLength', '120');
  });

it('slug input has the documented maxLength', () => {
render(<CategoryFormFields mode='create' />);

const slugInput = screen.getByRole('textbox', { name: /^Slug/ });
expect(slugInput).toHaveAttribute('maxLength', '120');
  });

it('pre-populates initial values in edit mode', () => {
render(
<CategoryFormFields
mode='edit'
initialName='Mathematics'
initialSlug='mathematics'
initialDescription='Math category'
initialImageUrl='https://example.com/math.png'
      />,
    );

expect(screen.getByRole('textbox', { name: /^Name/ })).toHaveValue(
'Mathematics',
    );
expect(screen.getByRole('textbox', { name: /^Slug/ })).toHaveValue(
'mathematics',
    );
expect(
screen.getByRole('textbox', { name: /^Description/ }),
    ).toHaveValue('Math category');
expect(screen.getByLabelText(/^Image URL/)).toHaveValue(
'https://example.com/math.png',
    );
  });

it('disables all inputs when disabled prop is true', () => {
render(<CategoryFormFields mode='create' disabled />);

expect(screen.getByRole('textbox', { name: /^Name/ })).toBeDisabled();
expect(screen.getByRole('textbox', { name: /^Slug/ })).toBeDisabled();
expect(screen.getByRole('textbox', { name: /^Description/ })).toBeDisabled();
expect(screen.getByLabelText(/^Image URL/)).toBeDisabled();
  });

it('calls onChange on name input change', () => {
const onChange = vi.fn();
render(<CategoryFormFields mode='create' onChange={onChange} />);

fireEvent.change(screen.getByRole('textbox', { name: /^Name/ }), {
target: { value: 'Math' },
    });

expect(onChange).toHaveBeenCalledWith(
expect.objectContaining({ name: 'Math' }),
    );
  });

it('renders the slug regex preview chip', () => {
render(<CategoryFormFields mode='create' />);

expect(screen.getByText('a-z 0-9 -')).toBeInTheDocument();
  });

it('shows taken hint with conflicting category name', () => {
mockUseCategorySlugAvailability.mockReturnValue(slugStatus('taken', 'Math'));

render(<CategoryFormFields mode='create' />);

expect(screen.getByText(/Math/)).toBeInTheDocument();
  });

it('shows invalid hint when slug is invalid', () => {
mockUseCategorySlugAvailability.mockReturnValue(slugStatus('invalid'));

render(<CategoryFormFields mode='create' />);

expect(
screen.getByText(/lowercase letters, numbers, and hyphens only/i),
    ).toBeInTheDocument();
  });

it('shows available confirmation when slug is available', () => {
mockUseCategorySlugAvailability.mockReturnValue(slugStatus('available'));

render(<CategoryFormFields mode='create' />);

expect(screen.getByText(/Slug is available/)).toBeInTheDocument();
  });

it('surfaces image URL validation error when invalid', () => {
render(<CategoryFormFields mode='create' />);

const imageUrlInput = screen.getByLabelText(/^Image URL/);
fireEvent.change(imageUrlInput, { target: { value: 'not-a-url' } });

expect(
screen.getByText(/must be a valid http\(s\) URL/i),
    ).toBeInTheDocument();
  });

it('accepts a valid http URL for the image URL field', () => {
render(<CategoryFormFields mode='create' />);

const imageUrlInput = screen.getByLabelText(/^Image URL/);
fireEvent.change(imageUrlInput, {
target: { value: 'https://example.com/cover.png' },
    });

expect(
screen.queryByText(/must be a valid http\(s\) URL/i),
    ).not.toBeInTheDocument();
  });
});