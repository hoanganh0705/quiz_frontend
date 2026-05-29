import { defineConfig } from 'orval';

export default defineConfig({
  quiz: {
    input: {
      target: 'http://localhost:8080/api/v1/docs/openapi.json',
      validation: true,
    },
    output: {
      target: './src/lib/api/generated',
      schemas: './src/lib/api/generated/schemas',
    
      client: 'axios',
      mode: 'tags-split',
    
      clean: true,
      prettier: true,
    
      override: {
        mutator: {
          path: './src/lib/api/core/custom-instance.ts',
          name: 'customInstance',
        },
      },
    },
    hooks: {
      afterAllFilesWrite: ['pnpm lint --fix'],
    },
  },
});
