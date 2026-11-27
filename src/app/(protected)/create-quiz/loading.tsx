import { CreateQuizFormSkeleton } from "@/features/quizzes/components/CreateQuizFormSkeleton";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";

export default function CreateQuizLoading() {
  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <CreateQuizFormSkeleton />
    </div>
  );
}
