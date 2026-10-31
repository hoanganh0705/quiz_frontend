/**
 * GraphQL code generation pipeline.
 *
 * The schema source is the same backend the runtime will hit. In CI, this is
 * a stable URL pulled from `NEXT_PUBLIC_GRAPHQL_URL`; locally, a developer
 * can point it at `http://localhost:8080/graphql`.
 *
 * `--check` (used by `generate:graphql:ci`) fails the run when generated
 * output would differ from what is on disk, so a schema change cannot land
 * without the regenerated types.
 *
 * Document tags are imported as `gql` from `@apollo/client` (Apollo Client
 * v4 only re-exports `gql`, not `graphql`); `pluckConfig.modules` lets
 * codegen recognise the in-source tag so it can match operations to schema
 * types.
 */
import 'dotenv/config';
import type { CodegenConfig } from '@graphql-codegen/cli';

const schemaFromEnv = process.env.NEXT_PUBLIC_GRAPHQL_URL ?? 'http://localhost:8080/graphql';

const config: CodegenConfig = {
  overwrite: true,
  schema: schemaFromEnv,
  documents: ['src/features/**/graphql/**/*.graphql.ts'],
  ignoreNoDocuments: true,
  pluckConfig: {
    modules: [{ name: '@apollo/client', identifier: 'gql' }],
  },
  generates: {
    'src/lib/graphql/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
      config: {
        avoidOptionals: true,
        skipTypename: false,
        scalars: {
          ID: 'string',
          DateTime: 'string',
          JSON: 'unknown',
        },
        useTypeImports: true,
        dedupeFragments: true,
      },
    },
  },
};

export default config;
