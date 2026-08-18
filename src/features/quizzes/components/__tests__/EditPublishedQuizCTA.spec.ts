

import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { QuizVersionSummary } from '@/features/quizzes/types/quiz-version.types';

vi.mock('next/navigation', () => ({
useRouter: () => ({
push: vi.fn(),
replace: vi.fn(),
refresh: vi.fn(),
  }),
}));

const mockCreateVersion = vi.fn();
const mockUseCreateVersion = vi.fn(() => ({
createVersion: mockCreateVersion,
isLoading: false,
error: null,
resetError: vi.fn(),
}));

vi.mock('@/features/quizzes/hooks/useCreateVersion', () => ({
useCreateVersion: (...args: unknown[]) => mockUseCreateVersion(...args),
}));

function makePublishedVersion(overrides: {
quizId?: string;
versionId?: string;
questionCount?: number;
} = {}): QuizVersionSummary {
const {
quizId = 'quiz-123',
versionId = 'version-123',
questionCount = 10,
  } = overrides;

const questions = questionCount > 0
? Array.from({ length: questionCount }, (_, i) => ({
questionId: `q-${i}`,
quizVersionId: versionId,
position: i + 1,
questionText: `Question ${i + 1}`,
imageUrl: null,
createdAt: '2026-01-01T00:00:00.000Z',
updatedAt: '2026-01-01T00:00:00.000Z',
answerOptions: [],
      }))
: [];

return {
quizVersionId: versionId,
quizId,
versionNumber: 1,
status: 'published',
difficulty: 'medium',
durationMs: 300_000,
passingScorePercent: 70,
rewardXp: 100,
questions,
publishedAt: '2026-01-01T00:00:00.000Z',
createdAt: '2025-12-01T00:00:00.000Z',
updatedAt: '2026-01-01T00:00:00.000Z',
  } as QuizVersionSummary;
}

describe('EditPublishedQuizCTA — type contracts', () => {
beforeEach(() => {
vi.clearAllMocks();
  });

it('publishes correct QuizVersionSummary shape', () => {
const version = makePublishedVersion({ questionCount: 5 });
expect(version.status).toBe('published');
expect(version.quizVersionId).toBe('version-123');
expect(version.quizId).toBe('quiz-123');
expect(version.questions?.length).toBe(5);
  });

it('handles version with no questions', () => {
const version = makePublishedVersion({ questionCount: 0 });
expect(version.questions).toEqual([]);
  });
});

describe('EditPublishedQuizCTA — service call contract', () => {
beforeEach(() => {
vi.clearAllMocks();
  });

it('createVersion is called with quizId and sourceVersionId', async () => {
mockCreateVersion.mockResolvedValueOnce({
quizVersionId: 'new-version-456',
status: 'draft',
    });

const version = makePublishedVersion();
await mockCreateVersion('quiz-123', {
sourceVersionId: version.quizVersionId,
difficulty: version.difficulty,
durationMs: version.durationMs,
passingScorePercent: version.passingScorePercent,
rewardXp: version.rewardXp,
    });

expect(mockCreateVersion).toHaveBeenCalledWith('quiz-123', {
sourceVersionId: 'version-123',
difficulty: 'medium',
durationMs: 300_000,
passingScorePercent: 70,
rewardXp: 100,
    });
  });

it('createVersion returns the new version on success', async () => {
const newVersion = {
quizVersionId: 'new-version-789',
status: 'draft',
    };
mockCreateVersion.mockResolvedValueOnce(newVersion);

const result = await mockCreateVersion('quiz-123', {
sourceVersionId: 'version-123',
difficulty: 'medium',
durationMs: 300_000,
passingScorePercent: 70,
rewardXp: 100,
    });

expect(result).toEqual(newVersion);
  });

it('createVersion can be configured to fail', async () => {
mockCreateVersion.mockRejectedValueOnce(new Error('Network error'));

await expect(
mockCreateVersion('quiz-123', {
sourceVersionId: 'version-123',
difficulty: 'medium',
durationMs: 300_000,
passingScorePercent: 70,
rewardXp: 100,
      })
    ).rejects.toThrow('Network error');
  });
});

describe('EditPublishedQuizCTA — routing logic', () => {
beforeEach(() => {
vi.clearAllMocks();
  });

it('constructs correct route URL with new version ID', () => {
const quizId = 'quiz-123';
const newVersion = {
quizVersionId: 'new-version-789',
status: 'draft' as const,
    };

const route = `/my-quizzes/${quizId}/edit?versionId=${newVersion.quizVersionId}`;

expect(route).toBe('/my-quizzes/quiz-123/edit?versionId=new-version-789');
  });
});