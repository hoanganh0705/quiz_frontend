

export type AttemptResponseDtoContextType = typeof AttemptResponseDtoContextType[keyof typeof AttemptResponseDtoContextType];

export const AttemptResponseDtoContextType = {
solo: 'solo',
tournament: 'tournament',
} as const;
