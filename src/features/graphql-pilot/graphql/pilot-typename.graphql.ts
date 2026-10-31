/**
 * Smoke-test GraphQL document for the pilot sandbox route.
 *
 * `query { __typename }` is the minimum viable round-trip to the schema: it
 * resolves to `{ __typename: 'Query' }` whenever the schema is reachable,
 * and fails with a transport-level error when it is not. The sandbox route
 * renders the result so a developer can confirm the browser can reach the
 * GraphQL endpoint before moving on to the real pilot pages.
 *
 * The document is hand-written (no codegen required) because `__typename` is
 * part of the introspection surface and is always available on every schema.
 * The page imports the `TypedDocumentNode` so future changes can move to a
 * typed query without changing the caller.
 */
import { gql, type TypedDocumentNode } from '@apollo/client';

export type PilotTypenameQuery = {
  readonly __typename: 'Query';
};

export const PILOT_TYPENAME_QUERY: TypedDocumentNode<PilotTypenameQuery, Record<string, never>> =
  gql`
    query PilotTypename {
      __typename
    }
  `;
