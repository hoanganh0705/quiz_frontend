/**
 * Internal sandbox route for the GraphQL pilot.
 *
 * Mounts an Apollo Client subtree and runs the minimum-viable query
 * (`query { __typename }`) so a developer can confirm the browser can reach
 * the GraphQL endpoint without touching any production page.
 *
 * The page is gated by `getFeatureFlagValue('graphql_pilot_sandbox')`; the
 * default value is `placeholder`, which makes the route render nothing.
 * Set `NEXT_PUBLIC_GRAPHQL_PILOT_SANDBOX=live` to enable the route.
 *
 * Important: do not link to this route from any user-facing surface. It is
 * a developer-only smoke test and will be removed when the pilot closes.
 */
import { useQuery } from '@apollo/client/react';

import { getFeatureFlagValue } from '@/lib/feature-flags';
import { ApolloSubtreeProvider } from '@/lib/graphql';
import { PILOT_TYPENAME_QUERY } from '@/features/graphql-pilot/graphql/pilot-typename.graphql';

function PilotSmokePanel() {
  const { data, loading, error } = useQuery(PILOT_TYPENAME_QUERY);

  if (loading) {
    return <p data-testid="graphql-pilot-loading">Contacting GraphQL endpoint…</p>;
  }
  if (error) {
    return (
      <div
        data-testid="graphql-pilot-error"
        className="rounded border border-destructive/40 bg-destructive/5 p-4 text-sm"
      >
        <p className="font-semibold">GraphQL request failed.</p>
        <p className="mt-1 text-muted-foreground">
          {error instanceof Error ? error.message : String(error)}
        </p>
      </div>
    );
  }
  return (
    <p data-testid="graphql-pilot-result">
      Resolved <code className="rounded bg-muted px-1">__typename</code> ={' '}
      <code className="rounded bg-muted px-1">{data?.__typename ?? 'unknown'}</code>
    </p>
  );
}

export default function GraphqlPilotSandboxPage() {
  if (getFeatureFlagValue('graphql_pilot_sandbox') === 'placeholder') {
    return null;
  }

  return (
    <ApolloSubtreeProvider>
      <main
        data-testid="graphql-pilot-sandbox"
        className="min-h-screen p-6 md:p-12"
      >
        <header className="mb-6 space-y-2">
          <h1 className="text-2xl font-bold md:text-3xl">GraphQL pilot</h1>
          <p className="text-sm text-muted-foreground">
            Round-trip smoke test against the live schema. Mounts a fresh
            Apollo Client per render so two pilot pages never share a cache.
          </p>
        </header>
        <PilotSmokePanel />
      </main>
    </ApolloSubtreeProvider>
  );
}
