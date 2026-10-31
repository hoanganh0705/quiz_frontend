/**
 * Per-subtree Provider wrapper for Apollo Client.
 *
 * The GraphQL pilot is opt-in per page, so each pilot page wraps its subtree
 * with this provider. A fresh client is created per provider instance so two
 * pilot pages do not share caches (the plan's hard rule: Apollo and SWR
 * never share a cache key space).
 *
 * Note: this file is intentionally a client component because Apollo Client is
 * browser-side. RSC pages must use it from a client-only child component.
 */
'use client';

import { ApolloClient } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import type { ReactNode } from 'react';
import { useMemo } from 'react';

import { createApolloClient, type CreateApolloClientOptions } from './client';

export interface ApolloSubtreeProviderProps {
  children: ReactNode;
  /**
   * Test hook: forward overrides for endpoint and token source. Production
   * callers should leave this empty.
   */
  options?: CreateApolloClientOptions;
}

export function ApolloSubtreeProvider({
  children,
  options,
}: ApolloSubtreeProviderProps) {
  const client = useMemo(() => createApolloClient(options), [options]);
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}