# LIV-135 — Operational engagement analytics dashboard

Plan for [LIV-135](https://linear.app/livsight-sarl/issue/LIV-135/client-mobile-build-operational-engagement-analytics-dashboard):
measure meaningful operational usage of LivSight Client (users, not merchants) via a PostHog
dashboard — active/engaged users, feature adoption, retention, inactivity, opens, report
downloads, API reliability — built on existing instrumentation where possible, validated in
Development then recreated in Production.

**Branch:** `edjou/liv-135-client-mobile-build-operational-engagement`  
**Base for PRs:** `staging`  
**Living catalog:** [`docs/ANALYTICS_POSTHOG.md`](./ANALYTICS_POSTHOG.md) + `lib/analytics/events.ts`  
**PostHog Development:** LivSight Development (local + staging/preview keys)  
**PostHog Production:** [project 309875](https://eu.posthog.com/project/309875)  
**Last updated:** 2026-11-28  
**Current phase:** 0 Done — waiting for human to start Phase 1

---

## Agent rules (all agents — Cursor, Claude Code, other)

These rules apply to **every** agent working this plan (including Claude Code on Linear).

1. **Propose first → human OK** before any edit to this MD, the Linear issue (text or checkboxes),
   or application code.
2. **Open questions anytime** — pause while unanswered; do not proceed past unresolved questions.
3. **Ask before reading the codebase** when audit/design/impl needs it (Phase 0 already approved
   a repo read for planning; later phases still ask if scope expands).
4. **Phases follow Linear checkboxes** — use the [Linear checkbox map](#linear-checkbox-map);
   do not invent out-of-scope work without asking. Propose dropping/editing unnecessary
   checkboxes; apply only after human OK; keep the map in sync.
5. **Linear may be updated by Claude Code too** — re-fetch the issue before flipping boxes;
   only complete still-open items for the finished phase; do not fight other agents’ updates.
6. Honor the [Hard gate](#hard-gate--linear--github-rules-claude-code--any-agent) and
   [Agent handoff protocol](#agent-handoff-protocol-every-phase) below.

---

## Hard gate — Linear ↔ GitHub rules (Claude Code / any agent)

**Do not start coding, continue a phase, or create any commit on this issue unless the same
Linear linking rules as Cursor’s user rule “Linear ↔ GitHub” are configured and will be
applied.** Commits are how the branch links to Linear — missing those rules means work must
not begin, not only that PRs are blocked.

Required rules (must all be true):

| Rule | Requirement |
|---|---|
| Issue signal | Work is explicitly for **LIV-135** (branch, user, or Linear URL) |
| Branch name | Use Linear’s git branch name: `edjou/liv-135-client-mobile-build-operational-engagement` (contains `liv-135`) |
| **Commits (mandatory while coding)** | Conventional Commits, English, imperative; every commit on this work **must** link LIV-135 via subject `[LIV-135]` and/or body/trailer `Refs LIV-135` (use `Fixes LIV-135` only when the human says the issue is finished) |
| PR title | Conventional Commit + `[LIV-135]` (when a PR is requested) |
| PR body | Near the top: `Fixes LIV-135` (finishes) or `Refs LIV-135` (partial / related) |
| No invented links | Do not invent other Linear IDs |

If these rules are **not** configured in the agent/session, the agent must:

1. **Stop immediately** — do not write or edit application code
2. Tell the human that Linear ↔ GitHub linking is missing or incomplete
3. Refuse to code, commit, update this plan’s phase status as Done, or open a PR until the rules match

Paste or confirm this block is present **before starting to code** (Phase 1+):

```text
Linear ↔ GitHub (required before coding): branch includes liv-135; every commit links LIV-135
(Refs/Fixes); PR title has [LIV-135]; PR body has Fixes/Refs LIV-135; do not invent Linear IDs.
```

---

## Agent handoff protocol (every phase)

**Before writing any code for a phase:** re-check the [Hard gate](#hard-gate--linear--github-rules-claude-code--any-agent) and [Agent rules](#agent-rules-all-agents--cursor-claude-code-other). If Linear commit-linking rules are not configured, stop — do not code. Ask before codebase reads; propose code edits and wait for human OK.

When an agent (Cursor, Claude Code, or other) **finishes a phase**:

1. **Propose** MD updates (phase **Done**, **Current phase**, **Exit notes**); wait for human OK,
   then apply.
2. Run the phase’s verification (`npm test` scoped as listed, or full suite if unspecified). For
   PostHog-only phases, verification = MCP/Activity checks documented in Exit notes (no app tests
   required unless instrumentation changed).
3. **Re-fetch** LIV-135 from Linear. **Propose** which still-open checkboxes this phase completed
   per [Linear checkbox map](#linear-checkbox-map); wait for human OK; then flip only those
   `- [ ]` → `- [x]` (preserve all other description text; do not invent boxes). Multi-phase
   items only when this phase is the last required one. If Linear update fails, record that in
   Exit notes and continue.
4. **Commit** all approved phase work **including this markdown update**, using Conventional
   Commits English, scope `analytics` when appropriate, and **always** link LIV-135 in the
   commit (see Hard gate). Pure PostHog UI work with no repo file changes may skip commit until
   the next docs phase that records URLs/definitions.
5. Do **not** start the next phase in the same commit unless the human explicitly asks.
6. Do **not** open a PR unless the human explicitly asks (then base `staging`, title/body per
   Linear rules).

Suggested commit shape when closing a phase:

```text
feat(analytics): <phase summary> [LIV-135]

Refs LIV-135
```

Use `docs:` if the phase only updated planning/docs. Use `test:` if tests-only. Never omit the
LIV-135 link on commits for this branch.

**Code permission:** Do not write or change production code unless (a) Linear ↔ GitHub rules
are configured for commits as above, and (b) the human explicitly allows implementation for
the current phase after a proposed plan of edits. Docs-only / PostHog-dashboard phases still
require human OK before editing this file or creating/updating PostHog dashboards, and
LIV-135-linked commits when committing repo changes.

---

## Validated product decisions (2026-11-28)

| Topic | Decision |
|---|---|
| Entity | **Users** only — no merchant entity; identity = Keycloak `keycloakId` |
| Linear scope | Rewritten merchants → users (human-approved) |
| Primary deliverable | PostHog **dashboard** (not an in-app UI) |
| Environments | Build/validate in **LivSight Development**; recreate twin in **LivSight Production** (`309875`) |
| How prod gets the board | Projects are separate — **recreate** same insight definitions on Production (no auto-move) |
| Existing tracking | Events already flow via SDK; dashboard **queries** them — no “wire to dashboard” in app code |
| Engaged user (weekly) | Unique user with ≥1 of: delivery **request** (`demande_soumise`), stock consultation (`$screen` stock and/or `ajout_stock_*`), report consultation (`rapport_visualise`) — finalize exact formula in Phase 1 |
| Deliveries per user | Include only if audit confirms authoritative signal; treat `demande_soumise` as **request submissions**, not carrier-completed deliveries |
| Weeks | Complete **Monday–Sunday** comparisons; document denominators |
| Event strategy | **Reuse first** — audit catalog; add events only for confirmed gaps (TDD + catalog) |
| PII | No PII, credentials, raw search, sensitive payloads (existing rules in `ANALYTICS_POSTHOG.md`) |
| `app_source` | All client events already register `app_source = app_client`; filter every insight on it |
| Out of scope | Notification lifecycle depth (**LIV-23**), session replay (**LIV-31**), in-app analytics UI |
| Base branch | `staging` |

---

## Linear checkbox map

Source: LIV-135 acceptance criteria. Phase **Done** means the mapped boxes may be proposed for
flip after human OK (multi-phase items only on the **last** required phase).

| Linear AC (verbatim summary) | Phase(s) |
|---|---|
| Audit existing instrumentation; reuse equivalent names; document any changes | **1** (audit); **3** (docs finalize) — last for “document any changes” |
| All applicable events use `app_source = app_client` and correct env PostHog project | Inherit from existing `register`; confirm in **2** (Dev) and **5** (Prod) — **5** last |
| Verify event names, properties and counts in staging before production; no duplicate events or cross-tenant leakage | **4** (Development/staging verify — last for staging half); prod twin in **5** |
| Do not capture PII, credentials, raw search input or sensitive payloads | **1–2** (design); confirm in **3–4** |
| Document event definitions, trigger semantics, supported properties and unavailable features; verify production events after rollout | **3** (docs); production verify **5** / post-rollout Exit notes — **5** last |

---

## Phase status

| Phase | Name | Status | Owner / agent | Completed |
|---|---|---|---|---|
| 0 | Preconditions & Linear gate | Done (branch + plan) | Cursor | 2026-11-28 |
| 1 | Audit instrumentation ↔ dashboard metrics | Not started | — | — |
| 2 | Build dashboard in LivSight Development | Not started | — | — |
| 3 | Document denominators, coverage, definitions | Not started | — | — |
| 4 | Development / staging verification | Not started | — | — |
| 5 | Recreate Production dashboard + link ticket | Not started | — | — |

Statuses: `Not started` · `In progress` · `Blocked` · `Done`

---

## Context snapshot (planning, 2026-11-28)

| Existing piece | Role today | Relation to LIV-135 |
|---|---|---|
| `lib/analytics/*` | PostHog client, typed `track()`, identity, `$screen` | Reuse; extend only if Phase 1 finds gaps |
| `AnalyticsEvents` (20) | Frozen French `snake_case` catalog | Primary metric inputs |
| `$screen` stable names | Manual via `useScreenAnalytics` | Stock / feature consultation signals |
| `demande_soumise` | Successful createTransaction | Delivery **requests** for engagement |
| `rapport_visualise` / `document_telecharge` | Report view / download-or-share | Report consultation & downloads |
| `erreur_api` | 5xx in `apiFetch` | API reliability |
| SDK Application Opened | Lifecycle | Opens per user |
| `app_source: app_client` | Super property | Filter all insights |
| Dev vs Prod PostHog projects | Separate keys / data | Twin dashboards |
| LIV-132 | Screen + UX empty/search | Prerequisite catalog maturity |

### Draft metric → event map (to confirm in Phase 1)

| Dashboard metric | Candidate signal |
|---|---|
| Weekly / monthly active users | Unique users with `$screen` and/or Application Opened; filter `app_source` |
| Weekly engaged users | Unique users with `demande_soumise` **or** stock `$screen`/`ajout_stock_*` **or** `rapport_visualise` |
| Feature adoption | Breakdown by feature events + `$screen` names |
| Active days | Stickiness / days active on engagement or `$screen` |
| 30-day retention | Retention insight on identify’d users |
| Inactive users | Cohort / formula: previously active, no engagement in window |
| Opens per user | Application Opened / unique users |
| Report downloads | `document_telecharge` |
| API reliability | `erreur_api` rate vs request volume (define denominator carefully) |
| Deliveries per user | Optional — only if `demande_soumise` accepted as “requests per user” |

---

## Conventions (all phases)

- Prefer **PostHog dashboard + docs** over new app events; add events only after Phase 1 gap approval.
- If app instrumentation is needed: TDD in `__tests__/lib/analytics/` first; declare in `AnalyticsEvents`.
- Zero PII; fire-and-forget `track()`; `@/lib/logger` only.
- Every insight filters `app_source = app_client`.
- Week boundaries: Monday–Sunday; document timezone assumption (PostHog project TZ).
- UI copy in app stays French; PostHog dashboard names may be English or French — keep consistent once chosen in Phase 2.

---

## Phase 0 — Preconditions & Linear gate

**Status:** Done (branch from `origin/staging` + this plan).

### Scope

- Branch `edjou/liv-135-client-mobile-build-operational-engagement` exists (from `origin/staging`).
- This plan file exists with Agent rules, Hard gate, checkbox map, and validated decisions.
- Linear scope rewritten to **users** (human-approved, 2026-11-28).
- Linear status set to **In Progress**.

### Exit notes

- Branch tip is **`origin/staging`** (`10227ef` — includes merged LIV-132).
- No application code yet; no PostHog dashboard yet.
- Do **not** start Phase 1 until the human explicitly says so.

### Commit (when human asks to commit Phase 0)

```text
docs(analytics): add operational engagement dashboard plan [LIV-135]

Refs LIV-135
```

---

## Phase 1 — Audit instrumentation ↔ dashboard metrics

**Status:** Not started  
**Goal:** Confirm which existing events power each metric; list gaps; decide deliveries-per-user in/out.

### Scope

- Ask before deeper codebase reads if needed beyond prior planning snapshot.
- Map every Scope metric → event(s) / property / denominator.
- Check Development Activity (sample) for presence of `$screen`, `demande_soumise`, `rapport_visualise`, `document_telecharge`, `erreur_api`, Application Opened with `app_source = app_client`.
- Propose engaged-user formula (exact events) and whether “deliveries per user” ships.
- If gaps need new events: propose names/properties/call sites; **do not implement** until human OK (then TDD).

### Verification

- Written audit table in this MD (Exit notes / appendix).
- Human approves metric formulas before Phase 2.

### Suggested commit

```text
docs(analytics): audit events for engagement dashboard [LIV-135]

Refs LIV-135
```

---

## Phase 2 — Build dashboard in LivSight Development

**Status:** Not started  
**Goal:** Create the operational engagement dashboard + insights on **LivSight Development**.

### Scope

- Switch PostHog MCP / UI to Development project.
- Create dashboard and insights per approved Phase 1 formulas (WAU/MAU, engaged, adoption, active days, retention, inactive, opens/user, downloads, API reliability, optional requests/user).
- Text tiles for denominators / caveats (user-facing short; agent_context for event names).
- Filter all tiles: `app_source = app_client`.
- Record Development dashboard URL in Exit notes.

### Verification

- `dashboard-insights-run` (or Activity spot-check) returns coherent data for recent Development traffic.
- Human reviews dashboard before Phase 3.

### Suggested commit

Usually none until Phase 3 docs (PostHog-only). If recording URL in this MD:

```text
docs(analytics): record Development engagement dashboard URL [LIV-135]

Refs LIV-135
```

---

## Phase 3 — Document denominators, coverage, definitions

**Status:** Not started  
**Goal:** Living docs match the dashboard contract.

### Scope

- Update [`docs/ANALYTICS_POSTHOG.md`](./ANALYTICS_POSTHOG.md) (and/or a short section linked from it): metric definitions, triggers, properties, unavailable/deferred metrics, week/denominator rules, Dev→Prod twin process.
- Link plan from [`docs/README.md`](./README.md) if not already.
- Document any catalog changes from Phase 1 (even if “none”).

### Verification

- Docs review by human.
- No app behavior change unless a prior phase already shipped instrumentation (then tests still green).

### Suggested commit

```text
docs(analytics): document engagement dashboard metrics [LIV-135]

Refs LIV-135
```

---

## Phase 4 — Development / staging verification

**Status:** Not started  
**Goal:** Satisfy staging-before-prod AC against Development project (staging builds share that key).

### Scope

- Checklist: event names, properties, sample counts; no duplicate double-counting for engaged definition; `app_source` present; no PII in sampled properties; no cross-tenant leakage assumptions documented.
- Record results in Exit notes (what was checked, when, by whom).

### Verification

- Human signs off checklist in Exit notes.

### Suggested commit

```text
docs(analytics): record Development verification for engagement dashboard [LIV-135]

Refs LIV-135
```

---

## Phase 5 — Recreate Production dashboard + link ticket

**Status:** Not started  
**Goal:** Twin dashboard on Production `309875`; link on LIV-135; note prod event verification.

### Scope

- Recreate same insights/dashboard on **LivSight Production** (definitions from Phases 1–2).
- Filter `app_source = app_client`.
- Add Production dashboard URL to Linear issue (link attachment or description).
- Spot-check Production Activity after store/prod traffic (or note “pending rollout” in Exit notes if no prod traffic yet).
- Do **not** use `Fixes LIV-135` on commits unless human says the issue is finished.

### Verification

- Prod dashboard URL live; Linear linked; human OK on twin parity.

### Suggested commit

```text
docs(analytics): link Production engagement dashboard [LIV-135]

Refs LIV-135
```

### Suggested PR (when human asks)

```text
Title: docs(analytics): operational engagement PostHog dashboard [LIV-135]

Body (near top):
Refs LIV-135
```

Use `Fixes LIV-135` only when human confirms the issue is complete.

---

## Open questions (resolved / remaining)

| Question | Status |
|---|---|
| Merchants vs users | **Resolved** — users only |
| Base branch | **Resolved** — `staging` |
| Dev → Prod move | **Resolved** — recreate twin on Production |
| Exact engaged-user event set | **Phase 1** |
| Deliveries per user in/out | **Phase 1** |
| Dashboard language (EN/FR) | **Phase 2** (propose once) |
