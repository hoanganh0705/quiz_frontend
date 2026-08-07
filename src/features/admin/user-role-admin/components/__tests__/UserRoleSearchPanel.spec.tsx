/**
 * `features/admin/user-role-admin/components/__tests__/UserRoleSearchPanel.spec.tsx`
 *
 * Source epic:   Epic 7.10 — User Role Grant.
 * Source ticket: TKT-7.10.C3.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock the useUserSearch hook
vi.mock('@/features/admin/user-role-admin/hooks/useUserSearch', () => ({
  useUserSearch: vi.fn(),
}));

// Import after mock
import { UserRoleSearchPanel } from '../UserRoleSearchPanel';
import { useUserSearch } from '@/features/admin/user-role-admin/hooks/useUserSearch';

const mockedUseUserSearch = vi.mocked(useUserSearch);

describe('UserRoleSearchPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input', () => {
    mockedUseUserSearch.mockReturnValue({
      users: [],
      total: 0,
      isLoading: false,
      isStale: false,
      error: null,
      loadMore: vi.fn(),
      hasMore: false,
    });

    render(<UserRoleSearchPanel onUserSelect={vi.fn()} />);

    expect(screen.getByTestId('user-role-search-input')).toBeInTheDocument();
  });

  it('renders empty state when no query', () => {
    mockedUseUserSearch.mockReturnValue({
      users: [],
      total: 0,
      isLoading: false,
      isStale: false,
      error: null,
      loadMore: vi.fn(),
      hasMore: false,
    });

    render(<UserRoleSearchPanel onUserSelect={vi.fn()} />);

    // Empty state should not appear until we have a query >= 2 chars
    expect(screen.queryByTestId('user-role-search-empty-state')).not.toBeInTheDocument();
  });

  it('renders loading skeleton when loading', () => {
    mockedUseUserSearch.mockReturnValue({
      users: [],
      total: 0,
      isLoading: true,
      isStale: false,
      error: null,
      loadMore: vi.fn(),
      hasMore: false,
    });

    render(<UserRoleSearchPanel onUserSelect={vi.fn()} />);

    expect(screen.getAllByTestId('user-role-search-result-skeleton')).toHaveLength(3);
  });

  it('renders error state with retry button', () => {
    mockedUseUserSearch.mockReturnValue({
      users: [],
      total: 0,
      isLoading: false,
      isStale: false,
      error: { code: 'ERROR', message: 'Search failed' } as any,
      loadMore: vi.fn(),
      hasMore: false,
    });

    render(<UserRoleSearchPanel onUserSelect={vi.fn()} />);

    expect(screen.getByTestId('user-role-search-error-state')).toBeInTheDocument();
    expect(screen.getByTestId('user-role-search-retry-button')).toBeInTheDocument();
  });

  it('calls onUserSelect when user is clicked', () => {
    const mockOnSelect = vi.fn();
    mockedUseUserSearch.mockReturnValue({
      users: [
        {
          userId: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
          currentRoles: ['user_grant_role'],
        },
      ],
      total: 1,
      isLoading: false,
      isStale: false,
      error: null,
      loadMore: vi.fn(),
      hasMore: false,
    });

    render(<UserRoleSearchPanel onUserSelect={mockOnSelect} />);

    const userButton = screen.getByTestId('user-role-search-result');
    fireEvent.click(userButton);

    expect(mockOnSelect).toHaveBeenCalledWith({
      userId: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      avatar: null,
      currentRoles: ['user_grant_role'],
    });
  });

  it('displays search results with correct data', () => {
    mockedUseUserSearch.mockReturnValue({
      users: [
        {
          userId: 'user-456',
          username: 'anotheruser',
          email: 'another@example.com',
          avatar: 'http://example.com/avatar.jpg',
          currentRoles: [],
        },
      ],
      total: 1,
      isLoading: false,
      isStale: false,
      error: null,
      loadMore: vi.fn(),
      hasMore: false,
    });

    render(<UserRoleSearchPanel onUserSelect={vi.fn()} />);

    expect(screen.getByTestId('user-role-search-result-username')).toHaveTextContent('anotheruser');
    expect(screen.getByTestId('user-role-search-result-email')).toHaveTextContent('another@example.com');
    expect(screen.getByTestId('user-role-search-results-count')).toHaveTextContent('1 result');
  });
});
