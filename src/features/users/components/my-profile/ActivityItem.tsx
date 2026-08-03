/**
 * `ActivityItem` — renders a single activity event by type.
 *
 * Source epic:   Epic 4.5 — Personal activity feed + ranking + badges + tournament history + my-attempts list.
 * Source ticket: T-4.5-C2.
 *
 * Renders different layouts based on the activity `type` discriminant.
 * Supports all activity types from `UserActivityItemDtoType`.
 */

import { memo } from 'react';
import {
  Award,
  BookOpen,
  MessageSquare,
  Trophy,
  Target,
  Calendar,
  Zap,
  Star,
  Flag,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

import type { UserActivityItemDto } from '@/features/users/types';

/**
 * Props for ActivityItem component.
 */
export interface ActivityItemProps {
  /** The activity event to render. */
  activity: UserActivityItemDto;
}

/**
 * Maps activity type to icon component.
 */
function getActivityIcon(type: UserActivityItemDto['type']) {
  switch (type) {
    case 'badge_earned':
      return Award;
    case 'badge_revoked':
      return Award;
    case 'rank_milestone':
      return Trophy;
    case 'peak_rank_achieved':
      return Star;
    case 'tournament_joined':
      return Flag;
    case 'tournament_completed':
      return Trophy;
    case 'tournament_won':
      return Trophy;
    case 'comment_created':
      return MessageSquare;
    case 'quiz_completed':
      return BookOpen;
    case 'quiz_milestone':
      return Target;
    case 'instance_created':
      return Calendar;
    case 'instance_joined':
      return Flag;
    case 'instance_completed':
      return BookOpen;
    default:
      return Zap;
  }
}

/**
 * Maps activity type to icon color class.
 */
function getActivityColor(type: UserActivityItemDto['type']): string {
  switch (type) {
    case 'badge_earned':
      return 'text-purple-500 bg-purple-500/10';
    case 'badge_revoked':
      return 'text-red-500 bg-red-500/10';
    case 'rank_milestone':
      return 'text-amber-500 bg-amber-500/10';
    case 'peak_rank_achieved':
      return 'text-yellow-500 bg-yellow-500/10';
    case 'tournament_joined':
      return 'text-blue-500 bg-blue-500/10';
    case 'tournament_completed':
      return 'text-green-500 bg-green-500/10';
    case 'tournament_won':
      return 'text-amber-500 bg-amber-500/10';
    case 'comment_created':
      return 'text-indigo-500 bg-indigo-500/10';
    case 'quiz_completed':
      return 'text-brand bg-brand/10';
    case 'quiz_milestone':
      return 'text-emerald-500 bg-emerald-500/10';
    case 'instance_created':
      return 'text-cyan-500 bg-cyan-500/10';
    case 'instance_joined':
      return 'text-teal-500 bg-teal-500/10';
    case 'instance_completed':
      return 'text-green-500 bg-green-500/10';
    default:
      return 'text-muted-foreground bg-muted';
  }
}

/**
 * Formats activity timestamp to relative time.
 */
function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return 'just now';
}

/**
 * Gets human-readable title for activity.
 */
function getActivityTitle(activity: UserActivityItemDto): string {
  const { type, payload } = activity;

  switch (type) {
    case 'badge_earned':
      return `Earned badge: ${(payload as { name?: string }).name ?? 'Achievement'}`;
    case 'badge_revoked':
      return 'Badge revoked';
    case 'rank_milestone':
      return 'Reached a new rank milestone!';
    case 'peak_rank_achieved':
      return 'Achieved a new peak rank!';
    case 'tournament_joined':
      return 'Joined a tournament';
    case 'tournament_completed':
      return 'Completed a tournament';
    case 'tournament_won':
      return 'Won a tournament!';
    case 'comment_created':
      return 'Left a comment';
    case 'quiz_completed':
      return 'Completed a quiz';
    case 'quiz_milestone':
      return 'Reached a quiz milestone!';
    case 'instance_created':
      return 'Created a challenge';
    case 'instance_joined':
      return 'Joined a challenge';
    case 'instance_completed':
      return 'Completed a challenge';
    default:
      return 'Activity';
  }
}

/**
 * Gets description text for activity.
 */
function getActivityDescription(activity: UserActivityItemDto): string | null {
  const { type, payload } = activity;

  switch (type) {
    case 'quiz_completed': {
      const p = payload as { quizTitle?: string; score?: number };
      if (p.quizTitle) {
        return p.score !== undefined ? `${p.score}% on "${p.quizTitle}"` : `"${p.quizTitle}"`;
      }
      return null;
    }
    case 'tournament_completed':
    case 'tournament_won': {
      const p = payload as { tournamentName?: string; rank?: number };
      if (p.tournamentName) {
        return p.rank !== undefined ? `#${p.rank} in ${p.tournamentName}` : p.tournamentName;
      }
      return null;
    }
    case 'badge_earned': {
      const p = payload as { description?: string };
      return p.description ?? null;
    }
    default:
      return null;
  }
}

/**
 * Activity skeleton for loading state.
 */
export function ActivityItemSkeleton() {
  return (
    <div className='flex items-start gap-3 rounded-lg border p-3 bg-card'>
      <Skeleton className='h-10 w-10 rounded-full shrink-0' />
      <div className='flex-1 space-y-2'>
        <Skeleton className='h-4 w-3/4' />
        <Skeleton className='h-3 w-1/2' />
      </div>
      <Skeleton className='h-3 w-16' />
    </div>
  );
}

/**
 * Renders a single activity event by type.
 */
export const ActivityItem = memo(function ActivityItem({
  activity,
}: ActivityItemProps) {
  const Icon = getActivityIcon(activity.type);
  const colorClass = getActivityColor(activity.type);
  const title = getActivityTitle(activity);
  const description = getActivityDescription(activity);
  const timeAgo = formatTimeAgo(activity.occurredAt);

  return (
    <div
      className='flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50'
      role='listitem'
      aria-label={title}
    >
      {/* Icon */}
      <div className={`p-2 rounded-full shrink-0 ${colorClass}`}>
        <Icon className='w-5 h-5' aria-hidden='true' />
      </div>

      {/* Content */}
      <div className='flex-1 min-w-0'>
        <p className='text-sm font-medium text-foreground truncate'>{title}</p>
        {description && (
          <p className='text-xs text-muted-foreground mt-0.5'>{description}</p>
        )}
      </div>

      {/* Timestamp */}
      <span className='text-xs text-muted-foreground shrink-0'>{timeAgo}</span>
    </div>
  );
});
