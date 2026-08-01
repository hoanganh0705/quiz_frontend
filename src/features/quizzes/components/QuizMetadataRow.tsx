/**
 * `QuizMetadataRow` — compact, responsive metadata strip for the
 * player-detail view.
 *
 * Source epic:   Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.C3.
 *
 * Renders five cells derived from the player-safe published
 * version and the live stats response:
 *
 *   - Difficulty — from `publishedVersion.difficulty`.
 *   - Question count — from the A3 player-question list.
 *   - Duration — formatted from `publishedVersion.durationMs`.
 *   - Average rating — from stats.averageRating (with neutral
 *     placeholder when stats are unavailable).
 *   - Attempt count — from stats.totalAttempts (same rule).
 *
 * The stats cells render a fixed-width neutral placeholder when
 * the stats hook has not yet resolved, so the row never shifts
 * dimensions after the stats request completes.
 *
 * Zero values are displayed as zero, not treated as missing — a
 * quiz with no attempts still renders "0" attempts.
 */

'use client';

import { Clock, HelpCircle, Star, Users, Zap } from 'lucide-react';

import { cn } from '@/shared/utils/merge-class-names';

import type {
  PlayerPublishedVersion,
  PlayerQuizDetail,
} from '../lib/quiz-player-view';
import type { QuizStatsResponseDto } from '@/lib/api/generated/schemas/quizStatsResponseDto';

const ROW_OUTER =
  'flex w-full flex-wrap items-center gap-x-6 gap-y-3 overflow-x-hidden text-sm';
const CELL = 'flex items-center gap-1.5';
const ICON_BASE = 'h-4 w-4 shrink-0 text-muted-foreground';
const VALUE = 'font-medium tabular-nums text-foreground';
const PLACEHOLDER = 'inline-block h-4 w-6 rounded bg-muted align-middle';

export interface QuizMetadataRowProps {
  quiz: PlayerQuizDetail;
  stats: QuizStatsResponseDto | null;
  /** True when the stats hook is still resolving its first read. */
  isStatsLoading?: boolean;
  className?: string;
}

/**
 * Format a duration in milliseconds into a compact human string.
 * Mirrors the helper used by `<QuizCard>` but emits a friendly
 * "5m" / "1h 30m" form for the metadata row (the row is small,
 * so a verbose minute count would crowd adjacent cells).
 */
export function formatDurationMs(durationMs: number | null | undefined): string {
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs <= 0) {
    return '—';
  }
  const totalMinutes = Math.round(durationMs / 60_000);
  if (totalMinutes === 0) {
    // Less than a minute — show seconds.
    const seconds = Math.max(1, Math.round(durationMs / 1_000));
    return `${seconds}s`;
  }
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

function formatDifficulty(
  difficulty: PlayerPublishedVersion['difficulty'] | undefined,
): string {
  if (!difficulty) return '—';
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

export function QuizMetadataRow({
  quiz,
  stats,
  isStatsLoading = false,
  className,
}: QuizMetadataRowProps) {
  const publishedVersion = quiz.publishedVersion;
  const questionCount = publishedVersion?.questions.length ?? 0;
  const difficulty = formatDifficulty(publishedVersion?.difficulty);
  const duration = formatDurationMs(publishedVersion?.durationMs);

  // The stats hook returns `null` for the data both before
  // the first read and on a 404 (noStats). We distinguish the
  // two by checking `isStatsLoading`: a loading state renders
  // a placeholder; a settled-null state renders the dash so
  // the cell stays dimensionally stable but communicates
  // "no data yet" without inventing metrics.
  const showStatsPlaceholder = stats === null && isStatsLoading;

  return (
    <dl
      className={cn(ROW_OUTER, className)}
      data-testid='quiz-metadata-row'
      data-has-stats={stats === null ? 'false' : 'true'}
    >
      <div className={CELL} data-testid='quiz-metadata-difficulty'>
        <Zap className={ICON_BASE} aria-hidden='true' />
        <dt className='sr-only'>Difficulty</dt>
        <dd className={VALUE}>{difficulty}</dd>
      </div>

      <div className={CELL} data-testid='quiz-metadata-question-count'>
        <HelpCircle className={ICON_BASE} aria-hidden='true' />
        <dt className='sr-only'>Question count</dt>
        <dd className={VALUE}>{questionCount}</dd>
      </div>

      <div className={CELL} data-testid='quiz-metadata-duration'>
        <Clock className={ICON_BASE} aria-hidden='true' />
        <dt className='sr-only'>Duration</dt>
        <dd className={VALUE}>{duration}</dd>
      </div>

      <div className={CELL} data-testid='quiz-metadata-rating'>
        <Star className={ICON_BASE} aria-hidden='true' />
        <dt className='sr-only'>Average rating</dt>
        {stats === null ? (
          showStatsPlaceholder ? (
            <dd
              className={PLACEHOLDER}
              aria-label='Loading average rating'
              data-state='loading'
            />
          ) : (
            <dd className={VALUE} aria-label='No rating yet'>
              —
            </dd>
          )
        ) : (
          <dd className={VALUE}>{stats.averageRating.toFixed(1)}</dd>
        )}
      </div>

      <div className={CELL} data-testid='quiz-metadata-attempts'>
        <Users className={ICON_BASE} aria-hidden='true' />
        <dt className='sr-only'>Attempt count</dt>
        {stats === null ? (
          showStatsPlaceholder ? (
            <dd
              className={PLACEHOLDER}
              aria-label='Loading attempt count'
              data-state='loading'
            />
          ) : (
            <dd className={VALUE} aria-label='No attempts yet'>
              —
            </dd>
          )
        ) : (
          <dd className={VALUE}>{stats.totalAttempts}</dd>
        )}
      </div>
    </dl>
  );
}
