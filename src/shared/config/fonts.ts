import { JetBrains_Mono, Outfit } from "next/font/google";

/**
 * Display + UI sans. Distinct from Inter (the universal AI-tell face):
 * geometric, slightly rounded, optimized for screens. 400/500/600/700 cover
 * the Tailwind ramp so `font-bold` (700) and `font-medium` (500) resolve to
 * real glyphs instead of synthesized fakes.
 */
export const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-app-sans",
});

/**
 * Mono for error IDs, audit log payloads, code-style spans.
 */
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-app-mono",
});
