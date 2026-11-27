import { useCallback } from "react";

import { BarChart3, CheckCircle2, FileEdit, Layers } from "lucide-react";

import { setMyQuizzesTab, useMyQuizzesActiveTab } from "@/features/quizzes/store";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";

import type { MyQuizzesTab } from "@/features/quizzes/types/my-quizzes";

interface MyQuizzesTabsProps {
  children: (tab: "all" | "drafts" | "published") => React.ReactNode;

  analyticsContent: React.ReactNode;
}

const TABS: Array<{
  value: MyQuizzesTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "all", label: "All", icon: Layers },
  { value: "drafts", label: "Drafts", icon: FileEdit },
  { value: "published", label: "Published", icon: CheckCircle2 },
  { value: "analytics", label: "Analytics", icon: BarChart3 },
] as const;

export function MyQuizzesTabs({
  children,
  analyticsContent,
}: MyQuizzesTabsProps): React.ReactElement {
  const activeTab = useMyQuizzesActiveTab();

  const handleTabChange = useCallback((tab: MyQuizzesTab) => {
    setMyQuizzesTab(tab);
  }, []);

  const isAnalyticsTab = activeTab === "analytics";

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => handleTabChange(value as MyQuizzesTab)}
    >
      <TabsList className="mb-6 inline-flex w-full justify-start gap-1 rounded-lg border border-border/40 bg-muted/60 p-1 sm:w-auto sm:justify-center">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="gap-2 px-3.5 py-1.5 text-xs font-medium sm:text-sm"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <span>{tab.label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {/* List tabs */}
      {(["all", "drafts", "published"] as const).map((tab) => (
        <TabsContent
          key={tab}
          value={tab}
          className={isAnalyticsTab ? "hidden" : undefined}
        >
          {children(tab)}
        </TabsContent>
      ))}

      {/* Analytics tab */}
      <TabsContent
        value="analytics"
        className={isAnalyticsTab ? undefined : "hidden"}
      >
        {analyticsContent}
      </TabsContent>
    </Tabs>
  );
}
