# Engineering Standards: Clean Code & Semantic Naming

## 1. Core Principle: Ubiquitous Domain Language

Code must reflect the **business and application domain**, never internal project management artifacts, roadmap milestones, sprint cadences, or ticket numbers.

When reading code, a developer or agent should immediately understand **what capability or business rule is being evaluated**, without needing access to a legacy project plan or Jira board.

---

## 2. Absolute Bans (Anti-Patterns)

The following naming patterns are strictly prohibited in all source code across backend and frontend (variables, functions, constants, types, channel names, file names, API payloads):

### ❌ Banned Patterns

1. **Phase/Milestone Naming**:
   - `isPhase4Live`, `isPhase5Ready`, `phase4Flags`
   - `phase5:service`, `phase7:admin`
   - `phase6Social10MalformedPayloadBreadcrumb`
   - Broadcast channels: `'phase7-admin-category'`, `'phase7-admin-tag'`
   - **Why banned**: Roadmaps change and milestones end. "Phase 4" becomes meaningless legacy debt within weeks. Code must describe *what* it does, not *when* it was scheduled.

2. **Ticket / Sprint / PR Identifiers in Identifiers**:
   - `tkt312Handler`, `sprint4Fix`, `pr102Workaround`, `issue42Validator`
   - **Why banned**: Version control (`git log`, PR history) tracks work tickets; source code variables must not.

3. **Vague / Disposable / Numbered Placeholders**:
   - `data2`, `itemNew`, `tempVal`, `doSomething`, `helper2`, `stuff`
   - **Why banned**: Lacks intent and forces readers to parse the entire implementation to deduce types and purpose.

---

## 3. Allowed vs. Banned Replacement Table

| Banned Anti-Pattern | Clean Domain Replacement | Rationale |
|---|---|---|
| `isPhase4Live` | `isAttemptsLive` or `areAttemptsEnabled` | Explicitly states that quiz attempts are active. |
| `phase5Broadcast` | `realtimeBroadcast` or `socialNotificationChannel` | Names the functional communication channel. |
| `emitPhase5Invalidation(...)` | `emitRealtimeInvalidation(...)` | Describes the event: a realtime cross-tab cache invalidation. |
| `'phase7-admin-category'` | `'admin-category-sync'` | Names the synchronization scope. |
| `'phase7-admin-comment-moderation'` | `'admin-comment-moderation-sync'` | Clear domain event channel. |
| `category: "phase5:service"` | `category: "social:realtime-service"` | Sentry breadcrumbs categorize by domain subsystem. |
| `phase6Social10MalformedPayloadBreadcrumb` | `logMalformedSocialPayloadBreadcrumb` | States the exact operation and domain entity. |

---

## 4. Feature Flag Naming Rules

Feature flags must follow capability-based semantics:

- **Format**: `<domain>_<capability>_<state>` or `<domain>_<action>`
- **Examples**:
  - `attempts_live` (not `phase4_live`)
  - `authoring_live` (not `phase4_authoring`)
  - `realtime_infrastructure_live` (not `phase5_realtime`)
  - `admin_audit_live` (not `phase7_audit`)
- **Boolean checks**:
  - Always name the consumer boolean after the feature:
    ```ts
    // ✅ Good
    const isAttemptsLive = isFeatureEnabled('attempts_live', 'live');
    const isAuthoringEnabled = isFeatureEnabled('authoring_live', 'live');

    // ❌ Forbidden
    const isPhase4Live = isFeatureEnabled('attempts_live', 'live');
    ```

---

## 5. Automated Audit & CI Check

Run the following scanner in CI or pre-commit hooks to detect any process-coupled or phase-derived variable names:

```bash
# Scan for phase-coupled variables, functions, or channel names
grep -rnE "(isPhase[0-9]|phase[0-9]|Phase[0-9]|sprint[0-9]|tkt[-_0-9]|ticket[0-9])" \
  src/ --exclude-dir=node_modules --exclude-dir=.git
```

If matches occur, refactor immediately to clean domain-driven names before merging.
