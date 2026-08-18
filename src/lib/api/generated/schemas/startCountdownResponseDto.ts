

import type { StartCountdownResponseDtoStatus } from './startCountdownResponseDtoStatus';

export interface StartCountdownResponseDto {

instanceId: string;

status: StartCountdownResponseDtoStatus;

countdownStartedAt: string;

countdownEndsAt: string;
}
