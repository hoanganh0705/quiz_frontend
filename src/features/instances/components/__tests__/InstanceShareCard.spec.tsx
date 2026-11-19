import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";

import { InstanceShareCard } from "@/features/instances/components/InstanceShareCard";

describe("InstanceShareCard", () => {
  const writeTextMock = vi.fn();

  beforeEach(() => {
    writeTextMock.mockReset().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders share card with room link, copy button, and room code", () => {
    render(
      <InstanceShareCard instanceId="inst-12345678" quizTitle="Science Quiz" />,
    );

    expect(screen.getByTestId("instance-share-card")).toBeInTheDocument();
    expect(screen.getByText("Invite Players & Share Room")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(/instances\/inst-12345678/),
    ).toBeInTheDocument();
    expect(screen.getByTestId("copy-room-link-button")).toBeInTheDocument();
    expect(screen.getByTestId("copy-room-pin-button")).toBeInTheDocument();
    expect(screen.getByTestId("show-qr-modal-button")).toBeInTheDocument();
  });

  it("copies room link to clipboard when clicking Copy Link", async () => {
    render(<InstanceShareCard instanceId="inst-12345678" />);

    const copyBtn = screen.getByTestId("copy-room-link-button");
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        expect.stringContaining("/instances/inst-12345678"),
      );
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
  });

  it("copies room PIN when clicking room code badge", async () => {
    render(<InstanceShareCard instanceId="abcdefgh-1234" />);

    const pinBtn = screen.getByTestId("copy-room-pin-button");
    expect(pinBtn).toHaveTextContent("ABCDEFGH");

    fireEvent.click(pinBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("ABCDEFGH");
    });
  });

  it("opens QR code dialog when clicking the QR Code button", async () => {
    render(
      <InstanceShareCard instanceId="inst-12345678" quizTitle="Science Quiz" />,
    );

    const qrBtn = screen.getByTestId("show-qr-modal-button");
    fireEvent.click(qrBtn);

    await waitFor(() => {
      expect(screen.getByTestId("instance-qr-code-dialog")).toBeInTheDocument();
      expect(screen.getByText("Scan to Join Live Battle")).toBeInTheDocument();
    });
  });
});
