

export type InstanceListItemDtoStatus = typeof InstanceListItemDtoStatus[keyof typeof InstanceListItemDtoStatus];

export const InstanceListItemDtoStatus = {
open: 'open',
countdown: 'countdown',
running: 'running',
closed: 'closed',
finished: 'finished',
} as const;
