

export type InstancePlayerResponseDtoStatus = typeof InstancePlayerResponseDtoStatus[keyof typeof InstancePlayerResponseDtoStatus];

export const InstancePlayerResponseDtoStatus = {
joined: 'joined',
ready: 'ready',
playing: 'playing',
disconnected: 'disconnected',
finished: 'finished',
} as const;
