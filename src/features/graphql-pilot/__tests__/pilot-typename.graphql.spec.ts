
import { print } from 'graphql';
import { describe, expect, it } from 'vitest';

import {
  PILOT_TYPENAME_QUERY,
  type PilotTypenameQuery,
} from '../graphql/pilot-typename.graphql';

describe('pilot-typename.graphql', () => {
  it('defines a TypedDocumentNode for the PilotTypename operation', () => {
    expect(PILOT_TYPENAME_QUERY).toBeDefined();
    expect(PILOT_TYPENAME_QUERY.kind).toBe('Document');
  });

  it('queries the `__typename` introspection field', () => {
    const printed = print(PILOT_TYPENAME_QUERY);
    expect(printed).toContain('__typename');
    expect(printed).not.toContain('mutation');
    expect(printed).not.toContain('subscription');
  });

  it('keeps the operation shape narrow (no variables)', () => {
    const op = PILOT_TYPENAME_QUERY.definitions[0];
    expect(op.kind).toBe('OperationDefinition');
    if (op.kind === 'OperationDefinition') {
      expect(op.operation).toBe('query');
      expect(op.name?.value).toBe('PilotTypename');
      expect(op.variableDefinitions ?? []).toEqual([]);
    }
  });

  it('exposes a PilotTypenameQuery result type that resolves to `Query`', () => {
    const sample: PilotTypenameQuery = { __typename: 'Query' };
    expect(sample.__typename).toBe('Query');
  });
});
