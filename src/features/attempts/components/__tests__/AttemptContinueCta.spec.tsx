

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { AttemptContinueCta } from '@/features/attempts/components/AttemptContinueCta';

const routerPush = vi.fn();
vi.mock('next/navigation', () => ({
useRouter: () => ({ push: routerPush, replace: vi.fn() }),
}));

vi.mock('@/lib/forms/useToast', () => ({
useToast: () => ({ push: vi.fn(), dismiss: vi.fn() }),
}));

import type { AttemptSummaryResponseDto } from '@/lib/api/generated/schemas';

function makeActive(): AttemptSummaryResponseDto {
return {
attemptId: 'att-1',
quizId: 'quiz-1',
quizVersionId: 'v-1',
status: 'started',
startedAt: '2026-08-01T00:00:00.000Z',
submittedCount: 0,
totalQuestions: 5,
  } as unknown as AttemptSummaryResponseDto;
}

describe('AttemptContinueCta — visibility', () => {
it('renders when an active `started` attempt is present', () => {
render(
<AttemptContinueCta
activeAttempt={makeActive()}
idOrSlug="my-quiz"
      />,
    );
expect(
screen.getByTestId('quiz-continue-attempt-button'),
    ).toBeInTheDocument();
  });

it('does not render when the attempt is null', () => {
const { container } = render(
<AttemptContinueCta activeAttempt={null} idOrSlug="my-quiz" />,
    );
expect(container.firstChild).toBeNull();
  });

it('does not render when the attempt is completed', () => {
const completed = {
...makeActive(),
status: 'completed',
    } as unknown as AttemptSummaryResponseDto;
const { container } = render(
<AttemptContinueCta activeAttempt={completed} idOrSlug="my-quiz" />,
    );
expect(container.firstChild).toBeNull();
  });

it('does not render when the attempt is abandoned', () => {
const abandoned = {
...makeActive(),
status: 'abandoned',
    } as unknown as AttemptSummaryResponseDto;
const { container } = render(
<AttemptContinueCta activeAttempt={abandoned} idOrSlug="my-quiz" />,
    );
expect(container.firstChild).toBeNull();
  });
});

describe('AttemptContinueCta — click', () => {
it('routes once to /attempt without issuing a start request', () => {
render(
<AttemptContinueCta
activeAttempt={makeActive()}
idOrSlug="my-quiz"
      />,
    );
fireEvent.click(screen.getByTestId('quiz-continue-attempt-button'));
expect(routerPush).toHaveBeenCalledTimes(1);
expect(routerPush).toHaveBeenCalledWith('/quizzes/my-quiz/attempt');
  });
});