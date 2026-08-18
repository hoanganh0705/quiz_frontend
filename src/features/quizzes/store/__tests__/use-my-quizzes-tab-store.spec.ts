

import { afterEach, describe, expect, it } from "vitest";

import {
setMyQuizzesTab,
useMyQuizzesTabStore,
} from "@/features/quizzes/store/use-my-quizzes-tab-store";

afterEach(() => {

useMyQuizzesTabStore.setState({ activeTab: "all" });
});

describe("MyQuizzesTabStore — initial state", () => {
it('defaults to "all"', () => {
expect(useMyQuizzesTabStore.getState().activeTab).toBe("all");
  });
});

describe("MyQuizzesTabStore — setMyQuizzesTab", () => {
it('setMyQuizzesTab("drafts") updates to "drafts"', () => {
setMyQuizzesTab("drafts");
expect(useMyQuizzesTabStore.getState().activeTab).toBe("drafts");
  });

it('setMyQuizzesTab("published") updates to "published"', () => {
setMyQuizzesTab("published");
expect(useMyQuizzesTabStore.getState().activeTab).toBe("published");
  });

it('setMyQuizzesTab("analytics") updates to "analytics"', () => {
setMyQuizzesTab("analytics");
expect(useMyQuizzesTabStore.getState().activeTab).toBe("analytics");
  });

it('setMyQuizzesTab("all") resets back to "all"', () => {
setMyQuizzesTab("analytics");
setMyQuizzesTab("all");
expect(useMyQuizzesTabStore.getState().activeTab).toBe("all");
  });
});

describe("MyQuizzesTabStore — getState()", () => {
it("getState() returns a stable snapshot with activeTab", () => {
setMyQuizzesTab("published");
const snapshot = useMyQuizzesTabStore.getState();
expect(snapshot.activeTab).toBe("published");
expect(typeof snapshot.activeTab).toBe("string");
  });
});
