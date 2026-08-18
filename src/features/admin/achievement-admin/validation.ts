

import { z } from 'zod';

export const UUIDV4_REGEX =
/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateUserId(
id: unknown,
): { ok: true; value: string } | { ok: false; reason: 'not-a-string' | 'invalid-uuid' } {
if (typeof id !== 'string' || id.trim() === '') {
return { ok: false, reason: 'not-a-string' };
  }
if (!UUIDV4_REGEX.test(id)) {
return { ok: false, reason: 'invalid-uuid' };
  }
return { ok: true, value: id };
}

export function validateBadgeId(
id: unknown,
): { ok: true; value: string } | { ok: false; reason: 'not-a-string' | 'invalid-uuid' } {
if (typeof id !== 'string' || id.trim() === '') {
return { ok: false, reason: 'not-a-string' };
  }
if (!UUIDV4_REGEX.test(id)) {
return { ok: false, reason: 'invalid-uuid' };
  }
return { ok: true, value: id };
}

export function isSelfRevokeAttempt(
targetUserId: string | null | undefined,
currentUserId: string | null | undefined,
): boolean {
if (!targetUserId || !currentUserId) {
return false;
  }
return targetUserId === currentUserId;
}

export const zodUuidV4 = z.string().regex(UUIDV4_REGEX, 'Must be a valid UUIDv4');
