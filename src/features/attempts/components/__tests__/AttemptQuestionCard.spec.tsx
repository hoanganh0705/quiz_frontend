

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { AttemptQuestionCard } from '@/features/attempts/components/AttemptQuestionCard';

import type { QuizQuestionPlayerDto } from '@/lib/api/generated/schemas';

function makeMultipleChoice(): QuizQuestionPlayerDto {
return {
questionId: 'q1',
questionText: 'Pick the correct answer',
orderIndex: 0,
imageUrl: null,
answerOptions: [
{ optionId: 'opt-a', text: 'Option A', value: 'a' },
{ optionId: 'opt-b', text: 'Option B', value: 'b' },
{ optionId: 'opt-c', text: 'Option C', value: 'c' },
    ],
  } as unknown as QuizQuestionPlayerDto;
}

describe('AttemptQuestionCard — rendering', () => {
it('renders question number, text, and options', () => {
render(
<AttemptQuestionCard
question={makeMultipleChoice()}
index={1}
total={3}
value={null}
onChange={() => {}}
isSubmitted={false}
isPending={false}
      />,
    );

expect(screen.getByText(/Pick the correct answer/)).toBeInTheDocument();
expect(screen.getByText('1/3')).toBeInTheDocument();
expect(screen.getByTestId('qc-q1-opt-a')).toBeInTheDocument();
  });

it('shows "Answered" badge when submitted', () => {
render(
<AttemptQuestionCard
question={makeMultipleChoice()}
index={1}
total={1}
value={{ kind: 'multiple_choice', questionId: 'q1', selectedOptionIds: ['opt-b'] }}
onChange={() => {}}
isSubmitted={true}
isPending={false}
      />,
    );

expect(screen.getByText('Answered')).toBeInTheDocument();
  });

it('shows hint when answer is selected but not submitted', () => {
render(
<AttemptQuestionCard
question={makeMultipleChoice()}
index={1}
total={1}
value={{ kind: 'multiple_choice', questionId: 'q1', selectedOptionIds: ['opt-b'] }}
onChange={() => {}}
isSubmitted={false}
isPending={false}
      />,
    );

expect(screen.getByText(/Your answer will be submitted when you complete the quiz/)).toBeInTheDocument();
  });

it('does not show hint when no answer selected', () => {
render(
<AttemptQuestionCard
question={makeMultipleChoice()}
index={1}
total={1}
value={null}
onChange={() => {}}
isSubmitted={false}
isPending={false}
      />,
    );

expect(screen.queryByText(/Your answer will be submitted when you complete the quiz/)).not.toBeInTheDocument();
  });
});

describe('AttemptQuestionCard — player DTO invariant', () => {
it('does not render correctness / score text', () => {
const { container } = render(
<AttemptQuestionCard
question={makeMultipleChoice()}
index={1}
total={1}
value={null}
onChange={() => {}}
isSubmitted={false}
isPending={false}
      />,
    );

expect(container.textContent).not.toMatch(/isCorrect|correctCount|pass|fail|ScorePercent|completed: true/i);
  });
});

describe('AttemptQuestionCard — question invalid', () => {
it('renders an invalid question in a non-blocking affordance', () => {
render(
<AttemptQuestionCard
question={makeMultipleChoice()}
index={2}
total={5}
value={null}
onChange={() => {}}
isSubmitted={false}
isPending={false}
isQuestionInvalid
      />,
    );

expect(screen.getByText('2/5')).toBeInTheDocument();
expect(screen.getByTestId('question-card-q1')).toBeInTheDocument();
  });
});
