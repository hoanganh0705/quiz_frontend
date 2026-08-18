

import type { CreateQuizDto } from '@/lib/api/generated/schemas';

export interface SlugAvailabilityResult {
available: boolean;
slug: string;
}

export interface TagResolutionResult {
tagIds: string[] | null;
isResolving: boolean;
error: string | null;
}

export type CreateQuizSubmitPayload = Omit<CreateQuizDto, 'tagIds'> & {

tagIds?: string[];
};

export interface CreateQuizSuccessResult {
id: string;
slug: string;
}
