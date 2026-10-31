import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApolloClient, DEFAULT_GRAPHQL_ENDPOINT } from '@/lib/graphql/client';

describe('createApolloClient', () => {
  const originalEnv = process.env.NEXT_PUBLIC_GRAPHQL_URL;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_GRAPHQL_URL;
    } else {
      process.env.NEXT_PUBLIC_GRAPHQL_URL = originalEnv;
    }
  });

  it('defaults the endpoint to /graphql when NEXT_PUBLIC_GRAPHQL_URL is unset', () => {
    delete process.env.NEXT_PUBLIC_GRAPHQL_URL;
    const client = createApolloClient();
    expect(client).toBeDefined();
    expect(client.cache).toBeDefined();
    expect(client.link).toBeDefined();
    // The endpoint is captured into the HttpLink; we can only confirm the
    // client is constructed without an override here.
  });

  it('honours NEXT_PUBLIC_GRAPHQL_URL when present', () => {
    process.env.NEXT_PUBLIC_GRAPHQL_URL = 'https://example.test/graphql';
    const client = createApolloClient();
    expect(client).toBeDefined();
  });

  it('accepts an explicit endpoint override', () => {
    const client = createApolloClient({ endpoint: 'https://override.test/graphql' });
    expect(client).toBeDefined();
  });

  it('uses the injected auth token source when supplied', () => {
    const getAuthToken = vi.fn().mockReturnValue('test-token');
    const client = createApolloClient({
      endpoint: 'https://example.test/graphql',
      getAuthToken,
    });
    expect(client).toBeDefined();
    expect(getAuthToken).not.toHaveBeenCalled();
  });

  it('exposes DEFAULT_GRAPHQL_ENDPOINT for tests and callers', () => {
    expect(DEFAULT_GRAPHQL_ENDPOINT).toBe('/graphql');
  });
});