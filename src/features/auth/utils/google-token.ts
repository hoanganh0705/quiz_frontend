export interface GoogleTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  email?: string;
  email_verified?: boolean;
}

export interface GoogleIdentityResponse {
  credential?: string;
  id_token?: string;
  select_by?: string;
  clientId?: string;
}

function base64urlDecode(str: string): Record<string, unknown> | null {
  try {
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const decoded = atob(padded);
    const parsed: unknown = JSON.parse(decoded);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function parseGoogleResponse(
  response: GoogleIdentityResponse,
): string | null {
  if (!response) return null;

  const token = response.credential ?? response.id_token;

  if (typeof token !== "string" || token.length === 0) {
    return null;
  }

  return token;
}

export function decodeGoogleToken(token: string): GoogleTokenPayload | null {
  if (typeof token !== "string" || token.length === 0) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const payload = base64urlDecode(parts[1]!);
  if (!payload) {
    return null;
  }

  if (
    typeof payload.iss !== "string" ||
    typeof payload.aud !== "string" ||
    typeof payload.exp !== "number" ||
    typeof payload.iat !== "number" ||
    typeof payload.sub !== "string"
  ) {
    return null;
  }

  return {
    iss: payload.iss,
    aud: payload.aud,
    exp: payload.exp,
    iat: payload.iat,
    sub: payload.sub,
    ...(typeof payload.email === "string" ? { email: payload.email } : {}),
    ...(typeof payload.email_verified === "boolean"
      ? { email_verified: payload.email_verified }
      : {}),
  };
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeGoogleToken(token);
  if (!payload) return true;

  const now = Math.floor(Date.now() / 1000);

  return payload.exp < now;
}

export function getTokenExpiration(token: string): number | null {
  const payload = decodeGoogleToken(token);
  if (!payload) return null;
  return payload.exp;
}

export function getTokenIssuedAt(token: string): number | null {
  const payload = decodeGoogleToken(token);
  if (!payload) return null;
  return payload.iat;
}

export function getTokenSubject(token: string): string | null {
  const payload = decodeGoogleToken(token);
  if (!payload) return null;
  return payload.sub;
}

export function getTokenEmail(token: string): string | null {
  const payload = decodeGoogleToken(token);
  if (!payload) return null;
  return payload.email ?? null;
}
