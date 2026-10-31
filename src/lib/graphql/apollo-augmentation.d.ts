/**
 * Type augmentation for Apollo Client default options.
 *
 * Apollo Client v4 ships strict defaults: every `useQuery` call has to pass an
 * explicit `errorPolicy`, otherwise the result types are non-nullable and the
 * call site loses the ability to detect partial / error responses. The pilot
 * flips `errorPolicy` to `'all'` for `watchQuery` and `query` so callers can
 * inspect `result.error` for transport failures and still receive partial
 * data, and pins `returnPartialData` to `false` so a cache miss surfaces as
 * a fetch instead of returning an empty shape.
 *
 * `client.ts` already passes these defaults at runtime; the declarations
 * here just remove the need for the `as never` cast and keep the call sites
 * type-safe.
 */
import '@apollo/client';

declare module '@apollo/client' {
  namespace ApolloClient {
    namespace DeclareDefaultOptions {
      interface WatchQuery {
        errorPolicy: 'all';
        returnPartialData: false;
      }
      interface Query {
        errorPolicy: 'all';
      }
    }
  }
}
