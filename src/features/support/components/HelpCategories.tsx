"use client";

import {
  HelpCircle,
  User,
  CreditCard,
  PlusCircle,
  Trophy,
  Shield,
  Settings,
} from "lucide-react";

const categories = [
  { id: "all", label: "All Categories", icon: HelpCircle },
  { id: "account", label: "Account", icon: User },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "quiz-creation", label: "Quiz Creation", icon: PlusCircle },
  { id: "tournaments", label: "Tournaments", icon: Trophy },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "technical", label: "Technical Issues", icon: Settings },
  { id: "general", label: "General", icon: HelpCircle },
];

interface HelpCategoriesProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export function HelpCategories({
  activeCategory,
  onCategoryChange,
}: HelpCategoriesProps) {
  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs sm:p-5">
      <h3 className="mb-3 text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground lg:mb-4">
        Help Categories
      </h3>
      <nav
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-none lg:flex-col lg:space-y-1.5 lg:overflow-visible lg:pb-0"
        role="navigation"
        aria-label="Help categories"
      >
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              aria-pressed={isActive}
              className={`inline-flex shrink-0 items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-150 cursor-pointer text-sm whitespace-nowrap active:scale-95 lg:active:scale-100 lg:hover:translate-x-0.5 lg:w-full lg:gap-3 lg:px-3.5 lg:py-2.5 ${
                isActive
                  ? "bg-primary text-primary-foreground font-medium shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{category.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
