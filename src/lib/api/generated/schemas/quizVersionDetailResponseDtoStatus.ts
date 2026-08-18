

export type QuizVersionDetailResponseDtoStatus = typeof QuizVersionDetailResponseDtoStatus[keyof typeof QuizVersionDetailResponseDtoStatus];

export const QuizVersionDetailResponseDtoStatus = {
draft: 'draft',
published: 'published',
archived: 'archived',
} as const;
