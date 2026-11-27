"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Search, X } from "lucide-react";

import { useDebouncedValue } from "@/lib/utils/use-debounced-value";

import { Input } from "@/components/ui/Input";

import { cn } from "@/shared/utils/merge-class-names";

const SEARCH_DEBOUNCE_MS = 150;

export interface TagFilterInputProps {
  value: string;

  onChange: (debouncedValue: string) => void;

  describedBy?: string;

  className?: string;
}

export function TagFilterInput({
  value,
  onChange,
  describedBy,
  className,
}: TagFilterInputProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [typed, setTyped] = useState(value);
  const { debouncedValue: debounced } = useDebouncedValue(
    typed,
    SEARCH_DEBOUNCE_MS,
  );

  useEffect(() => {
    setTyped((current) => (current === value ? current : value));
  }, [value]);

  useEffect(() => {
    onChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const handleClear = useCallback(() => {
    setTyped("");
    onChange("");
    inputRef.current?.focus();
  }, [onChange]);

  return (
    <div className={cn("relative flex w-full items-center", className)}>
      <Search
        className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        type="search"
        placeholder="Filter by name or slug…"
        aria-label="Filter tags by name or slug"
        aria-describedby={describedBy}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && typed.length > 0) {
            e.preventDefault();
            handleClear();
          }
        }}
        autoComplete="off"
        spellCheck={false}
        data-testid="tag-filter-input"
        className="h-10 sm:h-9 bg-background pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {typed.length > 0 ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear tag filter"
          data-testid="tag-filter-clear"
          className="absolute right-1 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
