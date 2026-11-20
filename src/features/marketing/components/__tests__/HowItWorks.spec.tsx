/**
 * Unit tests for `HowItWorks`.
 *
 * Asserts:
 *   - All 3 steps render title and description.
 *   - No `<img>` elements are rendered.
 *   - No `next/image` div wrappers exist.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import HowItWorks from "../HowItWorks";

describe("HowItWorks", () => {
  it("renders all three step cards with title and description", () => {
    render(<HowItWorks />);
    expect(screen.getByText("Browse Categories")).toBeInTheDocument();
    expect(screen.getByText(/explore our diverse range/i)).toBeInTheDocument();
    expect(screen.getByText("Take Quizzes")).toBeInTheDocument();
    expect(
      screen.getByText(/challenge yourself with many quizzes/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Earn Rewards")).toBeInTheDocument();
    expect(screen.getByText(/collect points, badges/i)).toBeInTheDocument();
  });

  it("does not render any <img> elements", () => {
    render(<HowItWorks />);
    const imgs = document.querySelectorAll("img");
    expect(imgs).toHaveLength(0);
  });

  it("renders the section heading and community tagline", () => {
    render(<HowItWorks />);
    expect(screen.getByText("How It Works")).toBeInTheDocument();
    expect(screen.getByText(/community of quiz creators/i)).toBeInTheDocument();
  });

  it("renders three card wrappers", () => {
    render(<HowItWorks />);
    const cards = screen.getAllByTestId("how-it-works-card");
    expect(cards).toHaveLength(3);
  });
});
