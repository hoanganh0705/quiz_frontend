

export type RankMovementResponseDtoDirection = typeof RankMovementResponseDtoDirection[keyof typeof RankMovementResponseDtoDirection];

export const RankMovementResponseDtoDirection = {
up: 'up',
down: 'down',
same: 'same',
new: 'new',
} as const;
