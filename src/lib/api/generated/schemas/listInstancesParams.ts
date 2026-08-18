

import type { ListInstancesStatus } from './listInstancesStatus';
import type { ListInstancesDifficulty } from './listInstancesDifficulty';

export type ListInstancesParams = {

cursor?: string | null;

limit?: number | null;

status?: ListInstancesStatus;

difficulty?: ListInstancesDifficulty;

quizId?: string | null;

creatorId?: string | null;
};
