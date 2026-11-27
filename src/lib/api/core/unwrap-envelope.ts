import { ApiError } from "@/lib/api/core/ApiError";

/**
 * Unwraps a standard `{ data?: T }` API response envelope, throwing a typed
 * `ApiError` (500 / `GLOBAL_INTERNAL_ERROR`) when the `data` payload is absent.
 */
export function unwrapEnvelope<T>(
  envelope: { data?: T } | null | undefined,
  missingMessage: string,
): NonNullable<T> {
  if (!envelope || envelope.data === undefined || envelope.data === null) {
    throw ApiError.fromInput({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: missingMessage,
    });
  }
  return envelope.data as NonNullable<T>;
}
