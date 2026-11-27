"use client";

import { forwardRef, useState } from "react";

import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/shared/utils/merge-class-names";

import { Input } from "@/components/ui/Input";

import type { ComponentPropsWithoutRef } from "react";

export interface PasswordInputProps
  extends Omit<ComponentPropsWithoutRef<typeof Input>, "type"> {
  revealLabel?: string;
  hideLabel?: string;
  toggleTestId?: string;
  iconClassName?: string;
  toggleClassName?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    {
      className,
      disabled,
      revealLabel = "Show password",
      hideLabel = "Hide password",
      toggleTestId,
      iconClassName = "h-5 w-5",
      toggleClassName,
      ...inputProps
    },
    ref,
  ) {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          disabled={disabled}
          className={cn("pr-11", className)}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          disabled={disabled}
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
            toggleClassName,
          )}
          aria-label={visible ? hideLabel : revealLabel}
          data-testid={toggleTestId}
        >
          {visible ? (
            <EyeOff className={iconClassName} aria-hidden="true" />
          ) : (
            <Eye className={iconClassName} aria-hidden="true" />
          )}
        </button>
      </div>
    );
  },
);
