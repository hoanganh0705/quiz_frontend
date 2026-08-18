

const isDev =
typeof process !== "undefined" &&
process.env &&
process.env.NODE_ENV !== "production";

function debugEnabled(): boolean {
if (typeof window === "undefined") return isDev;
try {
return window.localStorage.getItem("quiz:log:debug") === "1";
  } catch {
return isDev;
  }
}

function format(category: string, message: string): string {
return `[${category}] ${message}`;
}

export interface Logger {
readonly info: (category: string, message: string, ...args: unknown[]) => void;
readonly warn: (category: string, message: string, ...args: unknown[]) => void;
readonly error: (category: string, message: string, ...args: unknown[]) => void;
readonly debug: (category: string, message: string, ...args: unknown[]) => void;
}

export const logger: Logger = Object.freeze({
info(category: string, message: string, ...args: unknown[]): void {
console.info(format(category, message), ...args);
  },
warn(category: string, message: string, ...args: unknown[]): void {
console.warn(format(category, message), ...args);
  },
error(category: string, message: string, ...args: unknown[]): void {
console.error(format(category, message), ...args);
  },
debug(category: string, message: string, ...args: unknown[]): void {
if (!debugEnabled()) return;
console.debug(format(category, message), ...args);
  },
});

export default logger;