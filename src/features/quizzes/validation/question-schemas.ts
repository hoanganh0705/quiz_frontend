

import { z } from "zod";

import {
QUESTION_TYPE_VALUES,
QUESTION_VALIDATION,
} from "@/features/quizzes/types/author-dtos";

export const questionTypeSchema = z.enum(QUESTION_TYPE_VALUES);

export const questionTextSchema = z
  .string()
  .min(
QUESTION_VALIDATION.TEXT_MIN,
`Question text must be at least ${QUESTION_VALIDATION.TEXT_MIN} character`,
  )
  .max(
QUESTION_VALIDATION.TEXT_MAX,
`Question text cannot exceed ${QUESTION_VALIDATION.TEXT_MAX} characters`,
  );

export const questionImageSchema = z
  .union([z.string().url().max(2048), z.null(), z.undefined()])
  .optional();

export const answerOptionTextSchema = z
  .string()
  .min(
QUESTION_VALIDATION.OPTION_TEXT_MIN,
`Option text must be at least ${QUESTION_VALIDATION.OPTION_TEXT_MIN} character`,
  )
  .max(
QUESTION_VALIDATION.OPTION_TEXT_MAX,
`Option text cannot exceed ${QUESTION_VALIDATION.OPTION_TEXT_MAX} characters`,
  );

export const answerOptionPositionSchema = z
  .number()
  .int()
  .min(1, "Position must be at least 1");

export const questionPositionSchema = z
  .number()
  .int()
  .min(1, "Position must be at least 1");

export const answerOptionSchema = z.object({

id: z.string(),

position: answerOptionPositionSchema,

value: answerOptionTextSchema,

isCorrect: z.boolean(),
});

export const answerOptionsArraySchema = z
  .array(answerOptionSchema)
  .min(
QUESTION_VALIDATION.OPTIONS_MIN,
`At least ${QUESTION_VALIDATION.OPTIONS_MIN} answer options are required`,
  )
  .max(
QUESTION_VALIDATION.OPTIONS_MAX,
`No more than ${QUESTION_VALIDATION.OPTIONS_MAX} answer options are allowed`,
  );

function validateCorrectAnswers(
options: z.infer<typeof answerOptionSchema>[],
questionType: z.infer<typeof questionTypeSchema>,
): boolean {
const correctCount = options.filter((o) => o.isCorrect).length;

switch (questionType) {
case "single_choice":
return correctCount === 1;
case "multiple_choice":
return correctCount >= 1;
case "true_false":
return correctCount === 1;
case "short_answer":
return correctCount >= 0;
default:
return false;
  }
}

const CORRECT_ANSWERS_MESSAGES: Record<
z.infer<typeof questionTypeSchema>,
string
> = {
single_choice: "Single choice questions must have exactly 1 correct answer",
multiple_choice:
"Multiple choice questions must have at least 1 correct answer",
true_false: "True/False questions must have exactly 1 correct answer",
short_answer: "Short answer questions do not require correct answers",
};

export const createQuestionSchema = z
  .object({

questionText: questionTextSchema,

imageUrl: questionImageSchema,

questionType: questionTypeSchema,

answerOptions: answerOptionsArraySchema,
  })
  .refine(
(data) => validateCorrectAnswers(data.answerOptions, data.questionType),
{
message: "Please mark the correct answer(s)",
path: ["answerOptions"],
    },
  );

export type CreateQuestionFormValues = z.infer<typeof createQuestionSchema>;

export const bulkQuestionRowSchema = z.object({

questionText: questionTextSchema,

imageUrl: questionImageSchema,

questionType: questionTypeSchema,

answerOptions: answerOptionsArraySchema,
});

export const bulkQuestionsSchema = z
  .array(bulkQuestionRowSchema)
  .min(
QUESTION_VALIDATION.BULK_MIN,
`At least ${QUESTION_VALIDATION.BULK_MIN} question is required`,
  )
  .max(
QUESTION_VALIDATION.BULK_MAX,
`No more than ${QUESTION_VALIDATION.BULK_MAX} questions can be added at once`,
  );

export type BulkQuestionRow = z.infer<typeof bulkQuestionRowSchema>;

export type BulkQuestionsFormValues = z.infer<typeof bulkQuestionsSchema>;

export interface ParsedBulkRow {

index: number;

values: {
questionText: string;
questionType: string;
options: string[];
correctIndices: number[];
  } | null;

error?: string;
}

export function parseBulkText(
text: string,
delimiter: "," | "\t" = ",",
): ParsedBulkRow[] {
const lines = text.trim().split("\n");
const results: ParsedBulkRow[] = [];

for (let i = 0; i < lines.length; i++) {
const line = lines[i]!.trim();
if (!line) continue;

try {

const values = parseCSVLine(line, delimiter);

if (values.length < 3) {
results.push({
index: i,
values: null,
error: "Row must have at least: question text, type, and 1 option",
        });
continue;
      }

const [questionText, questionType, ...rest] = values;

const lastValue = rest[rest.length - 1];
const correctIndices: number[] = [];

if (lastValue && /^\d+$/.test(lastValue)) {
const idx = parseInt(lastValue, 10);
if (idx >= 0 && idx < rest.length - 1) {
correctIndices.push(idx);
rest.pop();
        }
      }

const options = rest.map((v) => v.trim()).filter(Boolean);

if (!options.length) {
results.push({
index: i,
values: null,
error: "At least 1 option is required",
        });
continue;
      }

const validType = QUESTION_TYPE_VALUES.includes(questionType as never);
if (!validType) {
results.push({
index: i,
values: null,
error: `Invalid question type: "${questionType}"`,
        });
continue;
      }

results.push({
index: i,
values: {
questionText: questionText.trim(),
questionType,
options,
correctIndices,
        },
      });
    } catch {
results.push({
index: i,
values: null,
error: "Failed to parse row",
      });
    }
  }

return results;
}

function parseCSVLine(line: string, delimiter: "," | "\t"): string[] {
const result: string[] = [];
let current = "";
let inQuotes = false;

for (let i = 0; i < line.length; i++) {
const char = line[i]!;

if (char === '"') {
if (inQuotes && line[i + 1] === '"') {

current += '"';
i++;
      } else {
inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
result.push(current.trim());
current = "";
    } else {
current += char;
    }
  }

result.push(current.trim());
return result;
}
