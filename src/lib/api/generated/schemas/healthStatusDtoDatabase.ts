

export type HealthStatusDtoDatabase = typeof HealthStatusDtoDatabase[keyof typeof HealthStatusDtoDatabase];

export const HealthStatusDtoDatabase = {
up: 'up',
down: 'down',
} as const;
