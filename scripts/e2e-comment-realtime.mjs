#!/usr/bin/env node
/**
 * Manual end-to-end smoke test for the Quiz Comment realtime system.
 *
 * Connects two Socket.IO clients to the running backend, performs REST
 * mutations, and asserts that the second client receives the expected
 * realtime events with the new snapshot-bearing payloads.
 *
 * Usage: node scripts/e2e-comment-realtime.mjs
 *
 * Requires the backend dev server running on http://localhost:8080.
 */

import { io as ioClient } from "socket.io-client";

const BASE_URL = process.env.BACKEND_URL ?? "http://localhost:8080";
const NAMESPACE = "/comments";

function tag(label) {
  return (msg) => `[${label}] ${msg}`;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} ${response.statusText} on ${url}: ${text}`,
    );
  }
  if (!text) return null;
  return JSON.parse(text);
}

async function fetchJsonMaybe(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await response.text();
  if (!response.ok) {
    return { ok: false, status: response.status, text };
  }
  return { ok: true, body: JSON.parse(text) };
}

function makeSocket(accessToken, label) {
  const log = tag(label);
  const socket = ioClient(`${BASE_URL}${NAMESPACE}`, {
    transports: ["websocket"],
    auth: { token: accessToken },
    reconnection: false,
    extraHeaders: { Authorization: `Bearer ${accessToken}` },
  });
  socket.on("connect", () => log(`connected (sid=${socket.id})`));
  socket.on("connect_error", (err) => log(`connect_error: ${err.message}`));
  socket.on("disconnect", (reason) => log(`disconnect: ${reason}`));
  return socket;
}

function nextEvent(socket, predicate, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const onAny = (payload) => {
      if (predicate(payload)) {
        clearTimeout(timer);
        socket.off("comment", onAny);
        resolve(payload);
      }
    };
    socket.on("comment", onAny);
    const timer = setTimeout(() => {
      socket.off("comment", onAny);
      reject(new Error(`Timed out waiting for event after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

async function subscribe(socket, quizId) {
  // The gateway returns `{ event: 'subscribed', type: 'quiz', quizId }`
  // synchronously, but the ack callback arg carries that value. We just
  // fire-and-forget with a short wait so the room join is confirmed.
  await new Promise((resolve) => {
    const ok = () => resolve();
    socket.once("subscribed", ok);
    socket.once("subscribed_quiz", ok);
    socket.once("comment", () => {
      // ignore any pre-existing events; we just want to ensure the room is joined
    });
    socket.timeout(2000).emit("subscribe_quiz", { quizId }, (err) => {
      if (err) {
        // no ack — ack-style may not be wired. The room join is still
        // effective because the server-side handler ran synchronously.
      }
      resolve();
    });
  });
  // Belt-and-braces: wait a moment so the server-side room join is observable.
  await wait(150);
}

async function login(email, password) {
  const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(`login failed for ${email}: ${response.status}`);
  }
  const json = await response.json();
  return {
    token: json.data.accessToken,
    userId: json.data.userId,
    username: json.data.username,
  };
}

async function findQuizSlug(token, slug) {
  const response = await fetchJsonMaybe(
    `${BASE_URL}/api/v1/quizzes/${encodeURIComponent(slug)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) return null;
  return response.body?.data;
}

const results = [];
function record(name, passed, detail) {
  results.push({ name, passed, detail });
  const prefix = passed ? "PASS" : "FAIL";
  console.log(`${prefix}  ${name}${detail ? `  — ${detail}` : ""}`);
}

async function main() {
  console.log(`\n=== Quiz Comment Realtime E2E ===`);
  console.log(`Backend: ${BASE_URL}  Namespace: ${NAMESPACE}\n`);

  // ─── Login as two E2E users ─────────────────────────────────────────────────
  let alice, bob;
  try {
    alice = await login("e2euser1@quiz.local", "TestPass123");
    bob = await login("e2euser2@quiz.local", "TestPass456");
  } catch (err) {
    console.error(`Login failed: ${err.message}`);
    console.error("Make sure the backend is running and E2E users exist.");
    process.exit(1);
  }
  console.log(`alice = ${alice.username} (${alice.userId})`);
  console.log(`bob   = ${bob.username} (${bob.userId})\n`);

  // Find a seeded quiz
  const quiz = await findQuizSlug(alice.token, "javascript-fundamentals");
  if (!quiz) {
    console.error("Quiz javascript-fundamentals not found. Run seeds first.");
    process.exit(1);
  }
  const quizId = quiz.id ?? quiz.quizId;
  console.log(`Quiz: javascript-fundamentals (${quizId})\n`);

  // ─── Scenario 1: Two clients, one creates a comment, other receives it ──────
  let sockA, sockB;
  let createdId, replyId;
  try {
    sockA = makeSocket(alice.token, "alice");
    sockB = makeSocket(bob.token, "bob");
    console.log("Waiting for connects...");
    await Promise.all([
      new Promise((r, j) => {
        sockA.on("connect", r);
        sockA.on("connect_error", (e) => {
          console.log("alice connect_error:", e.message);
        });
      }),
      new Promise((r, j) => {
        sockB.on("connect", r);
        sockB.on("connect_error", (e) => {
          console.log("bob connect_error:", e.message);
        });
      }),
    ]);
    console.log("Both connected. Subscribing...");
    await subscribe(sockA, quizId);
    await subscribe(sockB, quizId);
    console.log("Both subscribed to quiz room\n");

    const eventPromise = nextEvent(
      sockB,
      (p) => p.eventType === "comment_created" && p.quizId === quizId,
    );
    const body = `E2E alice ${Date.now()}`;
    const created = await fetchJson(
      `${BASE_URL}/api/v1/quizzes/${quizId}/comments`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${alice.token}` },
        body: JSON.stringify({ body }),
      },
    );
    createdId = created.data?.id ?? created.data?.commentId;
    const evt = await eventPromise;
    record(
      "S1: comment.created broadcast",
      evt.eventType === "comment_created" && evt.commentId === createdId,
      `received commentId=${evt.commentId} snapshotId=${evt.snapshot?.id}`,
    );
    record(
      "S1: payload carries snapshot",
      !!evt.snapshot && evt.snapshot.body === body,
      `snapshot.body=${evt.snapshot?.body}`,
    );

    // ─── Scenario 2: Reply ──────────────────────────────────────────────────
    const replyPromise = nextEvent(
      sockB,
      (p) =>
        p.eventType === "comment_created" &&
        p.quizId === quizId &&
        p.parentCommentId === createdId,
    );
    const replyBody = `E2E bob reply ${Date.now()}`;
    const replyRes = await fetchJson(
      `${BASE_URL}/api/v1/quizzes/${quizId}/comments`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${bob.token}` },
        body: JSON.stringify({ body: replyBody, parentCommentId: createdId }),
      },
    );
    replyId = replyRes.data?.id ?? replyRes.data?.commentId;
    const replyEvt = await replyPromise;
    record(
      "S2: reply event broadcast",
      replyEvt.eventType === "comment_created" &&
        replyEvt.parentCommentId === createdId &&
        replyEvt.commentId === replyId,
      `parentCommentId=${replyEvt.parentCommentId}`,
    );
    record(
      "S2: reply snapshot carries reply body",
      replyEvt.snapshot?.body === replyBody,
      `replySnapshot.body=${replyEvt.snapshot?.body}`,
    );

    // ─── Scenario 3: Edit ───────────────────────────────────────────────────
    const editPromise = nextEvent(
      sockB,
      (p) => p.eventType === "comment_edited" && p.commentId === replyId,
    );
    const editedBody = `E2E bob edited ${Date.now()}`;
    await fetchJson(`${BASE_URL}/api/v1/comments/${replyId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${bob.token}` },
      body: JSON.stringify({ body: editedBody }),
    });
    const editEvt = await editPromise;
    record(
      "S3: comment.edited broadcast",
      editEvt.eventType === "comment_edited" &&
        editEvt.snapshot?.body === editedBody,
      `snapshot.body=${editEvt.snapshot?.body}`,
    );

    // ─── Scenario 4: Delete ─────────────────────────────────────────────────
    const deletePromise = nextEvent(
      sockA,
      (p) => p.eventType === "comment_deleted" && p.commentId === replyId,
    );
    await fetchJson(`${BASE_URL}/api/v1/comments/${replyId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${bob.token}` },
    });
    const delEvt = await deletePromise;
    record(
      "S4: comment.deleted broadcast",
      delEvt.eventType === "comment_deleted" &&
        delEvt.parentCommentId === createdId,
      `parentCommentId=${delEvt.parentCommentId}`,
    );

    // ─── Scenario 5: Vote ───────────────────────────────────────────────────
    const votePromise = nextEvent(
      sockA,
      (p) => p.eventType === "vote_cast" && p.commentId === createdId,
    );
    await fetchJson(
      `${BASE_URL}/api/v1/comments/${createdId}/vote`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${bob.token}` },
        body: JSON.stringify({ value: "upvote" }),
      },
    );
    const voteEvt = await votePromise;
    record(
      "S5: vote_cast broadcast with counts",
      voteEvt.eventType === "vote_cast" &&
        typeof voteEvt.votesCount === "number" &&
        voteEvt.votesCount >= 1,
      `votesCount=${voteEvt.votesCount} up=${voteEvt.upvotesCount} down=${voteEvt.downvotesCount}`,
    );

    // ─── Scenario 5b: Vote remove ───────────────────────────────────────────
    const unvotePromise = nextEvent(
      sockA,
      (p) => p.eventType === "vote_removed" && p.commentId === createdId,
    );
    await fetchJson(
      `${BASE_URL}/api/v1/comments/${createdId}/vote`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${bob.token}` },
      },
    );
    const unvoteEvt = await unvotePromise;
    record(
      "S5b: vote_removed broadcast with counts",
      unvoteEvt.eventType === "vote_removed" &&
        typeof unvoteEvt.votesCount === "number",
      `votesCount=${unvoteEvt.votesCount}`,
    );

    // ─── Scenario 7: Cross-quiz isolation ──────────────────────────────────
    const otherQuiz = await findQuizSlug(alice.token, "react-hooks-deep-dive");
    if (otherQuiz) {
      const otherQuizId = otherQuiz.id ?? otherQuiz.quizId;
      const sockC = makeSocket(bob.token, "bob-cross");
      await new Promise((r, j) => {
        sockC.once("connect", r);
        sockC.once("connect_error", j);
      });
      await subscribe(sockC, otherQuizId);

      let leaked = false;
      const guard = new Promise((resolve) => {
        const t = setTimeout(resolve, 1000);
        sockC.on("comment", (p) => {
          if (p.quizId === quizId) {
            leaked = true;
            clearTimeout(t);
            resolve();
          }
        });
      });
      // Trigger another create on the ORIGINAL quiz; sockC is on the OTHER quiz.
      await fetchJson(`${BASE_URL}/api/v1/quizzes/${quizId}/comments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${alice.token}` },
        body: JSON.stringify({ body: `isolation test ${Date.now()}` }),
      });
      await guard;
      sockC.disconnect();
      record("S7: cross-quiz isolation", !leaked, leaked ? "leaked" : "ok");
    } else {
      record(
        "S7: cross-quiz isolation",
        true,
        "skipped (react-hooks-deep-dive not seeded)",
      );
    }
  } catch (err) {
    console.error(`\nFATAL: ${err.message}`);
    record("scenario execution", false, err.message);
  } finally {
    if (sockA) sockA.disconnect();
    if (sockB) sockB.disconnect();
  }

  // ─── Summary ────────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed === 0 ? 0 : 1);
}

await main();