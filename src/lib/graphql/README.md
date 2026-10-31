# GraphQL pilot (frontend)

This directory hosts the Apollo Client scaffolding used by the GraphQL
pilot. The pilot is opt-in per page: every page keeps using SWR + the
orval-generated REST client, so this client is instantiated per page
subtree by `ApolloSubtreeProvider` rather than mounted globally. That
keeps the Apollo and SWR cache spaces disjoint, which is the boundary
rule documented in the implementation plan.

## Layout

```
src/lib/graphql/
├── README.md                    # this file
├── client.ts                    # createApolloClient factory
├── ApolloSubtreeProvider.tsx    # per-subtree <ApolloProvider>
├── apollo-augmentation.d.ts     # typed defaults for errorPolicy / fetchPolicy
├── index.ts                     # public barrel
├── generated/                   # pnpm generate:graphql output (typed-document-node)
└── __tests__/client.spec.ts
```

```
src/features/
├── graphql-pilot/graphql/pilot-typename.graphql.ts   # smoke-test document
├── quizzes/graphql/quizzes-bundle.graphql.ts        # /quizzes directory
└── users/graphql/user-profile.graphql.ts            # /profile/[name]
```

## One-page, one-transport

Apollo and SWR never share a cache key space. A page that uses Apollo does
not also use SWR for the same data. Mount Apollo with
`<ApolloSubtreeProvider>` so each pilot page owns its own client instance.

```tsx
'use client';

import { ApolloSubtreeProvider } from '@/lib/graphql';

export default function QuizzesPage() {
  return (
    <ApolloSubtreeProvider>
      {/* page contents read with `useQuery` from `@apollo/client` */}
    </ApolloSubtreeProvider>
  );
}
```

## Endpoint resolution

`createApolloClient()` resolves the HTTP endpoint in this order:

1. `options.endpoint` — test hook only, callers normally leave it empty.
2. `process.env.NEXT_PUBLIC_GRAPHQL_URL` — set this to point at a gateway
   in front of `/graphql`.
3. The default `/graphql` (same origin), which is the route the backend
   mounts the GraphQL handler on.

## Auth link

The client reads the `auth_token` cookie on every request and forwards
it as `Authorization: Bearer <jwt>` when present. Token refresh mutates
the cookie in place, so no client rebuild is needed.

## Error mapping

GraphQL errors whose `extensions.code` is one of `UNAUTHENTICATED`,
`FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`, `QUERY_TOO_DEEP`, or
`QUERY_TOO_COMPLEX` are translated into `ApiError` instances with the
matching HTTP status. Existing `isApiError` consumers keep working
unchanged.

## Defaults

`apollo-augmentation.d.ts` declares the runtime defaults declared in
`client.ts` so call sites get a typed result shape without having to
pass `errorPolicy` / `fetchPolicy` on every hook call:

| Operation  | `errorPolicy` | `fetchPolicy`           |
| ---------- | ------------- | ----------------------- |
| `watchQuery` (the default for `useQuery`) | `all`         | `cache-and-network`     |
| `query` (one-shot `client.query`)         | `all`         | `cache-first` (Apollo)  |

`errorPolicy: 'all'` lets the page render partial data alongside a
`GraphQL error` notification; `cache-and-network` keeps the previously
fetched bundle on screen while the network round-trip refreshes it.

## Sandbox route (`/__graphql-pilot`)

A developer-only smoke test that mounts `ApolloSubtreeProvider` and runs
the minimum-viable query (`query { __typename }`) so a developer can
confirm the browser can reach the GraphQL endpoint before touching any
pilot page.

The route is gated by `getFeatureFlagValue('graphql_pilot_sandbox')`.
Set `NEXT_PUBLIC_GRAPHQL_PILOT_SANDBOX=live` to enable it; the default
value is `placeholder`, which causes the route to render nothing.

## Codegen workflow

```bash
pnpm generate:graphql              # writes src/lib/graphql/generated/graphql.ts
pnpm generate:graphql:ci           # fails when the generated file would change
```

The schema source defaults to `process.env.NEXT_PUBLIC_GRAPHQL_URL` and
falls back to `http://localhost:8080/graphql`. A separate backend
instance is required for codegen to succeed; the CI script (`generate:graphql:ci`)
is the contract test that detects schema drift and refuses to merge.

`generate:graphql:ci` runs in CI and fails on schema drift so a backend
schema change cannot land without the regenerated types.

## Adding a new query

1. Add `src/features/<feature>/graphql/<name>.graphql.ts` with a `graphql('')`
   template tag.
2. Run `pnpm generate:graphql`. The generated
   `<Name>Query` / `<Name>QueryVariables` types land in
   `src/lib/graphql/generated/graphql.ts`.
3. Re-export the generated types and add a thin `use<Name>Query`
   wrapper that calls `useQuery(TYPED_DOCUMENT, options)` so the rest of
   the app stays decoupled from `@apollo/client` import paths.

## When to use SWR vs Apollo

Apollo is for pages that fan out to four or more parallel REST calls from
one domain. Everything else stays on SWR. The first two pages that
qualify are `/quizzes` (five parallel REST reads, server-side tag-slug
resolution) and `/profile/[name]` (auth-gated bundle with three
paginated rails).

## Apollo + Zustand handoff

Some GraphQL mutations return side-effects that need to update non-Apollo
client state — for example, a follow mutation that should also adjust
`coinStore.balance` because the resolver emits a `coinEarned` field.
Apollo's `update(cache, payload)` callback is the right place to do that,
because it runs once the resolver response is committed to the cache.

Use `handoffApolloUpdate` to forward an `update` callback payload into
the same-tab event bus (`@/lib/state/domain-event-bus`). The bus delivers
the event to every Zustand store (or any other subscriber) in the same
tab. Cross-tab sync remains a `BroadcastChannel` concern; the bus is
strictly same-tab.

```ts
import { useMutation } from '@apollo/client';
import { handoffApolloUpdate } from '@/lib/graphql';

const FOLLOW_MUTATION = graphql(`
  mutation Follow($userId: String!) { follow(userId: $userId) { ... } }
`);

const [follow] = useMutation(FOLLOW_MUTATION, {
  update(cache, payload) {
    handoffApolloUpdate({
      cache,
      event: {
        kind: 'COIN_BALANCE_CHANGED',
        balance: payload.data?.follow.coinBalance ?? 0,
        delta: payload.data?.follow.coinDelta ?? 0,
        reason: 'follow',
      },
    });
  },
});
```

Subscribers register against the bus:

```ts
import { getDomainEventBus } from '@/lib/state/domain-event-bus';

useEffect(() => {
  const unsubscribe = getDomainEventBus().on(
    'COIN_BALANCE_CHANGED',
    (event) => {
      useCoinStore.setState({ balance: event.balance });
    },
  );
  return unsubscribe;
}, []);
```

The bus isolates listener errors so a single misbehaving subscriber does
not break the others. Reset it between tests via
`resetDomainEventBusForTesting()`.
