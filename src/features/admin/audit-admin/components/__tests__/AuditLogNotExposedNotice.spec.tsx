

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AuditLogNotExposedNotice } from '../AuditLogNotExposedNotice';

describe('AuditLogNotExposedNotice', () => {
it('renders the notice', () => {
render(<AuditLogNotExposedNotice />);

expect(
screen.getByTestId('audit-log-not-exposed-notice'),
    ).toBeInTheDocument();
  });

it('displays a clear title', () => {
render(<AuditLogNotExposedNotice />);

expect(
screen.getByTestId('audit-log-not-exposed-title'),
    ).toHaveTextContent('Audit log endpoint not exposed by backend');
  });

it('displays explanatory body', () => {
render(<AuditLogNotExposedNotice />);

expect(
screen.getByTestId('audit-log-not-exposed-body'),
    ).toBeInTheDocument();
  });

it('links to the local Sentry project for triage', () => {
render(<AuditLogNotExposedNotice />);

const link = screen.getByTestId('audit-log-not-exposed-sentry-link');
expect(link).toHaveAttribute('href');
expect(link.getAttribute('href')).toMatch(/sentry/);
  });

it('links to the documentation reference', () => {
render(<AuditLogNotExposedNotice />);

const link = screen.getByTestId('audit-log-not-exposed-docs-link');
expect(link).toHaveAttribute('href');
expect(link.getAttribute('href')).toMatch(/AUDIT_ENDPOINT_CONTRACT/);
  });

it('uses role="alert" for accessibility', () => {
const { container } = render(<AuditLogNotExposedNotice />);
const notice = container.querySelector('[role="alert"]');
expect(notice).toBeInTheDocument();
  });

it('does not suggest functionality that does not exist', () => {
const { container } = render(<AuditLogNotExposedNotice />);
const html = container.innerHTML;

expect(html).not.toMatch(/loading entries/i);
expect(html).not.toMatch(/retry/i);
expect(html).not.toMatch(/viewing/i);
  });

it('links open in a new tab with rel=noopener', () => {
render(<AuditLogNotExposedNotice />);

const sentryLink = screen.getByTestId('audit-log-not-exposed-sentry-link');
expect(sentryLink.getAttribute('target')).toBe('_blank');
expect(sentryLink.getAttribute('rel')).toMatch(/noopener/);

const docsLink = screen.getByTestId('audit-log-not-exposed-docs-link');
expect(docsLink.getAttribute('target')).toBe('_blank');
expect(docsLink.getAttribute('rel')).toMatch(/noopener/);
  });
});