

import type { AbandonAttemptResponseDtoStatus } from './abandonAttemptResponseDtoStatus';

export interface AbandonAttemptResponseDto {

attemptId: string;

status: AbandonAttemptResponseDtoStatus;

finishedAt: string;

message: string;
}
