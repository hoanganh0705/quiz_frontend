

export type QuizVersionResponseDtoStatus = typeof QuizVersionResponseDtoStatus[keyof typeof QuizVersionResponseDtoStatus];

export const QuizVersionResponseDtoStatus = {
draft: 'draft',
published: 'published',
archived: 'archived',
} as const;
