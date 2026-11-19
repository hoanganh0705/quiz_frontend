---
name: clean-naming
description: Enforce domain-driven, semantic naming across frontend and backend codebases. Bans roadmap/phase-based variable names (e.g., isPhase4Live, phase5_), ticket IDs, sprint references, and meaningless placeholders.
---

# Clean Naming & Semantic Code Standards

Use this skill when authoring, reviewing, or refactoring code in both frontend and backend to ensure variables, functions, types, and channel identifiers express clear domain intent.

## Core Mandates

1. **Strictly Ban Process-Coupled Identifiers**:
   - Never name variables, functions, arguments, constants, channels, or types after development phases, epics, sprint numbers, or tickets.
   - Banned: `isPhase4Live`, `phase5_...`, `phase6Social10...`, `phase7-admin-...`, `sprint3Helper`, `ticket414Outcome`.
   - Required: `isAttemptsLive`, `realtimeInvalidation`, `logMalformedSocialPayloadBreadcrumb`, `adminCategoryChannel`, `attemptOutcome`.

2. **Domain-Driven Ubiquitous Language**:
   - Variables must state _what_ entity, action, or capability they represent.
   - Boolean variables must be prefixed with semantic auxiliary verbs (`is`, `has`, `can`, `should`, `are`) paired with the domain capability:
     - `isAttemptsLive` (not `isPhase4Live`)
     - `isAuthoringEnabled` (not `isPhase4Authoring`)
     - `hasActiveAttempt`
     - `canSubmitAnswer`

3. **Feature Flag Consumer Variables**:
   - Consumer variables evaluating `isFeatureEnabled('flag_name', 'live')` must directly reference the feature's domain name:
     ```ts
     // ✅ Correct
     const isAttemptsLive = isFeatureEnabled("attempts_live", "live");

     // ❌ Forbidden
     const isPhase4Live = isFeatureEnabled("attempts_live", "live");
     ```

4. **Event & Channel Names**:
   - Sockets, BroadcastChannels, and cross-tab events must be named after the domain resource and lifecycle:
     - `'admin-category-sync'` (not `'phase7-admin-category'`)
     - `'admin-comment-moderation-sync'` (not `'phase7-admin-comment-moderation'`)

5. **Self-Audit Verification**:
   Before finalizing code edits, run:
   ```bash
   grep -rnE "(isPhase[0-9]|phase[0-9]|Phase[0-9]|sprint[0-9]|tkt[-_0-9]|ticket[0-9])" \
     src/ --exclude-dir=node_modules --exclude-dir=.git
   ```
   Confirm zero process-coupled names were introduced.
