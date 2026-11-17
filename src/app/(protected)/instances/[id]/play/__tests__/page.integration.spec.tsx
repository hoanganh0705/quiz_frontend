import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import InstanceGameRoute, { metadata } from "../page";

describe("/instances/[id]/play route", () => {
  it("exports metadata", () => {
    expect(metadata.title).toBe("Quiz Game | QuizHub");
  });

  it("renders the InstanceGamePage component inside main", async () => {
    const page = await InstanceGameRoute({
      params: Promise.resolve({ id: "01a1e4ac-2d0a-72be-8222-70efc68173ce" }),
    });
    render(page);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
