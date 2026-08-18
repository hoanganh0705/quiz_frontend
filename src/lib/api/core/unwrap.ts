

export type UnwrapEnvelopeKind =
| 'null'
  | 'primitive'
  | 'envelope'
  | 'passthrough';

export type UnwrapEnvelopeResult<T> =
| { readonly kind: 'null' }
  | { readonly kind: 'primitive'; readonly value: unknown }
  | { readonly kind: 'envelope'; readonly value: T | null }
  | { readonly kind: 'passthrough'; readonly value: unknown };

export function unwrapEnvelope<T = unknown>(payload: unknown): UnwrapEnvelopeResult<T> {
if (payload === null || payload === undefined) {
return { kind: 'null' };
  }

if (typeof payload !== 'object') {
return { kind: 'primitive', value: payload };
  }

if ('data' in payload) {
return { kind: 'envelope', value: (payload as { data: T | null }).data };
  }

return { kind: 'passthrough', value: payload };
}

export function isEnvelopeResult<T>(
result: UnwrapEnvelopeResult<T>,
): result is { readonly kind: 'envelope'; readonly value: T | null } {
return result.kind === 'envelope';
}

export function isNullResult<T>(
result: UnwrapEnvelopeResult<T>,
): result is { readonly kind: 'null' } {
return result.kind === 'null';
}

export function unwrapEnvelopeValue<T = unknown>(payload: unknown): T | null {
const result = unwrapEnvelope<T>(payload);
if (result.kind === 'envelope') return result.value;
if (result.kind === 'null') return null;
throw new TypeError(
`[unwrapEnvelopeValue] expected an envelope-shaped payload ({ data: T | null }) ` +
`but received kind="${result.kind}". Use \`unwrapEnvelope\` to discriminate ` +
`the four contract cases instead.`,
  );
}