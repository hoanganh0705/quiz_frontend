

"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { Loader2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { cn } from "@/shared/utils/merge-class-names";

import {
useBulkCreateVersionQuestions,
type BulkCreateResult,
} from "@/features/quizzes/hooks/useBulkCreateVersionQuestions";
import {
parseBulkText,
type ParsedBulkRow,
} from "@/features/quizzes/validation/question-schemas";
import type {
BulkQuestionResultItem,
CreateAnswerOptionDto,
} from "@/features/quizzes/types/author-dtos";

const MAX_BULK_ROWS = 50;

export interface BulkQuestionFormProps {

quizId: string;

versionId: string;

questionCount: number;

isDraft: boolean;

onSuccess: () => void;

onError: (error: { code: string; message: string }) => void;
}

interface PasteAreaProps {
value: string;
onChange: (value: string) => void;
disabled: boolean;
}

function BulkQuestionPasteArea({
value,
onChange,
disabled,
}: PasteAreaProps): React.ReactElement {
const lineCount = value
    .trim()
    .split("\n")
    .filter((line) => line.trim()).length;
const exceedsLimit = lineCount > MAX_BULK_ROWS;

return (
<div className="space-y-2">
<div className="flex items-center justify-between">
<Label htmlFor="bulk-paste">
Paste questions (CSV or tab-separated)
        </Label>
<span
className={cn(
"text-xs",
exceedsLimit ? "text-destructive" : "text-muted-foreground",
          )}
        >
{lineCount} / {MAX_BULK_ROWS} rows
        </span>
</div>
<textarea
id="bulk-paste"
value={value}
onChange={(e) => onChange(e.target.value)}
disabled={disabled}
placeholder={`Paste your questions here...\n\nFormat: questionText, type, option1, option2, correctIndex\n\nExample:\n"What is 2+2?","single_choice","3","4","1"\n"Capital of France?","single_choice","Paris","London","0"`}
className={cn(
"min-h-48 w-full rounded-md border bg-background px-3 py-2 font-mono text-sm",
"placeholder:text-muted-foreground",
"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
disabled && "cursor-not-allowed opacity-50",
        )}
rows={12}
      />
{exceedsLimit && (
<div className="flex items-start gap-2 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3">
<AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600" />
<p className="text-sm text-yellow-800">
You pasted {lineCount} rows, but only {MAX_BULK_ROWS} can be
            submitted at once. Please send the rest as a second batch.
          </p>
</div>
      )}
</div>
  );
}

interface BulkResultListProps {
results: BulkQuestionResultItem[];
}

function BulkResultList({ results }: BulkResultListProps): React.ReactElement {
const successCount = results.filter((r) => r.status === 201).length;
const failCount = results.filter((r) => r.status !== 201).length;

return (
<div className="space-y-4">
{/* Summary */}
<div className="flex items-center gap-4">
{successCount > 0 && (
<div className="flex items-center gap-2 text-green-600">
<CheckCircle2 className="h-5 w-5" />
<span className="text-sm font-medium">{successCount} created</span>
</div>
        )}
{failCount > 0 && (
<div className="flex items-center gap-2 text-red-600">
<XCircle className="h-5 w-5" />
<span className="text-sm font-medium">{failCount} failed</span>
</div>
        )}
</div>

{/* Per-item results */}
<div className="space-y-2">
{results.map((result) => (
<div
key={result.index}
className={cn(
"flex items-center gap-3 rounded-lg border p-3",
result.status === 201
? "border-green-500/30 bg-green-500/5"
: "border-red-500/30 bg-red-500/5",
            )}
data-testid={`bulk-result-${result.index}`}
          >
{/* Status icon */}
{result.status === 201 ? (
<CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
            ) : (
<XCircle className="h-5 w-5 shrink-0 text-red-600" />
            )}

{/* Index */}
<span className="text-sm text-muted-foreground">
Row {result.index + 1}
</span>

{/* Message */}
<div className="flex-1">
{result.status === 201 ? (
<p className="text-sm text-green-700">
Created successfully
                  {result.questionId &&
` (${result.questionId.slice(0, 8)}...)`}
</p>
              ) : (
<p className="text-sm text-red-700">
{result.message || `Failed (${result.code})`}
</p>
              )}
</div>
</div>
        ))}
</div>
</div>
  );
}

function buildBulkPayload(
rows: ParsedBulkRow[],
startPosition: number,
): {
payload: {
questions: Array<{
position: number;
questionText: string;
imageUrl?: string;
answerOptions: CreateAnswerOptionDto[];
    }>;
  };
parseErrors: Array<{ index: number; message: string }>;
} {
const payload: Array<{
position: number;
questionText: string;
imageUrl?: string;
answerOptions: CreateAnswerOptionDto[];
  }> = [];
const parseErrors: Array<{ index: number; message: string }> = [];

rows.forEach((row, i) => {
if (!row.values) {
parseErrors.push({
index: row.index,
message: row.error ?? "Invalid row",
      });
return;
    }
const v = row.values;
payload.push({
position: startPosition + i,
questionText: v.questionText,
answerOptions: v.options.map((optValue, optIdx) => ({
position: optIdx + 1,
value: optValue,
isCorrect: v.correctIndices.includes(optIdx),
      })),
    });
  });

return { payload: { questions: payload }, parseErrors };
}

export const BulkQuestionForm = memo(function BulkQuestionForm({
quizId,
versionId,
questionCount,
isDraft,
onSuccess,
onError,
}: BulkQuestionFormProps): React.ReactElement {

const [pasteValue, setPasteValue] = useState("");
const [parseErrors, setParseErrors] = useState<
Array<{ index: number; message: string }>
  >([]);

const {
bulkCreate,
isLoading,
progress,
result: bulkResult,
cooldownSeconds,
clearResult,
  } = useBulkCreateVersionQuestions({
onComplete: (result: BulkCreateResult) => {
if (result.ok && result.questions.length > 0) {
onSuccess();
      } else if (!result.ok) {
onError({
code: "BULK_PARTIAL_FAILURE",
message: `${result.questions.length} of ${result.results.length} questions were created`,
        });
      }
    },
onError: (err) => {
onError({ code: err.code, message: err.message });
    },
  });

const parsedRows = useMemo(
() => parseBulkText(pasteValue, ","),
[pasteValue],
  );
const lineCount = parsedRows.length;
const validRowCount = parsedRows.filter((r) => r.values !== null).length;
const exceedsLimit = lineCount > MAX_BULK_ROWS;
const canSubmit =
validRowCount > 0 &&
validRowCount <= MAX_BULK_ROWS &&
isDraft &&
!isLoading;

const handleSubmit = useCallback(async () => {
if (!pasteValue.trim()) return;
if (exceedsLimit) {
onError({
code: "VALIDATION_ERROR",
message: `Maximum ${MAX_BULK_ROWS} questions per bulk submission`,
      });
return;
    }

const { payload, parseErrors: errors } = buildBulkPayload(
parsedRows,
questionCount + 1,
    );
setParseErrors(errors);
if (payload.questions.length === 0) {
onError({
code: "VALIDATION_ERROR",
message: "No valid rows to submit. Please fix the parse errors.",
      });
return;
    }

await bulkCreate(quizId, versionId, payload);
  }, [
pasteValue,
exceedsLimit,
parsedRows,
questionCount,
bulkCreate,
quizId,
versionId,
onError,
  ]);

const handleClear = useCallback(() => {
setPasteValue("");
setParseErrors([]);
clearResult();
  }, [clearResult]);

const isDisabled = !isDraft || isLoading;
const results: BulkQuestionResultItem[] | null =
bulkResult?.results ??
(parseErrors.length > 0
? parseErrors.map((e) => ({
index: e.index,
status: 422,
code: "PARSE_ERROR",
message: e.message,
        }))
: null);

return (
<div
className="rounded-lg border bg-card p-6"
data-testid="bulk-question-form"
    >
<h3 className="mb-6 text-lg font-semibold">Bulk add questions</h3>

<div className="space-y-6">
{/* Paste area */}
<BulkQuestionPasteArea
value={pasteValue}
onChange={setPasteValue}
disabled={isDisabled}
        />

{/* Format help */}
<div className="rounded-md bg-muted/50 p-4">
<h4 className="text-sm font-medium">Format guide</h4>
<p className="mt-1 text-xs text-muted-foreground">
Each row should contain: question text, type, options, and the
            correct option index.
          </p>
<pre className="mt-2 overflow-x-auto text-xs text-muted-foreground">
{`"Question text","type","Option 1","Option 2","0"`}
</pre>
<p className="mt-2 text-xs text-muted-foreground">
Valid types: single_choice, multiple_choice, true_false,
            short_answer
          </p>
</div>

{/* Results */}
{results && <BulkResultList results={results} />}

{/* Cooldown notice */}
{cooldownSeconds !== null && (
<p className="text-sm text-muted-foreground">
Rate limit: please wait {cooldownSeconds}s before trying again.
          </p>
        )}

{/* Actions */}
<div className="flex items-center justify-between">
<Button
type="button"
variant="ghost"
onClick={handleClear}
disabled={!pasteValue && !results}
          >
Clear
          </Button>

<div className="flex items-center gap-4">
{progress && (
<div className="flex items-center gap-2">
<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
<span className="text-sm text-muted-foreground">
{progress.label}
</span>
</div>
            )}

<Button
type="button"
onClick={handleSubmit}
disabled={isDisabled || !canSubmit}
            >
{isLoading ? (
<>
<Loader2 className="mr-2 h-4 w-4 animate-spin" />
Adding...
                </>
              ) : (
<>
Add{" "}
{validRowCount > 0
? `${validRowCount} questions`
: "questions"}
</>
              )}
</Button>
</div>
</div>
</div>
</div>
  );
});
