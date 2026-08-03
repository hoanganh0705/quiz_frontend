/**
 * `lib/forms/presets/user-schemas.ts` — profile + settings Zod schemas.
 *
 * Source epic:   Epic 4.3 — Edit profile + user settings.
 * Source ticket: TKT-4.3.A1.
 *
 * ## What this module owns
 *
 * Two Zod schemas for the profile-edit and settings forms:
 *
 *   - `updateMyProfileSchema` — `PATCH /users/me` (displayName, bio,
 *     avatarUrl). Mirrors `UpdateMeDto`.
 *
 *   - `updateMySettingsSchema` — `PATCH /users/me/settings` (preferences
 *     + privacy). Mirrors `UpdateMeSettingsDto`.
 *
 * Both schemas are PATCH-shaped (all fields optional) so they can be
 * used directly as the `useQuizForm` schema without re-defining every
 * field as `.optional()`. The backend accepts partial bodies.
 *
 * ## What this module does NOT own
 *
 *   - Username editing — username is immutable after creation. The edit
 *     form does NOT include a username field (TKT-4.3.D1 handles the
 *     form composition).
 *   - `pronouns`, `location`, `websiteUrl` — these fields are absent from
 *     the generated `UpdateMeDto`. The epic (PHASE_4_EPICS.md lines 296–300)
 *     lists them as intended fields but the generated DTO does not yet
 *     include them. This file adds them as `TODO:` markers with the
 *     expected shape. When the backend regenerates the DTO to include
 *     these fields, the TODO comments are the replacement points.
 *   - Theme and marketing opt-in — absent from the generated DTO.
 *     Added as `TODO:` markers with expected shape.
 *
 * ## Notification channel guard
 *
 * `updateMySettingsSchema` includes a `refine()` on `preferences` that
 * enforces "at least one notification channel is enabled". This guard
 * mirrors the Phase 4 cross-batch invariant: "Notification channels:
 * multi-select with at least one channel enabled (last-channel-removal
 * blocked with explanatory copy)." The constraint is enforced at the
 * schema level so no server round-trip is wasted on an invalid payload.
 */

import { z } from "zod";

import type {
  UpdateMeDto,
  UpdateMeSettingsDto,
  UpdateMeSettingsDtoPreferences,
  UpdateMeSettingsDtoPrivacy,
} from "@/lib/api/generated/schemas";

/**
 * Notification channel sub-object. Required when present so the
 * zod shape mirrors `defaultSettings.notificationChannels`.
 */
const notificationChannelsSchema = z.object({
  inApp: z.boolean(),
  email: z.boolean(),
  push: z.boolean(),
  marketing: z.boolean(),
});

/**
 * Refinement message for the at-least-one-channel guard.
 * Mirrored in `NotificationSettings` (TKT-4.3.C2) as a client-side
 * toggle-block fallback when the schema validation fires server-side.
 */
export const AT_LEAST_ONE_CHANNEL_MESSAGE =
  "At least one notification channel must be enabled.";

// ────────────────────────────────────────────────────────────────────────
// updateMyProfileSchema — PATCH /users/me
// ────────────────────────────────────────────────────────────────────────

/**
 * Form schema for the profile-edit form.
 *
 * All fields are optional because `PATCH /users/me` accepts partial bodies.
 *
 * TODO (TKT-4.3.A1): The backend `UpdateMeDto` currently only includes
 * `displayName`, `bio`, and `avatarUrl`. When the backend regenerates
 * `UpdateMeDto` to include `pronouns`, `location`, and `websiteUrl`,
 * remove the TODO comments below and align with the generated DTO.
 */
export const updateMyProfileSchema = z
  .object({
    /**
     * Display name shown in the app.
     * @maxLength 100
     */
    displayName: z
      .string()
      .max(100, "Display name cannot exceed 100 characters.")
      .optional(),

    /**
     * Short bio shown on the profile.
     * @maxLength 500
     */
    bio: z
      .string()
      .max(500, "Bio cannot exceed 500 characters.")
      .optional()
      .nullable(),

    // TODO (TKT-4.3.A1): Remove this block once `UpdateMeDto` includes
    // `pronouns`. Expected: `pronouns?: string | null; @maxLength 30`.
    /**
     * Pronouns shown on the profile.
     * TODO: align with `UpdateMeDto.pronouns` once the backend regenerates.
     * @maxLength 30
     */
    pronouns: z
      .string()
      .max(30, "Pronouns cannot exceed 30 characters.")
      .optional()
      .nullable(),

    // TODO (TKT-4.3.A1): Remove this block once `UpdateMeDto` includes
    // `location`. Expected: `location?: string | null; @maxLength 100`.
    /**
     * User's location.
     * TODO: align with `UpdateMeDto.location` once the backend regenerates.
     * @maxLength 100
     */
    location: z
      .string()
      .max(100, "Location cannot exceed 100 characters.")
      .optional()
      .nullable(),

    // TODO (TKT-4.3.A1): Remove this block once `UpdateMeDto` includes
    // `websiteUrl`. Expected: `websiteUrl?: string | null; @maxLength 2048;
    // @format uri`.
    /**
     * Personal website URL.
     * TODO: align with `UpdateMeDto.websiteUrl` once the backend regenerates.
     * @maxLength 2048
     */
    websiteUrl: z
      .string()
      .url("Website URL must be a valid URL.")
      .max(2048, "Website URL cannot exceed 2048 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),

    /**
     * Avatar image URL.
     * @maxLength 2048
     */
    avatarUrl: z
      .string()
      .url("Avatar URL must be a valid URL.")
      .max(2048, "Avatar URL cannot exceed 2048 characters.")
      .optional()
      .nullable(),
  })
  .strict();

/**
 * Inferred form values for the profile-edit form.
 * Compatible with `PATCH /users/me` via `updateMyProfile()`.
 */
export type UpdateMyProfileFormValues = z.infer<typeof updateMyProfileSchema>;

// ────────────────────────────────────────────────────────────────────────
// updateMySettingsSchema — PATCH /users/me/settings
// ────────────────────────────────────────────────────────────────────────

/**
 * Guard: at least one notification channel must be enabled.
 * Applied only when `notificationChannels` is present in the payload.
 */
const atLeastOneNotificationChannel = (
  prefs: UpdateMeSettingsDtoPreferences | undefined,
): boolean => {
  if (!prefs || typeof prefs !== "object") return true;
  const channels = (prefs as Record<string, unknown>).notificationChannels;
  // Guard: if notificationChannels is absent or null, skip the check.
  // The field is optional so callers can send a partial payload.
  if (!channels || channels === null) return true;
  if (typeof channels !== "object") return true;
  const { inApp, email, push, marketing } = channels as Record<
    string,
    boolean | undefined
  >;
  return !!(inApp || email || push || marketing);
};

/**
 * Form schema for the settings form.
 *
 * All fields are optional because `PATCH /users/me/settings` accepts
 * partial bodies. Sending `{ preferences: { notificationChannels: { inApp: true } } }`
 * updates only the `inApp` flag.
 *
 * TODO (TKT-4.3.A1): The backend `UpdateMeSettingsDto` uses a free-form
 * `preferences: { [key: string]: unknown }` JSON blob and a
 * `privacy: UserPrivacySettingsDto` shape. The schema below reflects the
 * Phase 2 UI shape (`features/users/constants/settings.ts`). When the
 * backend regenerates the DTO with a structured preferences schema,
 * replace the TODO sections below.
 */
export const updateMySettingsSchema = z
  .object({
    /**
     * Preferences sub-object. Mirrors `defaultSettings` from Phase 2.
     *
     * `notificationChannels` is optional so partial payloads (PATCH semantics)
     * do not require the full channel object. When present, the `refine()`
     * guard enforces at-least-one-channel.
     *
     * TODO (TKT-4.3.A1): If the backend regenerates `UpdateMeSettingsDto`
     * to use a typed `preferences` shape, replace this with the generated
     * type and add the at-least-one-channel guard as a `.refine()` on the
     * `notificationChannels` field directly.
     */
    preferences: z
      .object({
        /**
         * Notification delivery channels.
         * Optional so partial PATCH payloads are valid.
         * The `refine()` guard enforces at-least-one-channel when present.
         */
        notificationChannels: notificationChannelsSchema.optional(),

        // TODO (TKT-4.3.A1): Remove this block once `UpdateMeSettingsDto`
        // includes `theme` / `marketingOptIn`. Expected shape:
        //   theme?: 'light' | 'dark' | 'system';
        //   marketingOptIn?: boolean;
        /**
         * UI theme preference.
         * TODO: align with backend schema once regenerated.
         */
        theme: z.enum(["light", "dark", "system"]).optional().nullable(),

        /**
         * Marketing communications opt-in.
         * TODO: align with backend schema once regenerated.
         */
        marketingOptIn: z.boolean().optional().nullable(),
      })
      .refine(atLeastOneNotificationChannel, {
        message: AT_LEAST_ONE_CHANNEL_MESSAGE,
        path: ["preferences", "notificationChannels"],
      })
      .optional()
      .nullable(),

    /**
     * Privacy settings sub-object.
     * Mirrors `UserPrivacySettingsDto` from the generated schema.
     *
     * TODO (TKT-4.3.A1): If the backend regenerates `UpdateMeSettingsDto`
     * to use a typed `privacy` shape, replace this with the generated type
     * (`UpdateMeSettingsDtoPrivacy`).
     */
    privacy: z
      .object({
        isPublic: z.boolean().optional().nullable(),
        showStatistics: z.boolean().optional().nullable(),
        showAchievements: z.boolean().optional().nullable(),
        showActivity: z.boolean().optional().nullable(),
        showRankImprovement: z.boolean().optional().nullable(),
        showTournamentActivity: z.boolean().optional().nullable(),
      })
      .optional()
      .nullable(),
  })
  .strict();

/**
 * Inferred form values for the settings form.
 * Compatible with `PATCH /users/me/settings` via `updateMySettings()`.
 */
export type UpdateMySettingsFormValues = z.infer<typeof updateMySettingsSchema>;
