"use client";

import Link from "next/link";

import { Button } from "@/components/ui/Button";

import { cn } from "@/shared/utils/merge-class-names";

import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost";
  icon?: LucideIcon;
}

interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  className?: string;
  size?: "sm" | "md" | "lg";
  headingLevel?: "h2" | "h3";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
  className,
  size = "md",
  headingLevel = "h3",
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: "py-8",
      iconWrapper: "p-3 mb-3",
      icon: "h-6 w-6",
      title: "text-base",
      description: "text-xs max-w-[250px]",
    },
    md: {
      container: "py-12",
      iconWrapper: "p-4 mb-4",
      icon: "h-8 w-8",
      title: "text-lg",
      description: "text-sm max-w-sm",
    },
    lg: {
      container: "py-16",
      iconWrapper: "p-6 mb-4",
      icon: "h-12 w-12",
      title: "text-xl",
      description: "text-base max-w-md",
    },
  };

  const sizes = sizeClasses[size];
  const HeadingTag = headingLevel;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 text-center",
        sizes.container,
        className,
      )}
    >
      <div className={cn("rounded-full bg-muted", sizes.iconWrapper)}>
        <Icon
          className={cn("text-muted-foreground", sizes.icon)}
          aria-hidden="true"
        />
      </div>
      <HeadingTag
        className={cn(
          "font-semibold mb-2 text-foreground max-w-full break-words",
          sizes.title,
        )}
      >
        {title}
      </HeadingTag>
      <p className={cn("text-muted-foreground mb-6", sizes.description)}>
        {description}
      </p>
      {actions && actions.length > 0 && (
        <div className="flex flex-wrap gap-3 justify-center">
          {actions.map((action, index) => {
            const ActionIcon = action.icon;
            const resolvedVariant =
              action.variant ?? (index === 0 ? "default" : "outline");
            const brandClassName =
              resolvedVariant === "default"
                ? "bg-default hover:bg-default-hover text-default-foreground"
                : undefined;
            const buttonContent = (
              <>
                {ActionIcon && (
                  <ActionIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {action.label}
              </>
            );

            if (action.href) {
              return (
                <Button
                  key={index}
                  variant={resolvedVariant}
                  asChild
                  className={brandClassName}
                >
                  <Link href={action.href}>{buttonContent}</Link>
                </Button>
              );
            }

            return (
              <Button
                key={index}
                variant={resolvedVariant}
                onClick={action.onClick}
                className={brandClassName}
              >
                {buttonContent}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
