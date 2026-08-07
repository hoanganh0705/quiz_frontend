import { describe, expect, it } from "vitest";
import type { ProjectWithId } from "../project-with-id";

describe("ProjectWithId<T, Alias>", () => {
  it("aliases a non-id field as id for use with appendUniqueById", () => {
    type UserDto = { userId: string; username: string };
    type Projected = ProjectWithId<UserDto, "userId">;
    const arr: Projected[] = [
      { id: "a", userId: "a", username: "alice" },
      { id: "b", userId: "b", username: "bob" },
    ];
    const seen = new Set(arr.map((item) => item.id));
    expect(seen.size).toBe(2);
  });

  it("is a no-op when the type already has an id field", () => {
    type Item = { id: string; name: string };
    type Projected = ProjectWithId<Item>;
    const a: Projected = { id: "x", name: "X" };
    expect(a.id).toBe("x");
  });
});