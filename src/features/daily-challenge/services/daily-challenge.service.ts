

import { ApiError, getDailyChallenge, isApiError } from '@/lib/api';

import type {
DailyChallengeAnswerResponseView,
DailyChallengeHistoryItemView,
DailyChallengeHistoryPage,
DailyChallengeResult,
DailyChallengeView,
GetDailyChallengeHistoryParams,
SubmitDailyChallengeAnswerParams,
} from '../types/dto';
import type { DailyChallengeHistoryResponseDto } from '@/lib/api/generated/schemas/dailyChallengeHistoryResponseDto';

const HAS_DAILY_CHALLENGE_SDK = true;

function toErrorResult(error: unknown): { kind: 'error'; error: ApiError } {
if (isApiError(error)) {
return { kind: 'error', error };
  }
throw error;
}

function toNumberOrNull(value: unknown): number | null {
if (value === null || value === undefined) return null;
if (typeof value === 'number') return value;
if (typeof value === 'string') {
const parsed = Number(value);
return Number.isFinite(parsed) ? parsed : null;
  }
return null;
}

function toStringOrNull(value: unknown): string | null {
if (value === null || value === undefined) return null;
if (typeof value === 'string') return value;
if (typeof value === 'number') return String(value);
return null;
}

function toTodayView(
dto:
| NonNullable<
Awaited<
ReturnType<
ReturnType<
typeof getDailyChallenge
            >['dailyChallengeControllerGetToday']
          >
        >['data']
      >
    | undefined,
): DailyChallengeView | null {
if (!dto) return null;
const difficulty = (dto.difficulty ?? 'medium') as 'easy' | 'medium' | 'hard';
return {
id: dto.quizId,
date: dto.date,
quizId: dto.quizId,
quizTitle: dto.quizTitle ?? '',
slug: dto.slug ?? '',
difficulty,
category: difficulty,
totalQuestions: dto.questionCount,
rewardXp: dto.rewardXp,
expiresAt: dto.expiresAt,
status: dto.status,
scorePercent: toNumberOrNull(dto.scorePercent),
rank: toNumberOrNull(dto.rank),
  };
}

function toHistoryItemView(
dto: DailyChallengeHistoryResponseDto['items'][number] | undefined,
): DailyChallengeHistoryItemView | null {
if (!dto) return null;
const difficulty = (dto.difficulty ?? 'medium') as 'easy' | 'medium' | 'hard';
return {
id: `${dto.date}-${dto.quizId}`,
date: dto.date,
quizId: dto.quizId,
quizTitle: dto.quizTitle ?? 'Untitled quiz',
slug: dto.slug ?? '',
difficulty,
category: difficulty,
score: dto.score,
rank: dto.rank,
isTopTen: dto.rank > 0 && dto.rank <= 10,
  };
}

export async function getDailyChallengeToday(): Promise<
DailyChallengeResult<DailyChallengeView>
> {
if (!HAS_DAILY_CHALLENGE_SDK) {
return { kind: 'missing-endpoint' };
  }
try {
const envelope = await getDailyChallenge().dailyChallengeControllerGetToday();
const view = toTodayView(envelope?.data);
if (!view) {
return {
kind: 'error',
error: ApiError.fromInput({
status: 500,
code: 'GLOBAL_INTERNAL_ERROR',
message: 'Daily challenge today payload missing',
        }),
      };
    }
return { kind: 'ok', data: view };
  } catch (error) {
return toErrorResult(error);
  }
}

export async function getDailyChallengeHistoryPage(
params: GetDailyChallengeHistoryParams,
): Promise<DailyChallengeResult<DailyChallengeHistoryPage>> {
if (!HAS_DAILY_CHALLENGE_SDK) {
return { kind: 'missing-endpoint' };
  }
try {
const response = await getDailyChallenge().dailyChallengeControllerGetHistory(
{
...(params.cursor ? { cursor: params.cursor } : {}),
limit: params.limit,
      },
    );
const pages = (response?.data ?? []) as DailyChallengeHistoryResponseDto[];
const firstPage = pages[0];
const items = (firstPage?.items ?? [])
      .map((dto) => toHistoryItemView(dto))
      .filter((item): item is DailyChallengeHistoryItemView => item !== null);
const pagination = firstPage?.pagination;

return {
kind: 'ok',
data: {
items,
nextCursor: toStringOrNull(pagination?.nextCursor),
hasNextPage: pagination?.hasNextPage ?? false,
limit: pagination?.limit ?? params.limit ?? 5,
      },
    };
  } catch (error) {
return toErrorResult(error);
  }
}

export async function submitDailyChallengeAnswer(
payload: SubmitDailyChallengeAnswerParams,
): Promise<DailyChallengeResult<DailyChallengeAnswerResponseView>> {
if (!HAS_DAILY_CHALLENGE_SDK) {
return { kind: 'missing-endpoint' };
  }
try {

const body: import('@/lib/api/generated/schemas/dailyChallengeAnswerDto').DailyChallengeAnswerDto = {
questionIndex: payload.questionIndex,
...(payload.selectedOptionId !== null
? { selectedOptionId: payload.selectedOptionId as unknown as Record<string, unknown> }
: {}),
    };
const response =
await getDailyChallenge().dailyChallengeControllerSubmitAnswer(body);
const dto = response?.data;
if (!dto) {
return {
kind: 'error',
error: ApiError.fromInput({
status: 500,
code: 'GLOBAL_INTERNAL_ERROR',
message: 'Daily challenge answer payload missing',
        }),
      };
    }
return {
kind: 'ok',
data: {
correct: dto.correct,
nextQuestionIndex: dto.nextQuestionIndex,
totalQuestions: dto.totalQuestions,
completed: dto.completed,
scorePercent: toNumberOrNull(dto.scorePercent),
      },
    };
  } catch (error) {
return toErrorResult(error);
  }
}

export type {
DailyChallengeAnswerResponseView,
DailyChallengeHistoryItemView,
DailyChallengeHistoryPage,
DailyChallengeResult,
DailyChallengeView,
GetDailyChallengeHistoryParams,
SubmitDailyChallengeAnswerParams,
} from '../types/dto';