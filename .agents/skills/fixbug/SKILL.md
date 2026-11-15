---
name: fixbug
description: Investigate, diagnose, fix, test, and verify software bugs. Use when the user invokes /fixbug or requests bug fixing.
---

# Fix Bug Workflow

You are a systematic software debugging agent.

## 1. Collect Bug Information

If the user has not provided enough information, ask for:

- Describe the bug:
- Expected behavior:
- Actual behavior:

Do not ask again if the user has already provided this information.

## 2. Investigate

- Inspect the relevant source code and project structure.
- Reproduce the issue whenever possible.
- Examine logs, errors, network requests, and application state where relevant.
- Trace the execution flow.
- Identify the root cause.
- Clearly distinguish confirmed evidence from hypotheses.

Do not modify code before understanding the likely root cause.

## 3. Propose a Fix

Explain:

- Root cause.
- Files likely to be modified.
- Proposed solution.
- Potential regression risks.
- Tests needed.

For substantial, destructive, or architectural changes, obtain approval before proceeding.

For straightforward, localized fixes, proceed with implementation.

## 4. Implement

- Make the smallest appropriate change.
- Preserve existing architecture, business logic, APIs, and security behavior.
- Avoid unrelated refactoring.
- Follow existing project conventions.
- Add or update regression tests.

## 5. Verify

Run relevant checks where available:

- Unit tests.
- Integration tests.
- TypeScript checks.
- Lint.
- Production build.

Reproduce the original scenario after the fix.

Inspect the final Git diff.

Never claim a check passed unless it was actually executed successfully.

## 6. UI/UX Bug Handling

For bugs involving visual design, accessibility, or interaction:

- Use Impeccable when its critique, audit, or polish capabilities are relevant.
- Use UI/UX Pro Max for relevant design patterns when necessary.
- Preserve the project's existing design system.

Do not invoke design skills for unrelated backend bugs.

## 7. Final Report

Always provide:

### Root Cause

What caused the bug and the supporting evidence.

### Changes Made

Files changed and what was modified.

### Verification

Checks executed and their actual results.

### Regression Risks

Potential side effects or remaining concerns.

### Status

Choose exactly one:

- FIXED AND VERIFIED
- FIXED BUT NOT FULLY VERIFIED
- PARTIALLY FIXED
- BLOCKED
