

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { AttemptHeader } from '@/features/attempts/components/AttemptHeader';

import type { AttemptRunnerStatus } from '@/features/attempts/types/attempt-runner.types';

describe('AttemptHeader — rendering', () => {
it('renders the title and status copy', () => {
render(
<AttemptHeader
title="Quiz: Capitals of the World"
status="in_progress"
onAbandon={() => {}}
      />,
    );

expect(screen.getByTestId('attempt-header-title').textContent).toBe(
'Quiz: Capitals of the World',
    );
expect(screen.getByTestId('attempt-header-status').textContent).toBe(
'In progress',
    );
  });
});

describe('AttemptHeader — abandon action', () => {
it('invokes the callback once when clicked', () => {
const onAbandon = vi.fn();
const { unmount } = render(
<AttemptHeader
title="Sample"
status="in_progress"
onAbandon={onAbandon}
      />,
    );

fireEvent.click(screen.getByTestId('attempt-header-abandon'));
expect(onAbandon).toHaveBeenCalledTimes(1);
unmount();
  });

it.each([
'starting',
'submitting',
'abandoning',
'completing',
  ])('disables abandon during %s transition', (status) => {
const onAbandon = vi.fn();
render(
<AttemptHeader
title="Sample"
status={status as AttemptRunnerStatus}
onAbandon={onAbandon}
      />,
    );
const btn = screen.getByTestId('attempt-header-abandon');
expect(btn).toBeDisabled();
fireEvent.click(btn);
expect(onAbandon).not.toHaveBeenCalled();
  });

it('disables the abandon action when status is already abandoned', () => {
render(
<AttemptHeader
title="Sample"
status="abandoned"
onAbandon={() => {}}
      />,
    );
expect(screen.getByTestId('attempt-header-abandon')).toBeDisabled();
  });
});

describe('AttemptHeader — accessibility', () => {
it('has an unambiguous accessible name on the abandon button', () => {
render(
<AttemptHeader
title="Sample"
status="in_progress"
onAbandon={() => {}}
      />,
    );
expect(
screen.getByRole('button', { name: /abandon attempt/i }),
    ).toBeInTheDocument();
  });
});

describe('AttemptHeader — invariant', () => {
it('does not render score, pass/fail, or completion controls', () => {
const { container } = render(
<AttemptHeader
title="Sample"
status="in_progress"
onAbandon={() => {}}
      />,
    );
expect(container.textContent).not.toMatch(
/isCorrect|score|pass|fail|complete/i,
    );
expect(
container.querySelector('[data-testid="attempt-header-complete"]'),
    ).toBeNull();
  });
});