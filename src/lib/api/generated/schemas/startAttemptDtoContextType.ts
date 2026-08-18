

export type StartAttemptDtoContextType = typeof StartAttemptDtoContextType[keyof typeof StartAttemptDtoContextType] | null;

export const StartAttemptDtoContextType = {
solo: 'solo',
tournament: 'tournament',
} as const;
