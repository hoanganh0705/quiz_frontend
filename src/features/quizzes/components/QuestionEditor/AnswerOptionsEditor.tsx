

"use client";

import { memo } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";

import { cn } from "@/shared/utils/merge-class-names";

import type { QuestionType } from "@/features/quizzes/types/author-dtos";
import type { CreateAnswerOptionDto } from "@/features/quizzes/types/author-dtos";

import { QuestionCorrectMark } from "./QuestionCorrectMark";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

const TRUE_FALSE_OPTIONS = [
{ id: "true", value: "True" },
{ id: "false", value: "False" },
];

export interface AnswerOption {
id: string;
position: number;
value: string;
isCorrect: boolean;
}

export interface AnswerOptionsEditorProps {

options: AnswerOption[];

questionType: QuestionType;

onChange: (options: AnswerOption[]) => void;

disabled?: boolean;

error?: string;
}

interface OptionRowProps {
option: AnswerOption;
index: number;
questionType: QuestionType;
onUpdate: (updates: Partial<AnswerOption>) => void;
onRemove: () => void;
canRemove: boolean;
disabled: boolean;
}

const OptionRow = memo(function OptionRow({
option,
index,
questionType,
onUpdate,
onRemove,
canRemove,
disabled,
}: OptionRowProps): React.ReactElement {
const isRadio =
questionType === "single_choice" || questionType === "true_false";
const isTrueFalse = questionType === "true_false";
const isShortAnswer = questionType === "short_answer";

if (isShortAnswer) return <></>;

const handleCorrectChange = (newIsCorrect: boolean) => {
if (isRadio) {

onUpdate({ isCorrect: newIsCorrect });
    } else {
onUpdate({ isCorrect: newIsCorrect });
    }
  };

return (
<div
className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
data-testid={`answer-option-${index}`}
    >
{/* Position number */}
<div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-muted-foreground">
{option.position}
</div>

{/* Drag handle */}
<div className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground">
<GripVertical className="h-4 w-4" />
</div>

{/* Text input */}
<div className="flex-1">
<Input
value={option.value}
onChange={(e) => onUpdate({ value: e.target.value })}
placeholder={`Answer option ${option.position}`}
disabled={disabled || isTrueFalse}
className="max-w-sm"
aria-label={`Answer option ${option.position} text`}
        />
</div>

{/* Correct mark (not for short_answer) */}
{!isShortAnswer && (
<QuestionCorrectMark
id={option.id}
isCorrect={option.isCorrect}
questionType={questionType}
onChange={handleCorrectChange}
disabled={disabled}
name={`correct-${option.id}`}
        />
      )}

{/* Remove button */}
{!isTrueFalse && (
<Button
type="button"
variant="ghost"
size="sm"
className={cn(
"h-8 w-8 p-0 text-muted-foreground hover:text-destructive",
disabled && "cursor-not-allowed opacity-50",
          )}
disabled={disabled || !canRemove}
onClick={onRemove}
aria-label={`Remove option ${option.position}`}
        >
<Trash2 className="h-4 w-4" />
</Button>
      )}
</div>
  );
});

function TrueFalseOptions({
options,
questionType,
onUpdate,
disabled,
}: {
options: AnswerOption[];
questionType: QuestionType;
onUpdate: (updates: Partial<AnswerOption>) => void;
disabled: boolean;
}): React.ReactElement {
return (
<div className="space-y-2" data-testid="true-false-options">
<p className="text-sm text-muted-foreground">
True/False questions have fixed options. Mark the correct answer.
      </p>
{options.slice(0, 2).map((option, index) => (
<div
key={option.id}
className="flex items-center gap-3 rounded-lg border bg-card p-3"
data-testid={`true-false-option-${index}`}
        >
{/* Position */}
<div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-muted-foreground">
{index + 1}
</div>

{/* Value (fixed) */}
<div className="flex-1">
<p className="font-medium">{option.value}</p>
</div>

{/* Correct mark */}
<QuestionCorrectMark
id={option.id}
isCorrect={option.isCorrect}
questionType={questionType}
onChange={(isCorrect) => onUpdate({ isCorrect })}
disabled={disabled}
          />
</div>
      ))}
</div>
  );
}

function ShortAnswerPlaceholder(): React.ReactElement {
return (
<div
className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-center"
data-testid="short-answer-placeholder"
    >
<p className="text-sm text-muted-foreground">
Short answer questions do not have answer options.
      </p>
<p className="mt-1 text-xs text-muted-foreground/70">
Players will type their own answer, which will be auto-graded.
      </p>
</div>
  );
}

export const AnswerOptionsEditor = memo(function AnswerOptionsEditor({
options,
questionType,
onChange,
disabled,
error,
}: AnswerOptionsEditorProps): React.ReactElement {
const canAdd = options.length < MAX_OPTIONS;
const canRemove = options.length > MIN_OPTIONS;
const isTrueFalse = questionType === "true_false";
const isShortAnswer = questionType === "short_answer";

const handleAdd = () => {
if (!canAdd) return;

const newPosition = options.length + 1;
const newOption: AnswerOption = {
id: crypto.randomUUID(),
position: newPosition,
value: "",
isCorrect: false,
    };

onChange([...options, newOption]);
  };

const handleRemove = (index: number) => {
if (!canRemove) return;

const newOptions = options.filter((_, i) => i !== index);

const reindexed = newOptions.map((opt, i) => ({
...opt,
position: i + 1,
    }));

onChange(reindexed);
  };

const handleUpdate = (index: number, updates: Partial<AnswerOption>) => {
const newOptions = [...options];
newOptions[index] = { ...newOptions[index]!, ...updates };
onChange(newOptions);
  };

if (isShortAnswer) {
return (
<div className="space-y-2">
<label className="text-sm font-medium">Answer Options</label>
<ShortAnswerPlaceholder />
</div>
    );
  }

if (isTrueFalse) {
return (
<div className="space-y-2">
<label className="text-sm font-medium">Answer Options</label>
<TrueFalseOptions
options={options.slice(0, 2)}
questionType={questionType}
onUpdate={(updates) => {

const trueIdx = options.findIndex((o) => o.value === "True");
const falseIdx = options.findIndex((o) => o.value === "False");

if (updates.isCorrect !== undefined) {

const newOptions = [...options];
if (trueIdx !== -1) {
newOptions[trueIdx] = {
...newOptions[trueIdx]!,
isCorrect:
updates.isCorrect &&
"True".includes(options[trueIdx]?.value ?? ""),
                };
              }
if (falseIdx !== -1) {
newOptions[falseIdx] = {
...newOptions[falseIdx]!,
isCorrect:
updates.isCorrect &&
"False".includes(options[falseIdx]?.value ?? ""),
                };
              }
onChange(newOptions);
            }
          }}
disabled={disabled ?? false}
        />
{error && (
<p className="text-sm text-destructive" role="alert">
{error}
</p>
        )}
</div>
    );
  }

return (
<div className="space-y-3">
<div className="flex items-center justify-between">
<label className="text-sm font-medium">Answer Options</label>
<span className="text-xs text-muted-foreground">
{options.length} / {MAX_OPTIONS}
</span>
</div>

{/* Options list */}
<div className="space-y-2" role="list" aria-label="Answer options">
{options.map((option, index) => (
<OptionRow
key={option.id}
option={option}
index={index}
questionType={questionType}
onUpdate={(updates) => handleUpdate(index, updates)}
onRemove={() => handleRemove(index)}
canRemove={canRemove}
disabled={disabled ?? false}
          />
        ))}
</div>

{/* Error message */}
{error && (
<p className="text-sm text-destructive" role="alert">
{error}
</p>
      )}

{/* Add button */}
<Button
type="button"
variant="outline"
size="sm"
className="mt-2"
onClick={handleAdd}
disabled={disabled || !canAdd}
      >
<Plus className="mr-2 h-4 w-4" />
Add option
      </Button>
</div>
  );
});
