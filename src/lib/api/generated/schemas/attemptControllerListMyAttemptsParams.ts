

import type { AttemptControllerListMyAttemptsStatus } from './attemptControllerListMyAttemptsStatus';
import type { AttemptControllerListMyAttemptsSortBy } from './attemptControllerListMyAttemptsSortBy';

export type AttemptControllerListMyAttemptsParams = {

cursor?: string | null;

limit?: number | null;

status?: AttemptControllerListMyAttemptsStatus;

quizId?: string | null;

categoryId?: string | null;

tagId?: string | null;

fromDate?: string | null;

toDate?: string | null;

sortBy?: AttemptControllerListMyAttemptsSortBy;
};
