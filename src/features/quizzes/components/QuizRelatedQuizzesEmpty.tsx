

export function QuizRelatedQuizzesEmpty(): never {
throw new Error(
'[QuizRelatedQuizzesEmpty] This component must never render — the ' +
'related block is hidden on empty per Story 3.8 line 880. If you ' +
'see this error, a future contributor has wired the empty state ' +
'into the live component. Revert that wiring and let <QuizRelatedQuizzes /> ' +
'return `null` on the empty / 404 / 5xx paths.',
  );
}

export default QuizRelatedQuizzesEmpty;
