import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FRONTEND_ROOT = process.cwd();
const readText = (rel: string): string | null => {
  try {
    return readFileSync(resolve(FRONTEND_ROOT, rel), 'utf8');
  } catch {
    return null;
  }
};

describe('graphql-pilot in-code acceptance contract', () => {
  it('ships an e2e spec that pins /quizzes to a single /graphql request on mount', () => {
    const source = readText('e2e/quizzes/quizzes-graphql-bundle.spec.ts');
    expect(source, 'e2e spec must exist').not.toBeNull();
    // Accept either Vitest-style `expect(...length).toBe(1)` or
    // Playwright-style `expect(...).toHaveLength(1)`.
    expect(source!).toMatch(
      /graphqlRequests[^.]*\.to(?:HaveLength|BeLength|Be)\(\s*1\s*\)/,
    );
    expect(source!).toContain('/quizzes');
  });

  it('ships an e2e spec that pins /profile/[name] to a single /graphql request on mount', () => {
    const source = readText('e2e/profile/profile-graphql-bundle.spec.ts');
    expect(source, 'e2e spec must exist').not.toBeNull();
    expect(source!).toMatch(
      /graphqlRequests[^.]*\.to(?:HaveLength|BeLength|Be)\(\s*1\s*\)/,
    );
    expect(source!).toMatch(/\/profile\//);
  });

  it('ships an e2e spec that proves an anonymous viewer can read /profile/[name]', () => {
    const source = readText('e2e/profile/profile-graphql-bundle.spec.ts');
    expect(source, 'e2e spec must exist').not.toBeNull();
    expect(source!).toContain('includeAnalytics');
    expect(source!).toContain('includeFollowers');
    expect(source!).toMatch(/anonymous/i);
  });

  it('mounts ApolloSubtreeProvider on both pilot routes', () => {
    const quizzesPage = resolve(
      FRONTEND_ROOT,
      'src/app/(public)/quizzes/page.tsx',
    );
    const profilePage = resolve(
      FRONTEND_ROOT,
      'src/app/(public)/profile/[name]/page.tsx',
    );
    expect(existsSync(quizzesPage)).toBe(true);
    expect(existsSync(profilePage)).toBe(true);
    expect(readFileSync(quizzesPage, 'utf8')).toContain('ApolloSubtreeProvider');
    expect(readFileSync(profilePage, 'utf8')).toContain('ApolloSubtreeProvider');
  });

  it('has generated SDL types for the pilot operations', () => {
    const generatedDir = resolve(
      FRONTEND_ROOT,
      'src/lib/graphql/generated',
    );
    expect(existsSync(generatedDir)).toBe(true);
    const codegen = readText('codegen.ts');
    expect(codegen, 'codegen config must exist').not.toBeNull();
  });
});