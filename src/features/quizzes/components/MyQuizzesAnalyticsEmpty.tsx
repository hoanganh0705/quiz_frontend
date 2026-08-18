

import { BarChart3 } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

export function MyQuizzesAnalyticsEmpty(): React.ReactElement {
return (
<EmptyState
icon={BarChart3}
title="Analytics will populate after you publish a quiz."
description="Once players start taking your quizzes, you'll see stats here."
    />
  );
}
