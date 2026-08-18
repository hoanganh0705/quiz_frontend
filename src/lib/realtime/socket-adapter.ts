

import { io, type Socket } from "socket.io-client";

const WS_URL =
process.env.NEXT_PUBLIC_WS_URL ??
(typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "");

export type { Socket };

function createNoopSocket(): Socket {
return {
on: () => createNoopSocket(),
off: () => {},
emit: () => {},
disconnect: () => {},
connect: () => createNoopSocket(),
connected: false,
  } as unknown as Socket;
}

export function createSocket(
url: string,
options?: { auth?: Record<string, unknown>; transports?: string[] },
): Socket {
try {

const fullUrl = url.startsWith("/")
? `${WS_URL}${url}`
: url;

return io(fullUrl, options as Parameters<typeof io>[1]);
  } catch {
return createNoopSocket();
  }
}
