

import { getQuizzes } from '@/lib/api';

import type {
CreateQuizQuestionDto,
CreateQuizQuestionsDto,
CreateQuizAnswerOptionDto,
QuizQuestionAuthorDto,
BulkQuizQuestionsResponseDto,
} from '@/lib/api/generated/schemas';

import type {
QuizAuthorQuestionDto,
BulkQuestionsResultDto,
CreateQuestionDto,
BulkCreateQuestionsDto,
} from '@/features/quizzes/types/author-dtos';

export type {
QuizControllerCreateQuizQuestionResult,
QuizControllerCreateQuizQuestionsResult,
} from '@/lib/api/generated/quizzes/quizzes';

export async function listVersionQuestions(
quizId: string,
versionId: string,
params?: { cursor?: string; limit?: number },
): Promise<{ questions: QuizAuthorQuestionDto[]; nextCursor?: string }> {
const sdk = getQuizzes();

const response = await sdk.quizControllerGetQuizVersionDetail(quizId, versionId);

const data = (response as unknown as { data?: { questions?: QuizQuestionAuthorDto[] } }).data;
const questions = data?.questions ?? [];

return {
questions: questions as unknown as QuizAuthorQuestionDto[],
nextCursor: undefined, // TODO: Add cursor pagination when endpoint supports it
  };
}

export async function createVersionQuestion(
quizId: string,
versionId: string,
payload: CreateQuestionDto,
): Promise<QuizAuthorQuestionDto> {
const sdk = getQuizzes();

const sdkPayload = {
position: payload.position,
questionText: payload.questionText,
imageUrl: payload.imageUrl,
answerOptions: payload.answerOptions.map((opt) => opt as unknown as CreateQuizAnswerOptionDto),
  } as unknown as CreateQuizQuestionDto;

const response = await sdk.quizControllerCreateQuizQuestion(quizId, versionId, sdkPayload);

const data = (response as unknown as { data?: QuizAuthorQuestionDto }).data;
if (!data) {
throw new Error('Unexpected response shape from POST /quizzes/:id/versions/:versionId/questions');
  }

return data;
}

export async function bulkCreateVersionQuestions(
quizId: string,
versionId: string,
payload: BulkCreateQuestionsDto,
): Promise<BulkQuestionsResultDto> {
const sdk = getQuizzes();

const sdkPayload = {
questions: payload.questions.map((q) => ({
position: q.position,
questionText: q.questionText,
imageUrl: q.imageUrl,
answerOptions: q.answerOptions.map((opt) => opt as unknown as CreateQuizAnswerOptionDto),
    })),
  } as unknown as CreateQuizQuestionsDto;

const response = await sdk.quizControllerCreateQuizQuestions(quizId, versionId, sdkPayload);

const data = (response as unknown as { data?: BulkQuizQuestionsResponseDto }).data;
if (!data) {
throw new Error('Unexpected response shape from POST /quizzes/:id/versions/:versionId/questions/bulk');
  }

const createdQuestions = data.questions ?? [];

const results: BulkQuestionsResultDto['results'] = data.results
? data.results.map((r) => ({
index: r.index,
status: r.status,
code: r.code ?? '',
message: r.message ?? '',
questionId:
typeof r.questionId === 'string' ? r.questionId : undefined,
      }))
: createdQuestions.map((q, i) => ({
index: i,
status: 201,
code: '',
message: '',
questionId: q.questionId,
      }));

return {
questions: createdQuestions as unknown as QuizAuthorQuestionDto[],
results,
  };
}
