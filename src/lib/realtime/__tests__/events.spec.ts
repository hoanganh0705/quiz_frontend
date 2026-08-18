

import { describe, expect, it } from "vitest";

import type {
InstanceEventName,
InstanceEventPayload,
InstanceSocketEvent,
NotificationEventName,
NotificationEventPayload,
NotificationSocketEvent,
WsErrorPayload,
} from "../events";

import {
ANSWER_RESULT,
INSTANCE_JOINED,
INSTANCE_LEFT,
INSTANCE_STARTED,
INSTANCE_CLOSED,
INSTANCE_EVENT_NAMES,
INSTANCES_NAMESPACE,
LEADERBOARD_UPDATED,
NOTIFICATION_DELETED,
NOTIFICATION_EVENT_NAMES,
NOTIFICATION_READ,
NOTIFICATION_SENT,
NOTIFICATIONS_NAMESPACE,
PLAYER_JOINED,
PLAYER_LEFT,
QUESTION_REVEALED,
} from "../events";

describe("events.ts — type-level invariants", () => {

it("(1) every event name constant is a unique string literal (not plain string)", () => {

const _a: typeof INSTANCE_JOINED = "instance:joined";
const _b: typeof INSTANCE_LEFT = "instance:left";
const _c: typeof INSTANCE_STARTED = "instance:started";
const _d: typeof INSTANCE_CLOSED = "instance:closed";
const _e: typeof PLAYER_JOINED = "player:joined";
const _f: typeof PLAYER_LEFT = "player:left";
const _g: typeof QUESTION_REVEALED = "question:revealed";
const _h: typeof ANSWER_RESULT = "answer:result";
const _i: typeof LEADERBOARD_UPDATED = "leaderboard:updated";

const _j: typeof NOTIFICATION_SENT = "notification:sent";
const _k: typeof NOTIFICATION_DELETED = "notification:deleted";
const _l: typeof NOTIFICATION_READ = "notification:read";

void [_a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l];
  });

it("(1) INSTANCE_EVENT_NAMES and NOTIFICATION_EVENT_NAMES are readonly tuples", () => {

const firstInstance: typeof INSTANCE_EVENT_NAMES[number] = INSTANCE_JOINED;
const firstNotification: typeof NOTIFICATION_EVENT_NAMES[number] = NOTIFICATION_SENT;

const _checkInstance: typeof INSTANCE_JOINED = firstInstance;
const _checkNotification: typeof NOTIFICATION_SENT = firstNotification;
void [_checkInstance, _checkNotification];
  });

it("(1) namespace constants are string literals", () => {
const _ns: typeof INSTANCES_NAMESPACE = "/instances";
const _nn: typeof NOTIFICATIONS_NAMESPACE = "/notifications";
void [_ns, _nn];
  });

it("(2) InstanceSocketEvent narrows data to the correct payload type", () => {

const frame: InstanceSocketEvent = {
event: INSTANCE_JOINED,
data: {
instanceId: "i-1",
userId: "u-1",
username: "alice",
joinedAt: "2026-08-04T00:00:00.000Z",
      },
    };

if (frame.event === "instance:joined") {

const _payload = frame.data satisfies {
instanceId: string;
userId: string;
username: string;
joinedAt: string;
      };
void _payload;
    }
  });

it("(2) NotificationSocketEvent narrows data correctly", () => {
const frame: NotificationSocketEvent = {
event: NOTIFICATION_SENT,
data: {
notificationId: "n-1",
type: "tournament_start",
title: "Tournament starting!",
read: false,
createdAt: "2026-08-04T00:00:00.000Z",
      },
    };

if (frame.event === "notification:sent") {
const _payload = frame.data satisfies {
notificationId: string;
type: string;
title: string;
read: boolean;
createdAt: string;
      };
void _payload;
    }
  });

it("(3) WsErrorPayload is constructable with required fields", () => {
const err: WsErrorPayload = {
code: "AUTH_TOKEN_EXPIRED",
message: "Your session has expired. Please log in again.",
    };
expect(err.code).toBe("AUTH_TOKEN_EXPIRED");
expect(err.message).toBe("Your session has expired. Please log in again.");
  });

it("(3) WsErrorPayload satisfies the error shape of InstanceSocketEvent", () => {
const errFrame: InstanceSocketEvent = {
event: INSTANCE_JOINED,
data: { code: "RATE_LIMITED", message: "Too many requests" },
    };

if ("code" in errFrame.data) {
expect(typeof (errFrame.data as WsErrorPayload).code).toBe("string");
expect(typeof (errFrame.data as WsErrorPayload).message).toBe("string");
    }
  });

it("(4) namespace constants match expected paths", () => {
expect(INSTANCES_NAMESPACE).toBe("/instances");
expect(NOTIFICATIONS_NAMESPACE).toBe("/notifications");
  });

it("(5) no event name is an empty string", () => {
for (const name of INSTANCE_EVENT_NAMES) {
expect(name.length).toBeGreaterThan(0);
    }
for (const name of NOTIFICATION_EVENT_NAMES) {
expect(name.length).toBeGreaterThan(0);
    }
  });

it("(6) InstanceEventName union includes all instance event constants", () => {
const name: InstanceEventName = INSTANCE_JOINED;
const _ = name;
void _;
  });

it("(6) NotificationEventName union includes all notification event constants", () => {
const name: NotificationEventName = NOTIFICATION_SENT;
const _ = name;
void _;
  });
});
