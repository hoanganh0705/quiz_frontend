

export type InstanceLeaderboardEntryDtoStatus = typeof InstanceLeaderboardEntryDtoStatus[keyof typeof InstanceLeaderboardEntryDtoStatus];

export const InstanceLeaderboardEntryDtoStatus = {
joined: 'joined',
ready: 'ready',
playing: 'playing',
disconnected: 'disconnected',
finished: 'finished',
} as const;
