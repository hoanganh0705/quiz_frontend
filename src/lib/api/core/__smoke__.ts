// Scratch file used to verify the new RFC 7807 getters work end-to-end.
// Created by TKT-1.3.1.2; deleted before merge.
import { AxiosError, AxiosResponse } from "axios";
import { ApiError } from "./ApiError";

function makeError(body: unknown, status: number = 404): AxiosError {
  const response = {
    data: body,
    status,
    statusText: "Not Found",
  } as AxiosResponse;
  return {
    name: "AxiosError",
    message: "Request failed",
    response,
    isAxiosError: true,
    toJSON: () => ({}),
  } as AxiosError;
}

// Test 1: Known RFC 7807 body with extensions.code
const err1 = new ApiError(
  makeError(
    {
      type: "https://api.quiz.local/problems/not-found",
      title: "Not Found",
      status: 404,
      detail: "Quiz with slug trivia-101 not found",
      instance: "/api/v1/quizzes/trivia-101",
      extensions: {
        code: "QUIZ_NOT_FOUND",
        requestId: "req-001",
        timestamp: "2026-07-29T08:00:00Z",
      },
    },
    404,
  ),
);
console.log("--- Test 1: known code QUIZ_NOT_FOUND ---");
console.log("code:", err1.code); // QUIZ_NOT_FOUND
console.log("title:", err1.title); // Not Found
console.log("detail:", err1.detail); // Quiz with slug trivia-101 not found
console.log("instance:", err1.instance); // /api/v1/quizzes/trivia-101
console.log("requestId:", err1.requestId); // req-001
console.log("status:", err1.status); // 404
console.log("isNotFound:", err1.isNotFound); // true

// Test 2: Synthesized-code fallback for native HttpException (401, no extensions.code)
const err2 = new ApiError(makeError({}, 401));
console.log("\n--- Test 2: synthesized code for 401 ---");
console.log("code:", err2.code); // GLOBAL_UNAUTHENTICATED
console.log("isUnauthorized:", err2.isUnauthorized); // true

// Test 3: ValidationPipe string[] shape → GLOBAL_VALIDATION_FAILED
const err3 = new ApiError(
  makeError({ message: ["email must be valid", "password too short"] }, 400),
);
console.log("\n--- Test 3: validation error 400 ---");
console.log("code:", err3.code); // GLOBAL_VALIDATION_FAILED
console.log("isValidationError:", err3.isValidationError); // true
console.log("validationMessages.length:", err3.validationMessages.length); // 2
