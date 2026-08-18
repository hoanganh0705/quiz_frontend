

import type { NotificationResponseDtoType } from './notificationResponseDtoType';
import type { NotificationResponseDtoMetadata } from './notificationResponseDtoMetadata';
import type { NotificationResponseDtoChannel } from './notificationResponseDtoChannel';

export interface NotificationResponseDto {

notificationId: string;

userId: string;

type: NotificationResponseDtoType;

title: string;

message: string;

metadata: NotificationResponseDtoMetadata;

channel: NotificationResponseDtoChannel;

isRead: boolean;

readAt?: string | null;

createdAt: string;

expiresAt?: string | null;
}
