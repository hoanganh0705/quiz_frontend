'use client';

import type { CurrentUserResponseDto } from '@/features/auth/types';
import type { UserMeResponseDto } from '@/features/users/types';

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

const CACHE_PREFIX = 'auth_cache';
const DEFAULT_TTL_MS = 60 * 60 * 1000;
const IDENTITY_KEY = 'identity';
const PROFILE_KEY = 'profile';

function getCacheKey(userId: string, dataType: string): string {
return `${CACHE_PREFIX}_${userId}_${dataType}`;
}

function isCacheValid<T>(entry: UserScopedCacheEntry<T> | null): boolean {
if (entry === null) return false;
const now = Date.now();
return now < entry.timestamp + entry.ttlMs;
}

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

localStorage.removeItem(key);
return null;
    }

return parsed;
  } catch {

return null;
  }
}

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

function removeFromStorage(userId: string, dataType: string): void {
if (typeof window === 'undefined') return;

const key = getCacheKey(userId, dataType);
localStorage.removeItem(key);
}

function clearUserCache(userId: string): void {
removeFromStorage(userId, IDENTITY_KEY);
removeFromStorage(userId, PROFILE_KEY);
}

export function getCachedIdentity(
userId: string
): CurrentUserResponseDto | null {
const entry = getFromStorage<CurrentUserResponseDto>(userId, IDENTITY_KEY);
return entry?.data ?? null;
}

export function setCachedIdentity(
userId: string,
identity: CurrentUserResponseDto,
ttlMs: number = DEFAULT_TTL_MS
): void {
setInStorage(userId, IDENTITY_KEY, identity, ttlMs);
}

export function getCachedProfile(userId: string): UserMeResponseDto | null {
const entry = getFromStorage<UserMeResponseDto>(userId, PROFILE_KEY);
return entry?.data ?? null;
}

export function setCachedProfile(
userId: string,
profile: UserMeResponseDto,
ttlMs: number = DEFAULT_TTL_MS
): void {
setInStorage(userId, PROFILE_KEY, profile, ttlMs);
}

export function clearCachedDataForUser(userId: string): void {
clearUserCache(userId);
}

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

export function hasCachedDataForUser(userId: string): boolean {
const identity = getCachedIdentity(userId);
const profile = getCachedProfile(userId);
return identity !== null || profile !== null;
}
