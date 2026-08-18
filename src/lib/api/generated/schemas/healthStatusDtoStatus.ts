

export type HealthStatusDtoStatus = typeof HealthStatusDtoStatus[keyof typeof HealthStatusDtoStatus];

export const HealthStatusDtoStatus = {
up: 'up',
down: 'down',
degraded: 'degraded',
} as const;
