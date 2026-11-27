import { buildMetadata } from "@/shared/lib/seo";

import { SupportCenter } from "@/features/support";

export const metadata = buildMetadata({
  title: "Support Center | QuizHub",
  description: "Find help articles and support resources for QuizHub.",
  path: "/support",
});

export default function Support() {
  return (
    <div className="min-h-screen bg-transparent">
      <SupportCenter />
    </div>
  );
}
