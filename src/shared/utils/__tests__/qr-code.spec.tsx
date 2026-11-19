import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";

import {
  createQrMatrix,
  qrMatrixToSvgPath,
  QrCodeSvg,
} from "@/shared/utils/qr-code";

describe("qr-code utility", () => {
  it("creates a valid QR matrix for a short URL", () => {
    const res = createQrMatrix("http://localhost:3000/instances/inst-1");
    expect(res.size).toBeGreaterThanOrEqual(21);
    expect(res.modules.length).toBe(res.size);
    expect(res.modules[0]!.length).toBe(res.size);
  });

  it("creates valid QR matrix for a long URL with UUID", () => {
    const longUrl =
      "https://quizhub.example.com/instances/12345678-abcd-ef01-2345-6789abcdef01";
    const res = createQrMatrix(longUrl);
    expect(res.size).toBeGreaterThan(21);
  });

  it("converts QR matrix to an SVG path string", () => {
    const matrix = [
      [true, false],
      [false, true],
    ];
    const path = qrMatrixToSvgPath(matrix);
    expect(path).toContain("M0,0h1v1h-1z");
    expect(path).toContain("M1,1h1v1h-1z");
    expect(path).not.toContain("M0,1");
  });

  it("renders QrCodeSvg element with accessible role and label", () => {
    render(<QrCodeSvg value="https://example.com/test" size={200} />);
    const svg = screen.getByRole("img", {
      name: /qr code for https:\/\/example\.com\/test/i,
    });
    expect(svg).toBeInTheDocument();
    expect(svg.getAttribute("width")).toBe("200");
    expect(svg.getAttribute("height")).toBe("200");
  });
});
