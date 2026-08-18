

import { MyQuizzesSkeleton } from "@/features/quizzes/components/MyQuizzesSkeleton";

export default function Loading(): React.ReactElement {
return (
<div className="p-6">
<MyQuizzesSkeleton />
</div>
  );
}
