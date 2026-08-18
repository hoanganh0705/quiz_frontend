

import type { QuizVersionResponseDto } from '@/lib/api/generated/schemas';

export const PUBLISH_MIN_QUESTIONS = 5;

export function publishResultKey(
quizId: string,
versionId: string,
): ['quiz', 'publish', string, string] {
return ['quiz', 'publish', quizId, versionId];
}

export interface PublishReadiness {

isReady: boolean;

questionCount: number;

minRequired: number;

disabledReason: 'QUIZ_INSUFFICIENT_QUESTIONS' | null;

tooltipContent: string | null;
}

export type PublishResult = QuizVersionResponseDto;

export function computePublishReadiness(questionCount: number): PublishReadiness {
const isReady = questionCount >= PUBLISH_MIN_QUESTIONS;

return {
isReady,
questionCount,
minRequired: PUBLISH_MIN_QUESTIONS,
disabledReason: isReady ? null : 'QUIZ_INSUFFICIENT_QUESTIONS',
tooltipContent: isReady
? null
: `Add at least ${PUBLISH_MIN_QUESTIONS} questions to publish.`,
  };
}
