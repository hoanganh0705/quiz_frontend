

import type {
QuizQuestionAuthorDto,
QuizAnswerOptionAuthorDto,
} from '@/lib/api/generated/schemas';

export type QuizAuthorQuestionDto = QuizQuestionAuthorDto;

export type QuizAuthorAnswerOptionDto = QuizAnswerOptionAuthorDto;

export interface CreateQuestionDto {

position: number;

questionText: string;

imageUrl?: string | null;

answerOptions: CreateAnswerOptionDto[];
}

export interface CreateAnswerOptionDto {

position: number;

value: string;

isCorrect: boolean;
}

export interface BulkCreateQuestionsDto {

questions: CreateQuestionDto[];
}

export interface BulkQuestionResultItem {

index: number;

status: number;

code: string;

message: string;

questionId?: string;
}

export interface BulkQuestionsResultDto {

questions: QuizAuthorQuestionDto[];

results: BulkQuestionResultItem[];
}

export const QUESTION_TYPE_VALUES = [
'single_choice',
'multiple_choice',
'true_false',
'short_answer',
] as const;

export type QuestionType = (typeof QUESTION_TYPE_VALUES)[number];

export const QUESTION_VALIDATION = {

TEXT_MIN: 1,
TEXT_MAX: 1000,

OPTION_TEXT_MIN: 1,
OPTION_TEXT_MAX: 200,

OPTIONS_MIN: 2,
OPTIONS_MAX: 6,

BULK_MIN: 1,
BULK_MAX: 50,

PUBLISH_MIN: 5,
} as const;
