

import { z } from "zod";

import {
  STORAGE_PUBLIC_ID_INVALID_MESSAGE,
  STORAGE_PUBLIC_ID_TAIL_PATTERN,
} from "@/lib/storage/public-id-pattern";
import type {
  UpdateMeDto,
  UpdateMeSettingsDto,
  UpdateMeSettingsDtoPreferences,
  UpdateMeSettingsDtoPrivacy,
} from "@/lib/api/generated/schemas";

const notificationChannelsSchema = z.object({
inApp: z.boolean(),
email: z.boolean(),
push: z.boolean(),
marketing: z.boolean(),
});

export const AT_LEAST_ONE_CHANNEL_MESSAGE =
"At least one notification channel must be enabled.";

export const updateMyProfileSchema = z
  .object({

displayName: z
      .string()
      .max(100, "Display name cannot exceed 100 characters.")
      .optional(),

bio: z
      .string()
      .max(500, "Bio cannot exceed 500 characters.")
      .optional()
      .nullable(),

pronouns: z
      .string()
      .max(30, "Pronouns cannot exceed 30 characters.")
      .optional()
      .nullable(),

location: z
      .string()
      .max(100, "Location cannot exceed 100 characters.")
      .optional()
      .nullable(),

websiteUrl: z
      .string()
      .url("Website URL must be a valid URL.")
      .max(2048, "Website URL cannot exceed 2048 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),

avatarPublicId: z
      .string()
      .regex(STORAGE_PUBLIC_ID_TAIL_PATTERN, STORAGE_PUBLIC_ID_INVALID_MESSAGE)
      .or(z.literal(""))
      .optional()
      .nullable(),
  })
  .strict();

export type UpdateMyProfileFormValues = z.infer<typeof updateMyProfileSchema>;

const atLeastOneNotificationChannel = (
prefs: UpdateMeSettingsDtoPreferences | undefined,
): boolean => {
if (!prefs || typeof prefs !== "object") return true;
const channels = (prefs as Record<string, unknown>).notificationChannels;

if (!channels || channels === null) return true;
if (typeof channels !== "object") return true;
const { inApp, email, push, marketing } = channels as Record<
string,
boolean | undefined
  >;
return !!(inApp || email || push || marketing);
};

export const updateMySettingsSchema = z
  .object({

preferences: z
      .object({

notificationChannels: notificationChannelsSchema.optional(),

theme: z.enum(["light", "dark", "system"]).optional().nullable(),

marketingOptIn: z.boolean().optional().nullable(),
      })
      .refine(atLeastOneNotificationChannel, {
message: AT_LEAST_ONE_CHANNEL_MESSAGE,
path: ["preferences", "notificationChannels"],
      })
      .optional()
      .nullable(),

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

export type UpdateMySettingsFormValues = z.infer<typeof updateMySettingsSchema>;
