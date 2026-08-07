'use client';

/**
 * `features/admin/user-role-admin/components/RoleSetPicker.tsx`
 *
 * Source epic:   Epic 7.10 — User Role Grant: USER_GRANT_ROLE with Secondary Confirm.
 * Source ticket: TKT-7.10.E1.
 *
 * ## What this component renders
 *
 * A controlled picker that renders only the roles from `DOCUMENTED_ROLES`.
 * No free-form text input is rendered.
 */

import { memo } from 'react';

import { ShieldAlert } from 'lucide-react';

import { DOCUMENTED_ROLES, type DocumentedRole } from '../user-role-admin-types';

export interface RoleSetPickerProps {
  /** The currently selected role name, or null if none selected */
  selectedRole: string | null;
  /** Called when a role is selected */
  onSelect: (role: DocumentedRole) => void;
  /** Whether the picker is disabled */
  disabled?: boolean;
}

interface RoleOptionProps {
  role: DocumentedRole;
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
}

const RoleOption = memo(function RoleOption({
  role,
  isSelected,
  onSelect,
  disabled,
}: RoleOptionProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`
        flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
        ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'}
        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
      `}
      data-testid="role-picker-option"
      data-role-name={role.name}
      data-selected={isSelected}
    >
      {/* Radio indicator */}
      <div
        className={`
          mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border
          ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'}
        `}
        aria-hidden="true"
      >
        {isSelected && (
          <div className="h-2 w-2 rounded-full bg-background" />
        )}
      </div>

      {/* Role info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-medium"
            data-testid="role-picker-option-name"
          >
            {role.name}
          </span>
          {role.isHighestPrivilege && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive"
              data-testid="role-picker-highest-privilege-badge"
            >
              <ShieldAlert className="h-3 w-3" aria-hidden="true" />
              highest privilege
            </span>
          )}
        </div>
        <p
          className="mt-0.5 text-xs text-muted-foreground"
          data-testid="role-picker-option-description"
        >
          {role.description}
        </p>
      </div>
    </button>
  );
});

export const RoleSetPicker = memo(function RoleSetPicker({
  selectedRole,
  onSelect,
  disabled = false,
}: RoleSetPickerProps): React.ReactElement {
  const handleSelect = (role: DocumentedRole) => {
    if (!disabled) {
      onSelect(role);
    }
  };

  return (
    <div
      className="flex flex-col gap-2"
      data-testid="role-set-picker"
      role="radiogroup"
      aria-label="Select a role"
    >
      {DOCUMENTED_ROLES.map((role) => (
        <RoleOption
          key={role.name}
          role={role}
          isSelected={selectedRole === role.name}
          onSelect={() => handleSelect(role)}
          disabled={disabled}
        />
      ))}
    </div>
  );
});
