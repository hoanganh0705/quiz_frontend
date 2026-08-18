"use client";

import * as React from "react";
import { Search, X, Clock, ArrowUp, ArrowDown, CornerDownLeft } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/shared/utils/merge-class-names";

import { useDebouncedValue } from "@/lib/utils/use-debounced-value";
import { SEARCH_INPUT_DEBOUNCE_MS } from "@/features/search/hooks/useDebouncedValue";
import {
useSearchHistory,
SEARCH_HISTORY_MAX_ENTRIES,
} from "@/features/search/hooks/useSearchHistory";
import { SEARCH_MIN_QUERY_LENGTH } from "@/features/search/hooks/useSearch";

const MAX_VISIBLE_SUGGESTIONS = 5;

export interface SearchInputProps {

value?: string;

onSubmit?: (query: string) => void;

placeholder?: string;

className?: string;
}

export function SearchInput({
value: controlledValue,
onSubmit,
placeholder = "Search quizzes, users, tournaments…",
className,
}: SearchInputProps) {

const [internalValue, setInternalValue] = React.useState<string>("");

const inputValue =
controlledValue !== undefined ? controlledValue : internalValue;

const debouncedValue = useDebouncedValue(inputValue, SEARCH_INPUT_DEBOUNCE_MS).debouncedValue;

const [isOpen, setIsOpen] = React.useState(false);
const [highlightedIndex, setHighlightedIndex] = React.useState(-1);

const { entries: historyEntries } = useSearchHistory();
const visibleSuggestions = historyEntries.slice(0, MAX_VISIBLE_SUGGESTIONS);
const showSuggestions = isOpen && visibleSuggestions.length > 0;

const inputRef = React.useRef<HTMLInputElement>(null);
const listRef = React.useRef<HTMLUListElement>(null);

const handleKeyDown = React.useCallback(
(e: React.KeyboardEvent<HTMLInputElement>) => {
if (!showSuggestions) return;

switch (e.key) {
case "ArrowDown":
e.preventDefault();
setHighlightedIndex((prev) =>
prev < visibleSuggestions.length - 1 ? prev + 1 : prev,
          );
break;
case "ArrowUp":
e.preventDefault();
setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
break;
case "Enter":
e.preventDefault();
if (highlightedIndex >= 0) {

const picked = visibleSuggestions[highlightedIndex]!;
commit(picked.query);
          } else {

commit(inputValue);
          }
break;
case "Escape":
e.preventDefault();
setIsOpen(false);
setHighlightedIndex(-1);
inputRef.current?.blur();
break;
      }
    },
[showSuggestions, highlightedIndex, visibleSuggestions, inputValue],
  );

const commit = React.useCallback(
(query: string) => {
const trimmed = query.trim();
if (trimmed.length < SEARCH_MIN_QUERY_LENGTH) return;
if (onSubmit) onSubmit(trimmed);
setIsOpen(false);
setHighlightedIndex(-1);
    },
[onSubmit],
  );

const handleChange = React.useCallback(
(e: React.ChangeEvent<HTMLInputElement>) => {
const val = e.target.value;
if (controlledValue === undefined) {
setInternalValue(val);
      }
setIsOpen(true);
setHighlightedIndex(-1);
    },
[controlledValue],
  );

const handleFocus = React.useCallback(() => {
setIsOpen(true);
  }, []);

const handleClear = React.useCallback(() => {
if (controlledValue === undefined) {
setInternalValue("");
    }
setIsOpen(false);
setHighlightedIndex(-1);
inputRef.current?.focus();
  }, [controlledValue]);

const handleSuggestionClick = React.useCallback(
(query: string) => {

if (controlledValue === undefined) {
setInternalValue(query);
      }
commit(query);
    },
[commit, controlledValue],
  );

React.useEffect(() => {
const trimmed = debouncedValue.trim();
if (trimmed.length >= SEARCH_MIN_QUERY_LENGTH && onSubmit) {
onSubmit(trimmed);
    }
    // NOTE: we intentionally do NOT close the suggestion list here.
    // The debounce fires after 250 ms of inactivity, which may not
    // coincide with user intent. The caller decides when to close.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue]);

return (
<div className={cn("relative w-full", className)}>
{/* Input row */}
<div className="relative flex items-center">
{/* Search icon */}
<Search
className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none"
aria-hidden="true"
        />

{/* Input */}
<Input
ref={inputRef}
type="search"
value={inputValue}
onChange={handleChange}
onKeyDown={handleKeyDown}
onFocus={handleFocus}
placeholder={placeholder}
aria-label="Search"
aria-autocomplete="list"
aria-controls={showSuggestions ? "search-suggestions" : undefined}
aria-expanded={showSuggestions}
aria-activedescendant={
highlightedIndex >= 0
? `search-suggestion-${highlightedIndex}`
: undefined
          }
role="combobox"
className="pl-9 pr-20"
autoComplete="off"
autoCorrect="off"
autoCapitalize="off"
spellCheck={false}
        />

{/* Clear button (visible when input is non-empty) */}
{inputValue.length > 0 && (
<Button
          type="button"
          variant="ghost"
          size="icon"
          // size="icon" renders a 36x36 hit area; h-7 w-7 forced the
          // visual+hit area to 28x28, below the WCAG 2.5.5 44x44 minimum.
          className="absolute right-3 sm:right-2 text-muted-foreground hover:text-foreground"
          onClick={handleClear}
          aria-label="Clear search"
        >
<X className="h-3.5 w-3.5" />
</Button>
        )}

{/* Keyboard hint (visible when no input, suggestions hidden) */}
{inputValue.length === 0 && (
<div className="absolute right-3 hidden sm:flex items-center gap-0.5 text-xs text-muted-foreground pointer-events-none">
<CornerDownLeft className="h-3 w-3" aria-hidden="true" />
</div>
        )}
</div>

{/* Suggestion dropdown */}
{showSuggestions && (
<ul
ref={listRef}
id="search-suggestions"
role="listbox"
aria-label="Recent searches"
className={cn(
"absolute top-full left-0 right-0 z-50 mt-1",
"bg-background border rounded-lg shadow-lg",
"max-h-72 overflow-y-auto",
"divide-y divide-border",
          )}
        >
{/* Header */}
<li className="px-3 py-1.5">
<span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
Recent searches
            </span>
</li>

{/* Suggestions */}
{visibleSuggestions.map((entry, index) => (
<li
key={`${entry.query}-${entry.timestamp}`}
id={`search-suggestion-${index}`}
role="option"
aria-selected={index === highlightedIndex}
className={cn(
"flex items-center gap-2 px-3 py-2 cursor-pointer",
"text-sm",
"hover:bg-muted/50 focus-visible:bg-muted/50",
"outline-none",
index === highlightedIndex && "bg-muted/50",
              )}
onClick={() => handleSuggestionClick(entry.query)}
onMouseEnter={() => setHighlightedIndex(index)}
            >
{/* Clock icon for history entry */}
<Clock
className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
aria-hidden="true"
              />
{/* Query text */}
<span className="flex-1 truncate">{entry.query}</span>
{/* Arrow hint on keyboard highlight */}
{index === highlightedIndex && (
<ArrowUp className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
</li>
          ))}
</ul>
      )}
</div>
  );
}
