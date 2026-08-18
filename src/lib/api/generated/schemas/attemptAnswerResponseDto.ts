

export interface AttemptAnswerResponseDto {

attemptAnswerId: string;

questionId: string;

selectedOptionId?: string | null;

answeredAt: string;

timeTakenMs?: number | null;
}
