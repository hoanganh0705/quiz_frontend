/**
 * Apollo Client factory for the GraphQL pilot.
 *
 * The pilot covers two pages (`/quizzes` and `/profile/[name]`). Every other
 * page keeps using SWR + the orval-generated REST client, so this client is
 * instantiated per page subtree by `ApolloSubtreeProvider` rather than mounted
 * globally. That keeps the Apollo and SWR cache spaces disjoint, which is the
 * boundary rule documented in the implementation plan.
 *
 * The endpoint defaults to `/graphql` (same-origin) because the backend mounts
 * the GraphQL handler outside its REST global prefix; an explicit
 * `NEXT_PUBLIC_GRAPHQL_URL` override is honoured for environments that put a
 * gateway in front of it.
 *
 * Errors carrying `extensions.code` are coerced into `ApiError` so existing
 * `isApiError` consumers keep working unchanged.
 */
import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
} from '@apollo/client';
import { ErrorLink } from '@apollo/client/link/error';
import {
  CombinedGraphQLErrors,
  CombinedProtocolErrors,
} from '@apollo/client/errors';
import { setContext } from '@apollo/client/link/context';

import { ApiError } from '@/lib/api/core/ApiError';

export const DEFAULT_GRAPHQL_ENDPOINT = '/graphql';
const AUTH_TOKEN_COOKIE_NAME = 'auth_token';

const resolveEndpoint = (): string => {
  const fromEnv = process.env.NEXT_PUBLIC_GRAPHQL_URL;
  if (typeof fromEnv === 'string' && fromEnv.length > 0) return fromEnv;
  return DEFAULT_GRAPHQL_ENDPOINT;
};

const readAuthCookie = (): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${AUTH_TOKEN_COOKIE_NAME}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
};

/**
 * Reads the auth cookie and attaches an Authorization header when present.
 * The cookie is read at request time so token refresh (which mutates the
 * cookie in place) is observed without recreating the client.
 */
const buildAuthLink = (): ApolloLink =>
  setContext((_operation, { headers }) => {
    const token = readAuthCookie();
    if (!token) return { headers };
    return {
      headers: {
        ...(headers as Record<string, string> | undefined),
        authorization: `Bearer ${token}`,
      },
    };
  });

type Rfc7807Extensions = {
  code?: string;
  status?: number;
  requestId?: string;
  correlationId?: string;
  instance?: string;
};

/**
 * Maps the GraphQL status enum emitted by the backend formatter to HTTP-style
 * statuses. Kept here (not in the formatter) because the formatter only runs
 * server-side; the client receives the GraphQL `message` and has to translate
 * the same codes to give `ApiError.isUnauthorized` etc. their meaning.
 */
const statusForCode = (code: string | undefined): number => {
  switch (code) {
    case 'UNAUTHENTICATED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'QUERY_TOO_DEEP':
    case 'QUERY_TOO_COMPLEX':
    case 'BAD_USER_INPUT':
      return 400;
    case 'RATE_LIMITED':
      return 429;
    default:
      return 500;
  }
};

/**
 * Re-throws GraphQL errors as `ApiError` so `isApiError(...)` continues to
 * identify them across the codebase. The original error is dropped because it
 * may carry backend-only stack traces; the GraphQL response surface is
 * sufficient for client-side branching.
 */
const buildErrorLink = (): ApolloLink =>
  new ErrorLink(({ error, operation }) => {
    if (CombinedGraphQLErrors.is(error)) {
      const first = error.errors[0];
      const extensions = (first.extensions ?? {}) as Rfc7807Extensions;
      // eslint-disable-next-line no-console
      console.warn(
        `[graphql] operation="${operation.operationName ?? 'anonymous'}" code="${extensions.code ?? 'UNKNOWN'}" message="${first.message}"`,
      );
      throw ApiError.fromInput({
        status:
          typeof extensions.status === 'number'
            ? extensions.status
            : statusForCode(extensions.code),
        code: extensions.code,
        message: first.message,
        requestId: extensions.requestId ?? extensions.correlationId,
        instance: extensions.instance,
      });
    }
    if (CombinedProtocolErrors.is(error)) {
      // Persisted queries, etc. Surface as a generic server error so consumers
      // can branch on `isServerError`.
      throw ApiError.fromInput({
        status: 500,
        code: 'GLOBAL_INTERNAL_ERROR',
        message: 'GraphQL protocol error',
      });
    }
    if (error instanceof Error) {
      throw ApiError.fromInput({
        status: 0,
        code: 'GLOBAL_NETWORK_ERROR',
        message: error.message,
      });
    }
  });

const buildCache = (): InMemoryCache =>
  new InMemoryCache({
    resultCaching: true,
    typePolicies: {},
  });

export interface CreateApolloClientOptions {
  /** Override the HTTP endpoint. Primarily for tests. */
  endpoint?: string;
  /**
   * Inject the auth token synchronously. When omitted, the factory reads the
   * `auth_token` cookie on every request.
   */
  getAuthToken?: () => string | null;
}

export const createApolloClient = (
  options: CreateApolloClientOptions = {},
): ApolloClient => {
  const httpLink = new HttpLink({ uri: options.endpoint ?? resolveEndpoint() });

  const authLink = options.getAuthToken
    ? setContext(() => {
        const token = options.getAuthToken?.() ?? null;
        if (!token) return {};
        return { headers: { authorization: `Bearer ${token}` } };
      })
    : buildAuthLink();

  return new ApolloClient({
    link: authLink.concat(httpLink).concat(buildErrorLink()),
    cache: buildCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network',
        errorPolicy: 'all',
        returnPartialData: false,
      },
      query: { fetchPolicy: 'cache-first', errorPolicy: 'all' },
    },
  });
};