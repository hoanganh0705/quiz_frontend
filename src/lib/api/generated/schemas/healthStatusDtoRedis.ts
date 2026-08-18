

export type HealthStatusDtoRedis = typeof HealthStatusDtoRedis[keyof typeof HealthStatusDtoRedis];

export const HealthStatusDtoRedis = {
up: 'up',
down: 'down',
} as const;
