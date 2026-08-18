

import { z } from 'zod';

import { tagSlugSchema } from '@/lib/forms/regex';
import { CreateInitialQuizVersionDtoDifficulty } from '@/lib/api/generated/schemas/createInitialQuizVersionDtoDifficulty';
import {
  STORAGE_PUBLIC_ID_INVALID_MESSAGE,
  STORAGE_PUBLIC_ID_TAIL_PATTERN,
} from '@/lib/storage/public-id-pattern';
import {
  QUESTION_TYPE_VALUES,
  type QuestionType,
} from '@/components/primitives/form/QuestionTypeSelect';

export const initialQuizVersionFormSchema = z.object({
difficulty: z.nativeEnum(CreateInitialQuizVersionDtoDifficulty),
durationMs: z
    .number({ error: 'Duration must be a positive number.' })
    .int('Duration must be a whole number of milliseconds.')
    .min(1, 'Duration must be at least 1 ms.'),
passingScorePercent: z
    .number({
error: 'Passing score must be a number between 0 and 100.',
    })
    .int('Passing score must be a whole percentage.')
    .min(0, 'Passing score cannot be negative.')
    .max(100, 'Passing score cannot exceed 100.'),
rewardXp: z
    .number({ error: 'Reward XP must be a non-negative number.' })
    .int('Reward XP must be a whole number.')
    .min(0, 'Reward XP cannot be negative.'),
});

export const quizAnswerOptionFormSchema = z.object({
position: z
    .number({ error: 'Option position must be a positive integer.' })
    .int('Option position must be a whole number.')
    .min(1, 'Option position must be at least 1.'),
value: z
    .string({ error: 'Option text is required.' })
    .min(1, 'Option text cannot be empty.')
    .max(1000, 'Option text cannot exceed 1000 characters.'),
isCorrect: z.boolean({
error: 'Option correctness must be a boolean.',
  }),
});

export const quizQuestionFormSchema = z.object({
position: z
    .number({ error: 'Question position must be a positive integer.' })
    .int('Question position must be a whole number.')
    .min(1, 'Question position must be at least 1.'),
questionText: z
    .string({ error: 'Question text is required.' })
    .min(1, 'Question text cannot be empty.')
    .max(2000, 'Question text cannot exceed 2000 characters.'),
imageUrl: z
    .string()
    .max(2048, 'Image URL cannot exceed 2048 characters.')
    .url('Image URL must be a valid URL.')
    .nullable()
    .optional(),
answerOptions: quizAnswerOptionFormSchema,

questionType: z.enum(QUESTION_TYPE_VALUES).default('single_choice'),
});

export const quizCreateFormSchema = z.object({
title: z
    .string({ error: 'Title is required.' })
    .min(1, 'Title cannot be empty.')
    .max(120, 'Title cannot exceed 120 characters.'),
description: z
    .string()
    .max(2000, 'Description cannot exceed 2000 characters.')
    .nullable()
    .optional(),
slug: z
    .string()
    .max(120, 'Slug cannot exceed 120 characters.')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
message: 'Slug must be lowercase alphanumeric with optional hyphens (e.g. `world-history`).',
    })
    .nullable()
    .optional(),
requirements: z
    .string()
    .max(5000, 'Requirements cannot exceed 5000 characters.')
    .nullable()
    .optional(),
imagePublicId: z
    .string()
    .regex(STORAGE_PUBLIC_ID_TAIL_PATTERN, STORAGE_PUBLIC_ID_INVALID_MESSAGE)
    .or(z.literal(""))
    .nullable()
    .optional(),
isFeatured: z.boolean().nullable().optional(),
isHidden: z.boolean().nullable().optional(),
categoryId: z.string().uuid().nullable().optional(),

tagSlugs: z.array(tagSlugSchema).max(10, 'At most 10 tags per quiz.').default([]),
initialVersion: initialQuizVersionFormSchema,

acknowledgements: z.boolean().default(false).optional(),
});

export const versionEditFormSchema = z
  .object({
difficulty: z.nativeEnum(CreateInitialQuizVersionDtoDifficulty).optional(),
durationMs: z.number().int().min(1).optional(),
passingScorePercent: z.number().int().min(0).max(100).optional(),
rewardXp: z.number().int().min(0).optional(),
changeNote: z
      .string()
      .max(500, 'Change note cannot exceed 500 characters.')
      .optional(),
  })
  .strict();

export const questionFormSchema = quizQuestionFormSchema.extend({

index: z.number().int().min(0).optional(),
});

export const bulkQuestionsFormSchema = z.object({
items: z
    .array(questionFormSchema)
    .min(1, 'Add at least one question.')
    .max(50, 'At most 50 questions per bulk submit.'),
});

export const reviewFormSchema = z.object({
rating: z
    .number({ error: 'Rating must be a number from 1 to 5.' })
    .int('Rating must be a whole number of stars.')
    .min(1, 'Rating must be at least 1 star.')
    .max(5, 'Rating cannot exceed 5 stars.'),
comment: z
    .string({ error: 'Review text is required.' })
    .trim()
    .min(1, 'Review text cannot be empty.')
    .max(2000, 'Review cannot exceed 2000 characters.'),
idempotencyKey: z.string().min(1).max(120).optional(),
});

export const commentFormSchema = z.object({
body: z
    .string({ error: 'Comment text is required.' })
    .min(1, 'Comment cannot be empty.')
    .max(2000, 'Comment cannot exceed 2000 characters.'),
parentCommentId: z.string().uuid().nullable().optional(),

mentions: z.array(z.string().uuid()).max(20).default([]),
});

export type QuizCreateFormValues = z.infer<typeof quizCreateFormSchema>;
export type VersionEditFormValues = z.infer<typeof versionEditFormSchema>;
export type QuestionFormValues = z.infer<typeof questionFormSchema>;
export type BulkQuestionsFormValues = z.infer<typeof bulkQuestionsFormSchema>;
export type ReviewFormValues = z.infer<typeof reviewFormSchema>;
export type CommentFormValues = z.infer<typeof commentFormSchema>;
export type InitialQuizVersionFormValues = z.infer<
typeof initialQuizVersionFormSchema
>;
export type QuizAnswerOptionFormValues = z.infer<
typeof quizAnswerOptionFormSchema
>;
export type QuizQuestionFormValues = z.infer<typeof quizQuestionFormSchema>;

export type { QuestionType };

export {
AT_LEAST_ONE_CHANNEL_MESSAGE,
updateMyProfileSchema,
updateMySettingsSchema,
} from './user-schemas';
export type {
UpdateMyProfileFormValues,
UpdateMySettingsFormValues,
} from './user-schemas';