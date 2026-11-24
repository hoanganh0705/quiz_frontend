"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextSkeleton } from "@/components/ui/loading-states/Skeletons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/Accordion";
import { useAsyncAction } from "@/shared/hooks";
import { getFAQs } from "@/features/support/api";
import type { FAQCategory } from "@/features/support/api";

const CATEGORY_ID_MAP: Record<string, string> = {
  all: "",
  general: "general",
  account: "account",
  billing: "billing",
  "quiz-creation": "quiz-creation",
  tournaments: "tournaments",
  privacy: "privacy",
  technical: "technical",
};

export function FAQSection({ category }: { category?: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<FAQCategory[]>([]);

  const {
    execute: loadFAQs,
    isLoading,
    error,
  } = useAsyncAction(async () => {
    return await getFAQs();
  });

  useEffect(() => {
    if (categories.length === 0 && !isLoading && !error) {
      loadFAQs().then((result) => {
        if (result) setCategories(result);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredFaqs = useMemo(() => {
    const targetCategory = CATEGORY_ID_MAP[category ?? "all"] ?? "";

    const byCategory = targetCategory
      ? categories.filter((c) => c.id === targetCategory).flatMap((c) => c.faqs)
      : categories.flatMap((c) => c.faqs);

    if (!searchQuery.trim()) return byCategory;

    const query = searchQuery.toLowerCase();
    return byCategory.filter(
      (faq) =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query),
    );
  }, [categories, category, searchQuery]);

  return (
    <div className="rounded-xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h2 className="text-2xl font-bold text-foreground">
          Frequently Asked Questions
        </h2>
        <div className="relative w-full sm:w-80">
          <label htmlFor="faq-search" className="sr-only">
            Search FAQs
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            id="faq-search"
            aria-label="Search FAQs"
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-border bg-transparent pl-10 pr-9 text-foreground placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="border border-border/80 rounded-lg p-6 space-y-3"
            >
              <TextSkeleton lines={1} />
              <TextSkeleton lines={2} />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="space-y-4 py-12 text-center" role="alert">
          <p className="text-destructive text-sm font-medium">
            Failed to load FAQs. Please try again.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              loadFAQs().then((result) => {
                if (result) setCategories(result);
              });
            }}
          >
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !error && filteredFaqs.length > 0 && (
        <Accordion type="single" collapsible className="space-y-4">
          {filteredFaqs.map((faq) => (
            <AccordionItem
              key={faq.id}
              value={faq.id}
              className="rounded-lg border border-border/80 bg-card/60 transition-all duration-200 hover:border-border data-[state=open]:border-primary/40 data-[state=open]:shadow-xs"
            >
              <AccordionTrigger className="px-6 py-4 text-left hover:no-underline group">
                <span className="text-foreground font-medium transition-colors group-hover:text-primary">
                  {faq.question}
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {!isLoading && !error && filteredFaqs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-sm">
            No FAQs found matching your search.
          </p>
        </div>
      )}
    </div>
  );
}
