
import { print } from 'graphql';
import { describe, expect, it } from 'vitest';

import { USER_PROFILE_QUERY, useUserProfileQuery } from '../user-profile.graphql';

describe('user-profile.graphql', () => {
  it('defines a TypedDocumentNode for the UserProfile query', () => {
    expect(USER_PROFILE_QUERY).toBeDefined();
    expect(USER_PROFILE_QUERY.kind).toBe('Document');
  });

  it('targets the `userProfile` resolver with the required username argument', () => {
    const printed = print(USER_PROFILE_QUERY);
    expect(printed).toMatch(/query\s+UserProfile\b/);
    expect(printed).toContain('userProfile(username: $username)');
    expect(printed).toContain('summary');
    expect(printed).toContain('analytics');
    expect(printed).toContain('xpHistory');
    expect(printed).toContain('recentActivity');
    expect(printed).toContain('wallet');
    expect(printed).toContain('followers(first: $followersFirst)');
    expect(printed).toContain('following(first: $followingFirst)');
    expect(printed).toContain('activity(first: $activityFirst)');
  });

  it('declares the documented input variables (username required, rails optional)', () => {
    const printed = print(USER_PROFILE_QUERY);
    expect(printed).toContain('$username: String!');
    expect(printed).toContain('$includeAnalytics: Boolean!');
    expect(printed).toContain('$includeFollowers: Boolean!');
    expect(printed).toContain('$followersFirst: Int');
    expect(printed).toContain('$followingFirst: Int');
    expect(printed).toContain('$activityFirst: Int');
  });

  it('gates the auth-conditional fields with @include(if:) directives', () => {
    const printed = print(USER_PROFILE_QUERY);
    expect(printed).toContain('analytics @include(if: $includeAnalytics)');
    expect(printed).toContain('xpHistory @include(if: $includeAnalytics)');
    expect(printed).toContain('recentActivity @include(if: $includeAnalytics)');
    expect(printed).toContain('wallet @include(if: $includeAnalytics)');
    expect(printed).toContain('followers(first: $followersFirst) @include(if: $includeFollowers)');
    expect(printed).toContain('following(first: $followingFirst) @include(if: $includeFollowers)');
    expect(printed).toContain('activity(first: $activityFirst) @include(if: $includeFollowers)');
  });

  it('uses the GraphQL operation type `query` (not mutation/subscription)', () => {
    const op = USER_PROFILE_QUERY.definitions[0];
    expect(op.kind).toBe('OperationDefinition');
    if (op.kind === 'OperationDefinition') {
      expect(op.operation).toBe('query');
      expect(op.name?.value).toBe('UserProfile');
    }
  });

  it('exposes a wrapper hook that accepts a variables object', () => {
    expect(typeof useUserProfileQuery).toBe('function');
    expect(useUserProfileQuery.length).toBe(1);
  });
});
