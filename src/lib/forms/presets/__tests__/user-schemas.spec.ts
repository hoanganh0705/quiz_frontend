/**
 * `lib/forms/presets/__tests__/user-schemas.spec.ts` — locks the user
 * schema contracts.
 *
 * Source epic:   Epic 4.3 — Edit profile + user settings.
 * Source ticket: TKT-4.3.A1.
 *
 * Coverage contract:
 *
 *   - `updateMyProfileSchema` accepts a valid minimal payload and rejects
 *     over-length displayName and bio.
 *   - `updateMyProfileSchema` accepts null values for nullable fields.
 *   - `updateMyProfileSchema` is PATCH-shaped (all fields optional).
 *   - `updateMySettingsSchema` rejects a payload where all notification
 *     channels are `false`.
 *   - `updateMySettingsSchema` accepts a payload where at least one
 *     channel is `true`.
 *   - `updateMySettingsSchema` accepts a partial payload (PATCH semantics).
 *   - `updateMySettingsSchema` rejects unknown top-level keys (`.strict()`).
 */

import { describe, expect, it } from 'vitest';

import {
  AT_LEAST_ONE_CHANNEL_MESSAGE,
  updateMyProfileSchema,
  updateMySettingsSchema,
} from '../index';

// ─── updateMyProfileSchema ──────────────────────────────────────────────────────

describe('updateMyProfileSchema', () => {
  it('accepts a valid minimal payload (empty object)', () => {
    const result = updateMyProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts a valid full payload', () => {
    const result = updateMyProfileSchema.safeParse({
      displayName: 'Jane Doe',
      bio: 'Quiz enthusiast from Berlin.',
      pronouns: 'she/her',
      location: 'Berlin, Germany',
      websiteUrl: 'https://janedoe.example',
      avatarUrl: 'https://cdn.example/avatars/jane.png',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a payload with only displayName', () => {
    const result = updateMyProfileSchema.safeParse({
      displayName: 'New Name',
    });
    expect(result.success).toBe(true);
  });

  it('accepts nullable fields set to null', () => {
    const result = updateMyProfileSchema.safeParse({
      bio: null,
      pronouns: null,
      location: null,
      websiteUrl: null,
      avatarUrl: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts an empty string for websiteUrl (optional URL cleared)', () => {
    const result = updateMyProfileSchema.safeParse({
      websiteUrl: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects displayName exceeding 100 characters', () => {
    const result = updateMyProfileSchema.safeParse({
      displayName: 'A'.repeat(101),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/100/);
    }
  });

  it('rejects bio exceeding 500 characters', () => {
    const result = updateMyProfileSchema.safeParse({
      bio: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/500/);
    }
  });

  it('rejects pronouns exceeding 30 characters', () => {
    const result = updateMyProfileSchema.safeParse({
      pronouns: 'A'.repeat(31),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/30/);
    }
  });

  it('rejects location exceeding 100 characters', () => {
    const result = updateMyProfileSchema.safeParse({
      location: 'A'.repeat(101),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/100/);
    }
  });

  it('rejects an invalid websiteUrl (not a URL)', () => {
    const result = updateMyProfileSchema.safeParse({
      websiteUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid avatarUrl (not a URL)', () => {
    const result = updateMyProfileSchema.safeParse({
      avatarUrl: 'not-a-url-at-all',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown top-level keys (strict mode)', () => {
    const result = updateMyProfileSchema.safeParse({
      unknownField: 'should fail',
    });
    expect(result.success).toBe(false);
  });
});

// ─── updateMySettingsSchema ────────────────────────────────────────────────────

describe('updateMySettingsSchema', () => {
  it('accepts a valid minimal payload (empty object)', () => {
    const result = updateMySettingsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts a full preferences + privacy payload', () => {
    const result = updateMySettingsSchema.safeParse({
      preferences: {
        notificationChannels: {
          inApp: true,
          email: false,
          push: false,
          marketing: false,
        },
        theme: 'dark',
        marketingOptIn: false,
      },
      privacy: {
        isPublic: true,
        showStatistics: true,
        showAchievements: true,
        showActivity: false,
        showRankImprovement: false,
        showTournamentActivity: false,
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts at least one channel enabled (inApp only)', () => {
    const result = updateMySettingsSchema.safeParse({
      preferences: {
        notificationChannels: {
          inApp: true,
          email: false,
          push: false,
          marketing: false,
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts at least one channel enabled (email only)', () => {
    const result = updateMySettingsSchema.safeParse({
      preferences: {
        notificationChannels: {
          inApp: false,
          email: true,
          push: false,
          marketing: false,
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects all channels disabled', () => {
    const result = updateMySettingsSchema.safeParse({
      preferences: {
        notificationChannels: {
          inApp: false,
          email: false,
          push: false,
          marketing: false,
        },
      },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(AT_LEAST_ONE_CHANNEL_MESSAGE);
      expect(result.error.issues[0]?.path).toContain('notificationChannels');
    }
  });

  it('accepts a partial preferences payload (PATCH semantics)', () => {
    const result = updateMySettingsSchema.safeParse({
      preferences: {
        notificationChannels: {
          inApp: true,
          email: true,
          push: true,
          marketing: false,
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts privacy-only payload', () => {
    const result = updateMySettingsSchema.safeParse({
      privacy: {
        isPublic: false,
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts null preferences (clear preferences)', () => {
    const result = updateMySettingsSchema.safeParse({
      preferences: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts theme values light / dark / system', () => {
    for (const theme of ['light', 'dark', 'system'] as const) {
      const result = updateMySettingsSchema.safeParse({
        preferences: { theme },
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects an invalid theme value', () => {
    const result = updateMySettingsSchema.safeParse({
      preferences: { theme: 'midnight' },
    });
    expect(result.success).toBe(false);
  });

  it('accepts marketingOptIn boolean', () => {
    const result = updateMySettingsSchema.safeParse({
      preferences: { marketingOptIn: true },
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown top-level keys (strict mode)', () => {
    const result = updateMySettingsSchema.safeParse({
      unknownTopLevel: 'should fail',
    });
    expect(result.success).toBe(false);
  });
});
