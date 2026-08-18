

import type { GetNotificationsType } from './getNotificationsType';

export type GetNotificationsParams = {

limit?: number;

cursor?: string;

unreadOnly?: boolean;

includeArchived?: boolean;

type?: GetNotificationsType;

fromDate?: string | null;

toDate?: string | null;
};
