

export type InstanceDetailResponseDtoStatus = typeof InstanceDetailResponseDtoStatus[keyof typeof InstanceDetailResponseDtoStatus];

export const InstanceDetailResponseDtoStatus = {
open: 'open',
countdown: 'countdown',
running: 'running',
closed: 'closed',
finished: 'finished',
} as const;
