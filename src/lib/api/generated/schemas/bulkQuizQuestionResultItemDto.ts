

import type { BulkQuizQuestionResultItemDtoQuestionId } from './bulkQuizQuestionResultItemDtoQuestionId';

export interface BulkQuizQuestionResultItemDto {

index: number;

status: number;

code: string;

message: string;

questionId: BulkQuizQuestionResultItemDtoQuestionId;
}
