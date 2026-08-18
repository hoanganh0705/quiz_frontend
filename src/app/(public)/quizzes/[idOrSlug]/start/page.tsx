import { redirect } from 'next/navigation';

export default async function QuizStartRedirectPage({
params,
}: {
params: Promise<{ idOrSlug: string }>;
}) {
const { idOrSlug } = await params;
redirect(`/quizzes/${encodeURIComponent(idOrSlug)}/attempt`);
}