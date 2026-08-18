

export type ListInstancesStatus = typeof ListInstancesStatus[keyof typeof ListInstancesStatus] | null;

export const ListInstancesStatus = {
open: 'open',
countdown: 'countdown',
running: 'running',
closed: 'closed',
finished: 'finished',
} as const;
