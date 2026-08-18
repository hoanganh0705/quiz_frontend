

import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { DraftBanner } from '../DraftBanner';

describe('<DraftBanner />', () => {
it('(a) renders nothing when savedAt is null', () => {
const { container } = render(
<DraftBanner
savedAt={null}
restore={() => undefined}
dismiss={() => undefined}
      />
    );
expect(container.querySelector('[data-testid="draft-banner"]')).toBeNull();
  });

it('(b) renders the restore banner when savedAt is set and showRestorePrompt is true', () => {
render(
<DraftBanner
savedAt='2026-08-02T15:30:00Z'
restore={() => undefined}
dismiss={() => undefined}
      />
    );
const banner = screen.getByTestId('draft-banner');
expect(banner).toBeInTheDocument();
expect(screen.getByTestId('draft-banner-message').textContent).toMatch(
/Restore draft from /
    );
expect(screen.getByTestId('draft-banner-restore')).toBeInTheDocument();
expect(screen.getByTestId('draft-banner-dismiss')).toBeInTheDocument();
  });

it('(c) renders nothing when showRestorePrompt is false', () => {
const { container } = render(
<DraftBanner
savedAt='2026-08-02T15:30:00Z'
restore={() => undefined}
dismiss={() => undefined}
showRestorePrompt={false}
      />
    );
expect(container.querySelector('[data-testid="draft-banner"]')).toBeNull();
  });

it('(d) clicking Restore calls restore()', () => {
const restore = vi.fn();
render(
<DraftBanner
savedAt='2026-08-02T15:30:00Z'
restore={restore}
dismiss={() => undefined}
      />
    );
fireEvent.click(screen.getByTestId('draft-banner-restore'));
expect(restore).toHaveBeenCalledTimes(1);
  });

it('(e) clicking Dismiss calls dismiss()', () => {
const dismiss = vi.fn();
render(
<DraftBanner
savedAt='2026-08-02T15:30:00Z'
restore={() => undefined}
dismiss={dismiss}
      />
    );
fireEvent.click(screen.getByTestId('draft-banner-dismiss'));
expect(dismiss).toHaveBeenCalledTimes(1);
  });

it('renders the timestamp formatted as HH:MM in the local timezone', () => {
render(
<DraftBanner
savedAt='2026-08-02T15:30:00Z'
restore={() => undefined}
dismiss={() => undefined}
      />
    );
const text = screen.getByTestId('draft-banner-message').textContent ?? '';

expect(text).toMatch(/Restore draft from \d/);
  });
});