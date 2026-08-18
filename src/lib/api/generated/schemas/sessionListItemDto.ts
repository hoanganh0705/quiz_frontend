

export interface SessionListItemDto {

sessionId: string;

deviceBrowser: string | null;

deviceOs: string | null;

deviceType: string;

ipAddress: string | null;

lastActiveAt: string;

isCurrentSession: boolean;
}
