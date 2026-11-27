import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DangerZone } from "../DangerZone";

describe("DangerZone", () => {
  it("renders h2 heading, export, sign out all, and delete account without dead deactivate card", () => {
    render(
      <DangerZone
        onDeleteAccount={vi.fn()}
        onExportData={vi.fn()}
        onSignOutAll={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: /Danger Zone/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Export your data/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Sign out from all sessions/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Delete your account permanently/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Deactivate Account/i)).toBeNull();
  });

  it("invokes onExportData and onDeleteAccount callbacks", () => {
    const onExportData = vi.fn();
    const onDeleteAccount = vi.fn();

    render(
      <DangerZone
        onDeleteAccount={onDeleteAccount}
        onExportData={onExportData}
        onSignOutAll={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Export your data/i }));
    expect(onExportData).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole("button", { name: /Delete your account permanently/i }),
    );
    expect(onDeleteAccount).toHaveBeenCalledTimes(1);
  });

  it("renders signOutAllError alert when provided", () => {
    render(
      <DangerZone
        onDeleteAccount={vi.fn()}
        onExportData={vi.fn()}
        onSignOutAll={vi.fn()}
        signOutAllError="Unable to revoke all sessions right now."
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /Unable to revoke all sessions right now/i,
    );
  });
});
