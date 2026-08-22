import { memo } from "react"; // rerender-memo
import { Button } from "@/components/ui/Button";
// Fix barrel imports (bundle-barrel-imports)
import { Card } from "@/components/ui/Card";
import { CardContent } from "@/components/ui/Card";
import { Trophy, Sparkles, Users2, ArrowRight } from "lucide-react";
import Link from "next/link";

// Hoist static feature card data (rendering-hoist-jsx)
const FEATURE_CARDS = [
  {
    id: "compete",
    icon: Trophy,
    iconClass: "text-brand",
    bgClass: "bg-main border border-border",
    title: "Compete & Win",
    description:
      "Join tournaments, climb the leaderboards, and earn rewards for your knowledge.",
    colSpan: "",
  },
  {
    id: "learn",
    icon: Sparkles,
    iconClass: "text-brand",
    bgClass: "bg-main border border-border",
    title: "Learn & Grow",
    description:
      "Expand your knowledge across 20+ categories with fun, interactive quizzes.",
    colSpan: "",
  },
  {
    id: "connect",
    icon: Users2,
    iconClass: "text-brand",
    bgClass: "bg-main border border-border",
    title: "Connect & Share",
    description:
      "Challenge friends, share results, and join a community of quiz enthusiasts.",
    colSpan: "sm:col-span-2 lg:col-span-1",
  },
] as const;

// Extract FeatureCard as memoized component (rerender-memo, patterns-explicit-variants)
const FeatureCard = memo(function FeatureCard({
  icon: Icon,
  iconClass,
  bgClass,
  title,
  description,
  colSpan,
}: (typeof FEATURE_CARDS)[number]) {
  return (
    <Card
      className={`bg-main border-border backdrop-blur-sm hover:bg-main-hover transition-all duration-300 group cursor-pointer ${colSpan}`}
    >
      <CardContent className="p-6 sm:p-8 text-center">
        <div
          className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full ${bgClass} mb-3 sm:mb-4`}
          aria-hidden="true"
        >
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconClass}`} />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-3 sm:mb-4">
          {title}
        </h3>
        <p className="text-foreground-secondary leading-relaxed text-sm sm:text-base">
          {description}
        </p>
      </CardContent>
    </Card>
  );
});

const TestKnowledge = memo(function TestKnowledge() {
  return (
    <section
      className="bg-card text-card-foreground border border-border rounded-xl px-4 sm:px-6 py-6 sm:py-10 w-full overflow-hidden shadow-lg mt-6 sm:mt-10"
      aria-labelledby="test-knowledge-title"
    >
      {/* Header Badge */}
      <div className="flex justify-center mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 bg-main border border-border rounded-full px-4 sm:px-6 py-2 sm:py-3 backdrop-blur-sm text-foreground">
          <Sparkles
            className="w-4 h-4 sm:w-5 sm:h-5 text-brand"
            aria-hidden="true"
          />
          <span className="text-foreground text-xs sm:text-sm font-medium">
            Discover Your Next Challenge
          </span>
        </div>
      </div>

      {/* Main Hero Section */}
      <div className="text-center mb-8 sm:mb-10">
        <h2
          id="test-knowledge-title"
          className="text-xl sm:text-2xl lg:text-4xl font-bold mb-3 sm:mb-4 text-brand leading-tight px-2"
        >
          Ready to Test Your Knowledge?
        </h2>
        <p className="text-foreground-secondary text-base sm:text-lg max-w-3xl mx-auto mb-8 sm:mb-12 leading-relaxed px-4">
          Choose from thousands of quizzes across all categories or create your
          own to challenge friends and the community.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
          <Button
            asChild
            size="lg"
            className="bg-linear-to-r from-default to-default/60 hover:from-default-hover hover:to-default-hover/60 text-white px-6 sm:px-8 py-4 sm:py-6 font-semibold rounded-xl shadow-lg hover:shadow-default-hover/25 transition-all duration-300 text-sm w-full sm:w-auto"
          >
            <Link href="/quizzes">
              Explore Quizzes
              <ArrowRight
                className="w-4 h-4 sm:w-5 sm:h-5 ml-2"
                aria-hidden="true"
              />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-border bg-background hover:bg-accent hover:text-accent-foreground px-6 sm:px-8 py-4 sm:py-6 font-semibold rounded-xl transition-all duration-300 text-sm w-full sm:w-auto"
          >
            <Link href="/create-quiz">Create Your Own Quiz</Link>
          </Button>
        </div>
      </div>

      {/* Feature Cards - Use mapped data (rendering-hoist-jsx) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-6xl mx-auto px-4">
        {FEATURE_CARDS.map((card) => (
          <FeatureCard key={card.id} {...card} />
        ))}
      </div>
    </section>
  );
});

export default TestKnowledge;
