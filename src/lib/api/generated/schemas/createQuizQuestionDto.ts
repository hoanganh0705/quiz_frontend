

import type { CreateQuizAnswerOptionDto } from './createQuizAnswerOptionDto';

export interface CreateQuizQuestionDto {

position: number;

questionText: string;

imageUrl?: string | null;

answerOptions: CreateQuizAnswerOptionDto;
}
