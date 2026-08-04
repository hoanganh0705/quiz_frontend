/**
 * `RegistrationState.spec.tsx` — integration tests for the registration state badge.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.3 — Tournament registration and participant-state mutations.
 * Source ticket: TKT-5.3.G2.
 *
 * Tests cover:
 * - All status variants render correct badge
 * - Component is non-interactive
 * - Nothing renders for unknown/null status
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { RegistrationState } from '@/features/tournaments/components/RegistrationState';
import type { RegistrationStatus } from '@/features/tournaments/types';

describe('RegistrationState', () => {
  describe('null/unknown status', () => {
    it('renders nothing when status is null', () => {
      const { container } = render(<RegistrationState status={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when status is "unknown"', () => {
      const { container } = render(<RegistrationState status="unknown" />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('registered status', () => {
    it('renders "Registered" badge', () => {
      render(<RegistrationState status="registered" />);
      expect(screen.getByText('Registered')).toBeInTheDocument();
    });

    it('has correct data-status attribute', () => {
      render(<RegistrationState status="registered" />);
      const badge = screen.getByTestId('registration-state');
      expect(badge).toHaveAttribute('data-status', 'registered');
    });

    it('is non-interactive (no button or click handler)', () => {
      render(<RegistrationState status="registered" />);
      const badge = screen.getByTestId('registration-state');
      expect(badge.tagName).not.toBe('BUTTON');
      expect(badge).not.toHaveAttribute('onClick');
    });
  });

  describe('eligible status', () => {
    it('renders "Registration open" badge', () => {
      render(<RegistrationState status="eligible" />);
      expect(screen.getByText('Registration open')).toBeInTheDocument();
    });

    it('has correct data-status attribute', () => {
      render(<RegistrationState status="eligible" />);
      const badge = screen.getByTestId('registration-state');
      expect(badge).toHaveAttribute('data-status', 'eligible');
    });

    it('is non-interactive', () => {
      render(<RegistrationState status="eligible" />);
      const badge = screen.getByTestId('registration-state');
      expect(badge.tagName).not.toBe('BUTTON');
    });
  });

  describe('not_eligible status', () => {
    it('renders "Not eligible" badge', () => {
      render(<RegistrationState status="not_eligible" />);
      expect(screen.getByText('Not eligible')).toBeInTheDocument();
    });

    it('has correct data-status attribute', () => {
      render(<RegistrationState status="not_eligible" />);
      const badge = screen.getByTestId('registration-state');
      expect(badge).toHaveAttribute('data-status', 'not_eligible');
    });

    it('is non-interactive', () => {
      render(<RegistrationState status="not_eligible" />);
      const badge = screen.getByTestId('registration-state');
      expect(badge.tagName).not.toBe('BUTTON');
    });
  });

  describe('closed status', () => {
    it('renders "Registration closed" badge', () => {
      render(<RegistrationState status="closed" />);
      expect(screen.getByText('Registration closed')).toBeInTheDocument();
    });

    it('has correct data-status attribute', () => {
      render(<RegistrationState status="closed" />);
      const badge = screen.getByTestId('registration-state');
      expect(badge).toHaveAttribute('data-status', 'closed');
    });
  });

  describe('full status', () => {
    it('renders "Tournament full" badge', () => {
      render(<RegistrationState status="full" />);
      expect(screen.getByText('Tournament full')).toBeInTheDocument();
    });

    it('has correct data-status attribute', () => {
      render(<RegistrationState status="full" />);
      const badge = screen.getByTestId('registration-state');
      expect(badge).toHaveAttribute('data-status', 'full');
    });
  });
});
