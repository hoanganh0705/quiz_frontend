

export type NotificationResponseDtoChannel = typeof NotificationResponseDtoChannel[keyof typeof NotificationResponseDtoChannel];

export const NotificationResponseDtoChannel = {
in_app: 'in_app',
email: 'email',
push: 'push',
} as const;
