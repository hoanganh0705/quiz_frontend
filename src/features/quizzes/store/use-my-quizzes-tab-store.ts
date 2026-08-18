

import { create } from "zustand";

import type { MyQuizzesTab } from "@/features/quizzes/types/my-quizzes";

type MyQuizzesTabState = {
activeTab: MyQuizzesTab;
};

export const useMyQuizzesTabStore = create<MyQuizzesTabState>()(
() => ({ activeTab: "all" }),
);

export function setMyQuizzesTab(tab: MyQuizzesTab): void {
useMyQuizzesTabStore.setState({ activeTab: tab }, true);
}

export const useMyQuizzesActiveTab = () =>
useMyQuizzesTabStore((state) => state.activeTab);
