'use client';

/**
 * User-scoped cache — isolates auth data per userId.
 *
 * Source epic: Epic 2.5 — Auth bootstrap and full-profile hydration.
 * Source ticket: TKT-2.5.7.
 *
 * ## Purpose
 *
 * Prevents cross-account data leakage by scoping all cache entries to the
 * current userId. Data from User A will never appear in User B's context,
 * even if both users are logged in on the same browser (different tabs).
 *
 * ## Cache Key Strategy
 *
 * Keys follow the pattern: `auth_cache_{userId}_{dataType}`
 *
 * Example keys:
 * - `auth_cache_abc123_identity` — CurrentUserResponseDto
 * - `auth_cache_abc123_profile` — UserMeResponseDto
 *
 * ## TTL Strategy
 *
 * Cache entries have a TTL matching the auth token expiry (default: 1 hour).
 * Entries are also invalidated on logout and userId change.
 *
 * ## Storage
 *
 * Uses localStorage for persistence across page reloads. Data is also
 * cached in-memory for fast access within a session.
 */

import type { CurrentUserResponseDto } from '@/features/auth/types';
import type { UserMeResponseDto } from '@/features/users/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CachedIdentity {
  data: CurrentUserResponseDto;
  timestamp: number;
  ttlMs: number;
}

export interface CachedProfile {
  data: UserMeResponseDto;
  timestamp: number;
  ttlMs: number;
}

export interface UserScopedCacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

export interface UserScopedCacheData {
  identity: UserScopedCacheEntry<CachedIdentity['data']> | null;
  profile: UserScopedCacheEntry<CachedProfile['data']> | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CACHE_PREFIX = 'auth_cache';
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour
const IDENTITY_KEY = 'identity';
const PROFILE_KEY = 'profile';

// ─── Cache Functions ─────────────────────────────────────────────────────────

/**
 * Generate a cache key for a user and data type.
 */
function getCacheKey(userId: string, dataType: string): string {
  return `${CACHE_PREFIX}_${userId}_${dataType}`;
}

/**
 * Check if a cache entry is still valid (not expired).
 */
function isCacheValid<T>(entry: UserScopedCacheEntry<T> | null): boolean {
  if (entry === null) return false;
  const now = Date.now();
  return now < entry.timestamp + entry.ttlMs;
}

/**
 * Get cached data from localStorage.
 */
function getFromStorage<T>(
  userId: string,
  dataType: string
): UserScopedCacheEntry<T> | null {
  if (typeof window === 'undefined') return null;

  try {
    const key = getCacheKey(userId, dataType);
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as UserScopedCacheEntry<T>;
    if (!isCacheValid(parsed)) {
      // Expired — clean up
      localStorage.removeItem(key);
      return null;
    }

    return parsed;
  } catch {
    // Invalid JSON or parse error — treat as cache miss
    return null;
  }
}

/**
 * Store data in localStorage with TTL.
 */
function setInStorage<T>(
  userId: string,
  dataType: string,
  data: T,
  ttlMs: number = DEFAULT_TTL_MS
): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getCacheKey(userId, dataType);
    const entry: UserScopedCacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttlMs,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

/**
 * Remove cached data from localStorage.
 */
function removeFromStorage(userId: string, dataType: string): void {
  if (typeof window === 'undefined') return;

  const key = getCacheKey(userId, dataType);
  localStorage.removeItem(key);
}

/**
 * Clear all cache entries for a specific user.
 * Used on logout or account switch.
 */
function clearUserCache(userId: string): void {
  removeFromStorage(userId, IDENTITY_KEY);
  removeFromStorage(userId, PROFILE_KEY);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get cached identity for a user.
 */
export function getCachedIdentity(
  userId: string
): CurrentUserResponseDto | null {
  const entry = getFromStorage<CurrentUserResponseDto>(userId, IDENTITY_KEY);
  return entry?.data ?? null;
}

/**
 * Set cached identity for a user.
 */
export function setCachedIdentity(
  userId: string,
  identity: CurrentUserResponseDto,
  ttlMs: number = DEFAULT_TTL_MS
): void {
  setInStorage(userId, IDENTITY_KEY, identity, ttlMs);
}

/**
 * Get cached profile for a user.
 */
export function getCachedProfile(userId: string): UserMeResponseDto | null {
  const entry = getFromStorage<UserMeResponseDto>(userId, PROFILE_KEY);
  return entry?.data ?? null;
}

/**
 * Set cached profile for a user.
 */
export function setCachedProfile(
  userId: string,
  profile: UserMeResponseDto,
  ttlMs: number = DEFAULT_TTL_MS
): void {
  setInStorage(userId, PROFILE_KEY, profile, ttlMs);
}

/**
 * Clear all cached data for a user.
 */
export function clearCachedDataForUser(userId: string): void {
  clearUserCache(userId);
}

/**
 * Clear ALL auth cache entries from localStorage.
 * Used on global logout or when cache corruption is detected.
 */
export function clearAllAuthCache(): void {
  if (typeof window === 'undefined') return;

  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage unavailable — fail silently
  }
}

/**
 * Check if a user has cached data.
 */
export function hasCachedDataForUser(userId: string): boolean {
  const identity = getCachedIdentity(userId);
  const profile = getCachedProfile(userId);
  return identity !== null || profile !== null;
}
