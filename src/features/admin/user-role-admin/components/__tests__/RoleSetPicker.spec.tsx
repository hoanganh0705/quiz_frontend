/**
 * `RoleSetPicker` unit tests.
 *
 * Source epic:   Epic 7.10 — User Role Grant: USER_GRANT_ROLE with Secondary Confirm.
 * Source ticket: TKT-7.10.E1.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DOCUMENTED_ROLES } from '../../user-role-admin-types';
import { RoleSetPicker } from '../RoleSetPicker';

describe('RoleSetPicker', () => {
  it('renders all roles from DOCUMENTED_ROLES', () => {
    render(
      <RoleSetPicker selectedRole={null} onSelect={vi.fn()} />,
    );

    const options = screen.getAllByTestId('role-picker-option');
    expect(options).toHaveLength(DOCUMENTED_ROLES.length);
  });

  it('does not render any free-form text input', () => {
    render(
      <RoleSetPicker selectedRole={null} onSelect={vi.fn()} />,
    );

    const inputs = document.querySelectorAll('input');
    expect(inputs).toHaveLength(0);
  });

  it('calls onSelect with the selected role', () => {
    const onSelect = vi.fn();
    render(
      <RoleSetPicker selectedRole={null} onSelect={onSelect} />,
    );

    const firstOption = screen.getAllByTestId('role-picker-option')[0]!;
    fireEvent.click(firstOption);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: firstOption.getAttribute('data-role-name') }),
    );
  });

  it('marks the selected role as selected', () => {
    const firstRole = DOCUMENTED_ROLES[0]!;
    render(
      <RoleSetPicker
        selectedRole={firstRole.name}
        onSelect={vi.fn()}
      />,
    );

    const firstOption = screen.getAllByTestId('role-picker-option')[0]!;
    expect(firstOption.getAttribute('data-selected')).toBe('true');
  });

  it('does not call onSelect when disabled', () => {
    const onSelect = vi.fn();
    render(
      <RoleSetPicker
        selectedRole={null}
        onSelect={onSelect}
        disabled={true}
      />,
    );

    const firstOption = screen.getAllByTestId('role-picker-option')[0]!;
    fireEvent.click(firstOption);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renders the role name and description for each option', () => {
    render(
      <RoleSetPicker selectedRole={null} onSelect={vi.fn()} />,
    );

    const names = screen.getAllByTestId('role-picker-option-name');
    const descriptions = screen.getAllByTestId('role-picker-option-description');

    expect(names).toHaveLength(DOCUMENTED_ROLES.length);
    expect(descriptions).toHaveLength(DOCUMENTED_ROLES.length);

    DOCUMENTED_ROLES.forEach((role, idx) => {
      expect(names[idx]).toHaveTextContent(role.name);
      expect(descriptions[idx]).toHaveTextContent(role.description);
    });
  });
});
