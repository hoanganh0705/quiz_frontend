

'use client';

import {
computePublishReadiness,
type PublishReadiness,
} from '@/features/quizzes/types/publish.types';

export interface UsePublishReadinessOptions {

questionCount: number;
}

export interface UsePublishReadinessReturn extends PublishReadiness {

isLoading: false;
}

export function usePublishReadiness(
options: UsePublishReadinessOptions,
): UsePublishReadinessReturn {
const { questionCount } = options;

const readiness = computePublishReadiness(questionCount);

return {
...readiness,

isLoading: false,
  };
}
