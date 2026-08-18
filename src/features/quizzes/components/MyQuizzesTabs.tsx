

import { useCallback } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";

import { useMyQuizzesActiveTab, setMyQuizzesTab } from "@/features/quizzes/store";

import type { MyQuizzesTab } from "@/features/quizzes/types/my-quizzes";

interface MyQuizzesTabsProps {

children: (tab: "all" | "drafts" | "published") => React.ReactNode;

analyticsContent: React.ReactNode;
}

const TABS: Array<{ value: MyQuizzesTab; label: string }> = [
{ value: "all", label: "All" },
{ value: "drafts", label: "Drafts" },
{ value: "published", label: "Published" },
{ value: "analytics", label: "Analytics" },
] as const;

function emitTabSwitchBreadcrumb(tab: MyQuizzesTab): void {
try {
const sentry = (typeof window === "undefined"
? null
: (window as unknown as { Sentry?: { addBreadcrumb?: (crumb: { category: string; data: Record<string, unknown> }) => void } }).Sentry);
sentry?.addBreadcrumb?.({
category: "phase4:4.4",
data: { tab, timestamp: Date.now() },
    });
  } catch {
    // Sentry is optional — swallow errors so the tab switch never fails.
  }
}

export function MyQuizzesTabs({
children,
analyticsContent,
}: MyQuizzesTabsProps): React.ReactElement {
const activeTab = useMyQuizzesActiveTab();

const handleTabChange = useCallback(
(tab: MyQuizzesTab) => {
setMyQuizzesTab(tab);
emitTabSwitchBreadcrumb(tab);
    },
[],
  );

const isAnalyticsTab = activeTab === "analytics";

return (
<Tabs
value={activeTab}
onValueChange={(value) => handleTabChange(value as MyQuizzesTab)}
    >
<TabsList className="mb-6 w-full justify-start gap-1">
{TABS.map((tab) => (
<TabsTrigger key={tab.value} value={tab.value}>
{tab.label}
</TabsTrigger>
        ))}
</TabsList>

{/* List tabs */}
{["all", "drafts", "published"].map((tab) => (
<TabsContent
key={tab}
value={tab}
className={isAnalyticsTab ? "hidden" : undefined}
        >
{children(tab as "all" | "drafts" | "published")}
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
