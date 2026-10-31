
import { print } from 'graphql';
import { describe, expect, it } from 'vitest';

import { QUIZZES_BUNDLE_QUERY, useQuizzesBundleQuery } from '../quizzes-bundle.graphql';

describe('quizzes-bundle.graphql', () => {
  it('defines a TypedDocumentNode for the QuizzesBundle query', () => {
    expect(QUIZZES_BUNDLE_QUERY).toBeDefined();
    expect(QUIZZES_BUNDLE_QUERY.kind).toBe('Document');
  });

  it('targets the `quizzesBundle` resolver', () => {
    const printed = print(QUIZZES_BUNDLE_QUERY);
    expect(printed).toMatch(/query\s+QuizzesBundle\b/);
    expect(printed).toContain('quizzesBundle');
    expect(printed).toContain('items');
    expect(printed).toContain('pageInfo');
    expect(printed).toContain('popular');
    expect(printed).toContain('trending');
    expect(printed).toContain('categories');
    expect(printed).toContain('tags');
  });

  it('declares the documented input variables (all nullable)', () => {
    const printed = print(QUIZZES_BUNDLE_QUERY);
    expect(printed).toContain('$q: String');
    expect(printed).toContain('$sort: QuizSortOrder');
    expect(printed).toContain('$difficulty: QuizDifficultyFilter');
    expect(printed).toContain('$categoryId: ID');
    expect(printed).toContain('$tagSlugs: [String!]');
    expect(printed).toContain('$cursor: String');
    expect(printed).toContain('$limit: Int');
  });

  it('uses the GraphQL operation type `query` (not mutation/subscription)', () => {
    const op = QUIZZES_BUNDLE_QUERY.definitions[0];
    expect(op.kind).toBe('OperationDefinition');
    if (op.kind === 'OperationDefinition') {
      expect(op.operation).toBe('query');
      expect(op.name?.value).toBe('QuizzesBundle');
    }
  });

  it('exposes a wrapper hook that forwards variables + options to useQuery', () => {
    expect(typeof useQuizzesBundleQuery).toBe('function');
    // The wrapper is just a `useQuery` shim; the surface area is the
    // documented arg shape, not the implementation details of useQuery.
    expect(useQuizzesBundleQuery.length).toBeLessThanOrEqual(1);
  });
});
