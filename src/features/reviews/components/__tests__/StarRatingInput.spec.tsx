

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { StarRatingInput } from '@/features/reviews/components/StarRatingInput';

afterEach(() => {
cleanup();
});

beforeEach(() => {
vi.clearAllMocks();
});

describe('StarRatingInput — rendering', () => {
it('renders exactly five stars with accessible labels', () => {
render(<StarRatingInput value={null} onValueChange={() => undefined} />);

expect(screen.getByRole('radio', { name: '1 star' })).toBeInTheDocument();
expect(screen.getByRole('radio', { name: '2 stars' })).toBeInTheDocument();
expect(screen.getByRole('radio', { name: '3 stars' })).toBeInTheDocument();
expect(screen.getByRole('radio', { name: '4 stars' })).toBeInTheDocument();
expect(screen.getByRole('radio', { name: '5 stars' })).toBeInTheDocument();
expect(screen.queryAllByRole('radio')).toHaveLength(5);
  });

it('uses the supplied `ariaLabel` on the group', () => {
render(
<StarRatingInput
value={null}
onValueChange={() => undefined}
ariaLabel='Rate this quiz'
      />,
    );
expect(
screen.getByRole('radiogroup', { name: 'Rate this quiz' }),
    ).toBeInTheDocument();
  });
});

describe('StarRatingInput — selection', () => {
it('mouse click on the 4th star emits 4', () => {
const onValueChange = vi.fn();

render(<StarRatingInput value={null} onValueChange={onValueChange} />);

fireEvent.click(screen.getByRole('radio', { name: '4 stars' }));

expect(onValueChange).toHaveBeenCalledWith(4);
  });

it('controlled rerender updates the selected radio', () => {
const { rerender } = render(
<StarRatingInput value={null} onValueChange={() => undefined} />,
    );
expect(
screen.getByRole('radio', { name: '3 stars' }),
    ).not.toBeChecked();

rerender(
<StarRatingInput value={3} onValueChange={() => undefined} />,
    );
expect(screen.getByRole('radio', { name: '3 stars' })).toBeChecked();
  });

it('arrow keys move the selection between stars', () => {
const onValueChange = vi.fn();

const { rerender } = render(
<StarRatingInput value={3} onValueChange={onValueChange} />,
    );

const group = screen.getByRole('radiogroup');

fireEvent.click(screen.getByRole('radio', { name: '4 stars' }));
expect(onValueChange).toHaveBeenCalledWith(4);
rerender(<StarRatingInput value={4} onValueChange={onValueChange} />);
expect(
screen.getByRole('radio', { name: '4 stars', checked: true }),
    ).toBeInTheDocument();
expect(group).toBeInTheDocument();
  });

it('arrow left from 1 stays at 1 (clamped)', () => {
const onValueChange = vi.fn();

render(<StarRatingInput value={1} onValueChange={onValueChange} />);

const firstStar = screen.getByRole('radio', { name: '1 star' });
firstStar.focus();
fireEvent.keyDown(firstStar, { key: 'ArrowLeft' });

expect(onValueChange).not.toHaveBeenCalled();
  });

it('arrow right from 5 stays at 5 (clamped)', () => {
const onValueChange = vi.fn();

render(<StarRatingInput value={5} onValueChange={onValueChange} />);

const fifthStar = screen.getByRole('radio', { name: '5 stars' });
fifthStar.focus();
fireEvent.keyDown(fifthStar, { key: 'ArrowRight' });

expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe('StarRatingInput — disabled', () => {
it('disabled radios do not emit a change', () => {
const onValueChange = vi.fn();

render(
<StarRatingInput
value={null}
onValueChange={onValueChange}
disabled
      />,
    );

fireEvent.click(screen.getByRole('radio', { name: '3 stars' }));

expect(onValueChange).not.toHaveBeenCalled();
  });

it('every radio carries the disabled attribute when disabled', () => {
render(
<StarRatingInput
value={null}
onValueChange={() => undefined}
disabled
      />,
    );

const radios = screen.getAllByRole('radio');
for (const r of radios) {
expect(r).toBeDisabled();
    }
  });
});

describe('StarRatingInput — error association', () => {
it('renders `aria-invalid` and links the error text via `aria-describedby`', () => {
render(
<StarRatingInput
value={null}
onValueChange={() => undefined}
errorMessage='Rating is required'
      />,
    );

const group = screen.getByRole('radiogroup');
expect(group).toHaveAttribute('aria-invalid', 'true');
expect(group).toHaveAttribute('aria-describedby');

const errorText = screen.getByRole('alert');
expect(errorText).toHaveTextContent('Rating is required');
expect(errorText.id).toBe(group.getAttribute('aria-describedby'));
  });

it('does not render the error region when no error is supplied', () => {
render(<StarRatingInput value={null} onValueChange={() => undefined} />);

expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('StarRatingInput — null value', () => {
it('renders no checked radio when value is null', () => {
render(<StarRatingInput value={null} onValueChange={() => undefined} />);

const radios = screen.getAllByRole('radio');
for (const r of radios) {
expect(r).not.toBeChecked();
    }
  });
});
