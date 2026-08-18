import { describe, expect, it } from "vitest";
import {
projectWithId,
type ProjectWithId,
} from "../project-with-id";

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

describe("projectWithId(items, alias) — runtime mirror", () => {
interface QuizDto {
quizId: string;
title: string;
  }

it("projects each item's alias onto `id`", () => {
const items: QuizDto[] = [
{ quizId: "q1", title: "first" },
{ quizId: "q2", title: "second" },
    ];
const projected = projectWithId(items, "quizId");
expect(projected).toEqual([
{ quizId: "q1", title: "first", id: "q1" },
{ quizId: "q2", title: "second", id: "q2" },
    ]);
  });

it("preserves the original alias field", () => {
const items: QuizDto[] = [{ quizId: "q1", title: "first" }];
const projected = projectWithId(items, "quizId");
expect(projected[0]?.quizId).toBe("q1");
expect(projected[0]?.id).toBe("q1");
  });

it("returns a new array — inputs are immutable", () => {
const items: QuizDto[] = [{ quizId: "q1", title: "first" }];
const projected = projectWithId(items, "quizId");
expect(projected).not.toBe(items);
expect(projected[0]).not.toBe(items[0]);
expect(items[0]).toEqual({ quizId: "q1", title: "first" });
  });

it("returns an empty array when given an empty array", () => {
const projected = projectWithId([] as QuizDto[], "quizId");
expect(projected).toEqual([]);
  });

it("works with appendUniqueById-style dedup", () => {
const items: QuizDto[] = [
{ quizId: "q1", title: "first" },
{ quizId: "q1", title: "first (dup)" },
{ quizId: "q2", title: "second" },
    ];
const projected = projectWithId(items, "quizId");
const seen = new Set(projected.map((p) => p.id));
expect(seen.size).toBe(2);
  });
});