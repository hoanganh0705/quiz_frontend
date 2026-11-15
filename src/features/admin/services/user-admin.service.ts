import { orvalCustomInstance } from '@/lib/api/core/custom-instance';

export interface AdminUserDto {
  userId: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: 'user' | 'moderator' | 'admin';
  isVerified: boolean;
  currentStreak: number;
  longestStreak: number;
  xpTotal: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface AdminUserQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'user' | 'moderator' | 'admin';
  isVerified?: boolean;
  sortBy?: 'createdAt' | 'username' | 'role';
  sortOrder?: 'asc' | 'desc';
}

export interface AdminUserListResponse {
  data: AdminUserDto[];
  meta: {
    timestamp: string;
    pagination?: {
      kind: 'offset';
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  };
}

export interface CreateAdminUserInput {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  role?: 'user' | 'moderator' | 'admin';
  isVerified?: boolean;
}

export async function listAdminUsers(query: AdminUserQuery = {}): Promise<AdminUserListResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.search) params.set('search', query.search);
  if (query.role) params.set('role', query.role);
  if (query.isVerified !== undefined) params.set('isVerified', String(query.isVerified));
  if (query.sortBy) params.set('sortBy', query.sortBy);
  if (query.sortOrder) params.set('sortOrder', query.sortOrder);

  const qs = params.toString();
  const url = `/api/v1/admin/users${qs ? `?${qs}` : ''}`;
  const res = await orvalCustomInstance<AdminUserListResponse>({
    url,
    method: 'GET',
  });
  return res as unknown as AdminUserListResponse;
}

export async function createAdminUser(input: CreateAdminUserInput): Promise<AdminUserDto> {
  const res = await orvalCustomInstance<{ data: AdminUserDto }>({
    url: '/api/v1/admin/users',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: input,
  });
  return (res as { data: AdminUserDto }).data;
}

export async function updateAdminUserRole(
  userId: string,
  role: 'user' | 'moderator' | 'admin',
): Promise<AdminUserDto> {
  const res = await orvalCustomInstance<{ data: AdminUserDto }>({
    url: `/api/v1/admin/users/${userId}/role`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    data: { role },
  });
  return (res as { data: AdminUserDto }).data;
}

export async function deleteAdminUser(userId: string): Promise<{ success: boolean; userId: string }> {
  const res = await orvalCustomInstance<{ data: { success: boolean; userId: string } }>({
    url: `/api/v1/admin/users/${userId}`,
    method: 'DELETE',
  });
  return (res as { data: { success: boolean; userId: string } }).data;
}
