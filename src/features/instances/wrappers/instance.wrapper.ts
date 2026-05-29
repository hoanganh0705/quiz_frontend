/**
 * Instances wrapper — wraps API calls for live quiz instances.
 */

import { customInstance } from '@/lib/api/core/custom-instance';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface InstanceResponseDto {
  instanceId: string
  quizId: string
  quizVersionId: string
  status: 'waiting' | 'active' | 'closed'
  currentPlayers: number
  maxPlayers: number
  startedAt: string | null
  endedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface InstanceLeaderboardEntryDto {
  rank: number
  userId: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  score: number
  timeMs: number
  completedAt: string | null
}

// ─── API Functions ─────────────────────────────────────────────────────────────

export async function createInstance(quizId: string): Promise<InstanceResponseDto> {
  const response = await customInstance.post<InstanceResponseDto>(
    '/instances',
    { quizId }
  );
  return response.data;
}

export async function getInstance(instanceId: string): Promise<InstanceResponseDto> {
  const response = await customInstance.get<InstanceResponseDto>(
    `/instances/${instanceId}`
  );
  return response.data;
}

export async function joinInstance(instanceId: string): Promise<{ message: string }> {
  const response = await customInstance.post<{ message: string }>(
    `/instances/${instanceId}/join`
  );
  return response.data;
}

export async function startInstance(instanceId: string): Promise<InstanceResponseDto> {
  const response = await customInstance.post<InstanceResponseDto>(
    `/instances/${instanceId}/start`
  );
  return response.data;
}

export async function closeInstance(instanceId: string): Promise<InstanceResponseDto> {
  const response = await customInstance.post<InstanceResponseDto>(
    `/instances/${instanceId}/close`
  );
  return response.data;
}

export async function getInstanceLeaderboard(
  instanceId: string
): Promise<{ items: InstanceLeaderboardEntryDto[] }> {
  const response = await customInstance.get<{ items: InstanceLeaderboardEntryDto[] }>(
    `/instances/${instanceId}/leaderboard`
  );
  return response.data;
}
