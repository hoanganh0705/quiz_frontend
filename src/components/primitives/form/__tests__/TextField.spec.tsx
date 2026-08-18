

import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { z } from 'zod';

import { TextField } from '../TextField';
import { wrapWithFormProvider } from './form-test-utils';

const schema = z.object({
title: z.string().min(3, 'Title must be at least 3 characters'),
});

describe('<TextField />', () => {
it('(a) renders label + input wired via useController', () => {
wrapWithFormProvider(
<TextField<typeof schema> name='title' label='Quiz title' />,
{ schema, defaultValues: { title: '' } }
    );
const label = screen.getByText('Quiz title');
expect(label).toBeInTheDocument();
const input = screen.getByLabelText('Quiz title') as HTMLInputElement;
expect(input).toBeInTheDocument();
expect(input.tagName.toLowerCase()).toBe('input');
  });

it('(b) renders description and a zod-driven error message', async () => {
const { methods } = wrapWithFormProvider(
<TextField<typeof schema>
name='title'
label='Quiz title'
description='A short, descriptive title.'
      />,
{ schema, defaultValues: { title: '' } }
    );

expect(screen.getByText('A short, descriptive title.')).toBeInTheDocument();

methods.trigger('title');
await waitFor(() => {
expect(
screen.getByText('Title must be at least 3 characters')
      ).toBeInTheDocument();
    });
  });

it('(c) is disabled while the form is submitting (default)', () => {

wrapWithFormProvider(
<TextField<typeof schema> name='title' label='Quiz title' disabled />,
{ schema, defaultValues: { title: '' } }
    );
const input = screen.getByLabelText('Quiz title') as HTMLInputElement;
expect(input.disabled).toBe(true);
  });

it('(d) disabled=true forces disable; disabled=false keeps it enabled', () => {
wrapWithFormProvider(
<TextField<typeof schema> name='title' label='Forced disabled' disabled />,
{ schema, defaultValues: { title: '' } }
    );
expect(
(screen.getByLabelText('Forced disabled') as HTMLInputElement).disabled
    ).toBe(true);

wrapWithFormProvider(
<TextField<typeof schema>
name='title'
label='Not disabled'
disabled={false}
      />,
{ schema, defaultValues: { title: '' } }
    );
expect(
(screen.getByLabelText('Not disabled') as HTMLInputElement).disabled
    ).toBe(false);
  });

it('(e) the label htmlFor matches the input id', () => {
wrapWithFormProvider(
<TextField<typeof schema> name='title' label='Quiz title' />,
{ schema, defaultValues: { title: '' } }
    );
const input = screen.getByLabelText('Quiz title') as HTMLInputElement;
const label = screen.getByText('Quiz title');
expect(input.id).toBe(label.getAttribute('for'));
  });
});