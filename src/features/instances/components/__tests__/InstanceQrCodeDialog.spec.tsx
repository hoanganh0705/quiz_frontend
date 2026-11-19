import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";

import { InstanceQrCodeDialog } from "@/features/instances/components/InstanceQrCodeDialog";

describe("InstanceQrCodeDialog", () => {
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

  it("renders QR code, room code, and quiz title when open", () => {
    render(
      <InstanceQrCodeDialog
        open={true}
        onOpenChange={vi.fn()}
        instanceId="inst-12345"
        roomUrl="http://localhost:3000/instances/inst-12345"
        roomCode="INST1234"
        quizTitle="Ultimate Trivia Battle"
      />,
    );

    expect(screen.getByText("Scan to Join Live Battle")).toBeInTheDocument();
    expect(screen.getByText("Ultimate Trivia Battle")).toBeInTheDocument();
    expect(screen.getByText("INST1234")).toBeInTheDocument();
    expect(screen.getByTestId("instance-qr-code-svg")).toBeInTheDocument();
  });

  it("copies room code when clicking the PIN button", async () => {
    render(
      <InstanceQrCodeDialog
        open={true}
        onOpenChange={vi.fn()}
        instanceId="inst-12345"
        roomUrl="http://localhost:3000/instances/inst-12345"
        roomCode="INST1234"
      />,
    );

    const pinBtn = screen.getByTestId("copy-qr-pin-button");
    fireEvent.click(pinBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("INST1234");
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
  });

  it("copies room URL when clicking the Copy Room Link button", async () => {
    render(
      <InstanceQrCodeDialog
        open={true}
        onOpenChange={vi.fn()}
        instanceId="inst-12345"
        roomUrl="http://localhost:3000/instances/inst-12345"
        roomCode="INST1234"
      />,
    );

    const copyBtn = screen.getByTestId("qr-modal-copy-link-button");
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        "http://localhost:3000/instances/inst-12345",
      );
      expect(screen.getByText("Link Copied to Clipboard!")).toBeInTheDocument();
    });
  });
});
