

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SlugConflictNotice } from '../SlugConflictNotice';
import type { ApiError } from '@/lib/api';

vi.mock('@/features/admin/components/RequestIdBanner', () => ({
RequestIdBanner: vi.fn(({ error }) => (
<div data-testid='request-id-banner'>requestId: {error.requestId}</div>
  )),
}));

function makeError(overrides: Partial<{ requestId: string; conflictingTagId: string }> = {}): ApiError {
return {
requestId: overrides.requestId ?? '',
code: 'TAG_SLUG_CONFLICT',
  } as unknown as ApiError;
}

describe('SlugConflictNotice', () => {
it('renders the conflict warning message', () => {
render(
<SlugConflictNotice
error={makeError()}
mode='create'
renamedSlug='taken-slug'
onRenamedSlugChange={vi.fn()}
      />,
    );

expect(screen.getByText(/slug is already taken/i)).toBeInTheDocument();
  });

it('renders restore-specific copy when mode is restore', () => {
render(
<SlugConflictNotice
error={makeError()}
mode='restore'
renamedSlug='taken-slug'
onRenamedSlugChange={vi.fn()}
      />,
    );

expect(screen.getByText(/rename before restoring/i)).toBeInTheDocument();
  });

it('renders the conflicting tag name when provided', () => {
render(
<SlugConflictNotice
error={makeError()}
mode='create'
renamedSlug='taken-slug'
onRenamedSlugChange={vi.fn()}
conflictingTagName='Math'
      />,
    );

expect(screen.getByText(/Math/)).toBeInTheDocument();
  });

it('renders the rename input and emits onRenamedSlugChange', () => {
const onChange = vi.fn();

render(
<SlugConflictNotice
error={makeError()}
mode='create'
renamedSlug=''
onRenamedSlugChange={onChange}
      />,
    );

fireEvent.change(screen.getByRole('textbox'), {
target: { value: 'new-slug' },
    });

expect(onChange).toHaveBeenCalledWith('new-slug');
  });

it('renders RequestIdBanner when error carries requestId', () => {
render(
<SlugConflictNotice
error={makeError({ requestId: 'req-123' })}
mode='create'
renamedSlug='taken-slug'
onRenamedSlugChange={vi.fn()}
      />,
    );

expect(screen.getByTestId('request-id-banner')).toBeInTheDocument();
  });
});
