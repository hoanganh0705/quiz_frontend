

export interface CaptureContext {

tags?: Readonly<Record<string, string>>;

contexts?: Readonly<Record<string, unknown>>;
}

export function captureException(
error: unknown,
context?: CaptureContext
): void {

void error;
void context;
}

export const CAPTURE_SURFACES = {
useCursorPaginated: 'useCursorPaginated',

useQuizByIdOrSlug: 'useQuizByIdOrSlug',
} as const;

export const CAPTURE_REASONS = {
cursorDecode: 'cursor-decode',

isCorrectLeak: 'isCorrect-leak',
} as const;

export type CaptureSurface =
(typeof CAPTURE_SURFACES)[keyof typeof CAPTURE_SURFACES];

export type CaptureReason =
(typeof CAPTURE_REASONS)[keyof typeof CAPTURE_REASONS];
