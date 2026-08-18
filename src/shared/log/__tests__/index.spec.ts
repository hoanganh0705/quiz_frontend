import { describe, expect, it, vi } from "vitest";
import { logger } from "../index";

describe("logger", () => {
it("forwards info() to console.info with a formatted category prefix", () => {
const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
try {
logger.info("auth.logout", "session expired", { userId: "u1" });
expect(infoSpy).toHaveBeenCalledWith(
"[auth.logout] session expired",
{ userId: "u1" },
      );
    } finally {
infoSpy.mockRestore();
    }
  });

it("forwards warn() to console.warn with a formatted category prefix", () => {
const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
try {
logger.warn("realtime", "socket reconnect failed", 3);
expect(warnSpy).toHaveBeenCalledWith(
"[realtime] socket reconnect failed",
3,
      );
    } finally {
warnSpy.mockRestore();
    }
  });

it("forwards error() to console.error with a formatted category prefix", () => {
const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
try {
logger.error("auth.deletion", "cleanup step failed");
expect(errorSpy).toHaveBeenCalledWith(
"[auth.deletion] cleanup step failed",
      );
    } finally {
errorSpy.mockRestore();
    }
  });
});