

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { AttemptQuestionFeedback } from '@/features/attempts/components/AttemptQuestionFeedback';

afterEach(() => {
cleanup();
});

describe('AttemptQuestionFeedback — projection', () => {
it('renders the feedback text when the projection exposes it', () => {
render(<AttemptQuestionFeedback feedback="Because X is correct." />);
expect(screen.getByTestId('attempt-question-feedback')).toBeInTheDocument();
expect(screen.getByTestId('attempt-question-feedback-body')).toHaveTextContent(
'Because X is correct.',
    );
  });

it('trims surrounding whitespace before rendering', () => {
render(<AttemptQuestionFeedback feedback="   Trimmed.   " />);
expect(screen.getByTestId('attempt-question-feedback-body')).toHaveTextContent(
'Trimmed.',
    );
  });

it('renders nothing when the feedback is null', () => {
const { container } = render(<AttemptQuestionFeedback feedback={null} />);
expect(container.firstChild).toBeNull();
  });

it('renders nothing when the feedback is empty or whitespace', () => {
const { container: c1 } = render(
<AttemptQuestionFeedback feedback="" />,
    );
expect(c1.firstChild).toBeNull();
const { container: c2 } = render(
<AttemptQuestionFeedback feedback="   " />,
    );
expect(c2.firstChild).toBeNull();
  });
});

describe('AttemptQuestionFeedback — accessibility', () => {
it('exposes the feedback region with a labelled heading', () => {
render(<AttemptQuestionFeedback feedback="Because X." />);
const region = screen.getByTestId('attempt-question-feedback');
const heading = screen.getByRole('heading', { name: 'Explanation' });
expect(heading).toBeInTheDocument();
expect(region).toHaveAttribute('aria-labelledby', heading.id);
  });
});