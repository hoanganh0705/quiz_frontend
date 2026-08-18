

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ReadOnlyBanner } from '../ReadOnlyBanner';

describe('<ReadOnlyBanner />', () => {
it('(a) renders the documented copy when mounted', () => {
render(<ReadOnlyBanner />);
expect(screen.getByTestId('read-only-banner')).toBeInTheDocument();
expect(screen.getByTestId('read-only-banner-title')).toHaveTextContent(
'This quiz is no longer editable'
    );
  });

it('(b) renders the reason as a tooltip on the lock icon', () => {
render(<ReadOnlyBanner reason='quiz-deleted' />);
const lock = screen.getByTestId('read-only-banner-lock');
expect(lock).toBeInTheDocument();
expect(lock).toHaveAttribute('title', 'This quiz is no longer editable (quiz-deleted).');
  });

it('(c) renders a reason <span> when reason is supplied', () => {
render(<ReadOnlyBanner reason='quiz-archived' />);
expect(screen.getByTestId('read-only-banner-reason')).toHaveTextContent(
'reason: quiz-archived'
    );
  });

it('(d) omits the reason <span> when reason is absent', () => {
render(<ReadOnlyBanner />);
expect(
screen.queryByTestId('read-only-banner-reason')
    ).not.toBeInTheDocument();
  });

it('(e) mirrors the reason on the data-read-only-banner-reason attribute', () => {
const { rerender } = render(<ReadOnlyBanner reason='version-immutable' />);
expect(screen.getByTestId('read-only-banner')).toHaveAttribute(
'data-read-only-banner-reason',
'version-immutable'
    );
rerender(<ReadOnlyBanner />);
expect(screen.getByTestId('read-only-banner')).toHaveAttribute(
'data-read-only-banner-reason',
'unknown'
    );
  });

it('(f) honours the testId prop', () => {
render(<ReadOnlyBanner testId='my-test-id' />);
expect(screen.getByTestId('my-test-id')).toBeInTheDocument();

expect(screen.getByTestId('my-test-id-title')).toBeInTheDocument();
  });

it('uses role="status" and aria-live="polite" for accessibility', () => {
render(<ReadOnlyBanner />);
const banner = screen.getByTestId('read-only-banner');
expect(banner).toHaveAttribute('role', 'status');
expect(banner).toHaveAttribute('aria-live', 'polite');
  });
});
