

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

export const GOOGLE_SCOPES = ['openid', 'email', 'profile'] as const;

export function isGoogleAuthConfigured(): boolean {
return GOOGLE_CLIENT_ID.length > 0;
}

export function getGoogleClientId(): string {
return GOOGLE_CLIENT_ID;
}

export function getGoogleAuthRequestConfig(): {
client_id: string;
scope: string;
} {
return {
client_id: GOOGLE_CLIENT_ID,
scope: GOOGLE_SCOPES.join(' '),
  };
}
