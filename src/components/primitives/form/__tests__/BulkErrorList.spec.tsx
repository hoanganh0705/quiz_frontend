

import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { BulkErrorList } from '../BulkErrorList';
import type { BulkError } from '@/lib/forms/useQuizForm';

const sampleBulkErrors: BulkError[] = [
{
index: 0,
status: 409,
code: 'QUIZ_QUESTION_POSITION_CONFLICT',
message: 'A question already exists at this position.',
field: 'position',
  },
{
index: 2,
status: 422,
code: 'QUIZ_VALIDATION_FAILED',
message: 'Question text cannot be empty.',
field: 'questionText',
  },
{
index: 4,
status: 0,
code: 'GLOBAL_VALIDATION_FAILED',
message: 'Unknown field.',
  },
];

describe('<BulkErrorList />', () => {
it('(a) renders nothing when bulkError is empty', () => {
const { container } = render(
<BulkErrorList
bulkError={[]}
onReSubmitFailed={() => undefined}
onDismiss={() => undefined}
      />
    );
expect(container.querySelector('[data-testid="bulk-error-list"]')).toBeNull();
  });

it('(b) renders one row per bulk error with index, title, message, field, status', () => {
render(
<BulkErrorList
bulkError={sampleBulkErrors}
onReSubmitFailed={() => undefined}
onDismiss={() => undefined}
      />
    );

expect(screen.getByTestId('bulk-error-list-item-0')).toBeInTheDocument();
expect(screen.getByTestId('bulk-error-list-item-2')).toBeInTheDocument();
expect(screen.getByTestId('bulk-error-list-item-4')).toBeInTheDocument();

expect(screen.getByTestId('bulk-error-list-item-0-title')).toHaveTextContent(
/Question Position Conflict/i
    );
expect(
screen.getByTestId('bulk-error-list-item-0-message')
    ).toHaveTextContent('A question already exists at this position.');
expect(screen.getByTestId('bulk-error-list-item-0-field')).toHaveTextContent(
'position'
    );

expect(screen.getByLabelText('HTTP status 409')).toBeInTheDocument();
  });

it('(c) clicking "Re-submit failed only" calls onReSubmitFailed', () => {
const onReSubmitFailed = vi.fn();
render(
<BulkErrorList
bulkError={sampleBulkErrors}
onReSubmitFailed={onReSubmitFailed}
onDismiss={() => undefined}
      />
    );
fireEvent.click(screen.getByTestId('bulk-error-list-resubmit-failed'));
expect(onReSubmitFailed).toHaveBeenCalledTimes(1);
  });

it('(d) clicking "Dismiss" calls onDismiss', () => {
const onDismiss = vi.fn();
render(
<BulkErrorList
bulkError={sampleBulkErrors}
onReSubmitFailed={() => undefined}
onDismiss={onDismiss}
      />
    );
fireEvent.click(screen.getByTestId('bulk-error-list-dismiss'));
expect(onDismiss).toHaveBeenCalledTimes(1);
  });

it('(e) exposes role="alert" on the root and role="listitem" on each row', () => {
const { container } = render(
<BulkErrorList
bulkError={sampleBulkErrors}
onReSubmitFailed={() => undefined}
onDismiss={() => undefined}
      />
    );
const root = container.querySelector('[data-testid="bulk-error-list"]');
expect(root).toHaveAttribute('role', 'alert');
const items = container.querySelectorAll('[role="listitem"]');
expect(items.length).toBe(sampleBulkErrors.length);
  });

it('(f) does not render the "Field" line when the error has no field', () => {
render(
<BulkErrorList
bulkError={[sampleBulkErrors[2]!]}
onReSubmitFailed={() => undefined}
onDismiss={() => undefined}
      />
    );
expect(
screen.queryByTestId('bulk-error-list-item-4-field')
    ).toBeNull();
  });

it('(g) pluralises the heading correctly: 1 row, 2 rows', () => {
const { rerender } = render(
<BulkErrorList
bulkError={[sampleBulkErrors[0]!]}
onReSubmitFailed={() => undefined}
onDismiss={() => undefined}
      />
    );
expect(screen.getByTestId('bulk-error-list-title').textContent).toMatch(
/1 row failed/
    );

rerender(
<BulkErrorList
bulkError={sampleBulkErrors}
onReSubmitFailed={() => undefined}
onDismiss={() => undefined}
      />
    );
expect(screen.getByTestId('bulk-error-list-title').textContent).toMatch(
/3 rows failed/
    );
  });

it('exposes the bulk-error count as a data attribute for testability', () => {
const { container } = render(
<BulkErrorList
bulkError={sampleBulkErrors}
onReSubmitFailed={() => undefined}
onDismiss={() => undefined}
      />
    );
expect(
container.querySelector('[data-testid="bulk-error-list"]')
    ).toHaveAttribute('data-bulk-error-count', '3');
  });

it('falls back to a default copy when the code is not a known ErrorCode', () => {
const unknownErrors: BulkError[] = [
{
index: 7,
status: 500,
code: 'UNKNOWN_CODE_FROM_BACKEND' as BulkError['code'],
message: 'Backend emitted an unknown code.',
      },
    ];
render(
<BulkErrorList
bulkError={unknownErrors}
onReSubmitFailed={() => undefined}
onDismiss={() => undefined}
      />
    );

expect(
screen.getByTestId('bulk-error-list-item-7-title')
    ).toHaveTextContent(/Something went wrong/i);
  });
});