# LIV-135 — Operational engagement analytics dashboard

Plan for [LIV-135](https://linear.app/livsight-sarl/issue/LIV-135/client-mobile-build-operational-engagement-analytics-dashboard):
measure meaningful operational usage of LivSight Client (users, not merchants) via a PostHog
dashboard — active/engaged users, feature adoption, retention, inactivity, opens, report
downloads, API reliability — built on existing instrumentation where possible.
**Deliverable is Production-only** (human decision 2026-11-28): skip staging dashboard verification;
canonical board lives on LivSight Production. Development board `1159076` remains a design
reference only (not a staging gate).

**Branch:** `edjou/liv-135-client-mobile-build-operational-engagement`  
**Base for PRs:** `staging`  
**Living catalog:** [`docs/ANALYTICS_POSTHOG.md`](./ANALYTICS_POSTHOG.md) + `lib/analytics/events.ts`  
**PostHog Development:** LivSight Development `309706` (reference / design only for this issue)  
**PostHog Production (canonical):** [project 309875](https://eu.posthog.com/project/309875)  
**Last updated:** 2026-11-28  
**Current phase:** 3 Done — Phase 4 **Skipped**; waiting for human to start Phase 5 (Prod)  
**PostHog Development id:** `309706` (timezone **UTC**)  
**Development dashboard (reference only):** [Client operational engagement](https://eu.posthog.com/project/309706/dashboard/1159076) (`1159076`)

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
| Environments | **Prod-only deliverable** (2026-11-28): canonical dashboard on **LivSight Production** (`309875`). Dev board kept as design reference only; **no staging verification gate** |
| How prod gets the board | Projects are separate — **recreate** same insight definitions on Production from the Dev reference (no auto-move) |
| Existing tracking | Events already flow via SDK; dashboard **queries** them — no “wire to dashboard” in app code |
| Engaged user (weekly) | **Approved Phase 1:** unique user with ≥1 of `demande_soumise` **OR** `$screen` with `$screen_name = 'stock'` **OR** `rapport_visualise`. Optional later: also `ajouter_au_stock` screen — not in v1 |
| Deliveries per user | **Include** as **“Demandes soumises / user”** (`demande_soumise`) — request submissions, **not** carrier-completed deliveries |
| API reliability | **`erreur_api` event count** (`app_client` only) — not a success-rate % (no successful-call volume tracked) |
| Weeks | Complete **Monday–Sunday**; project TZ = **UTC** (`309706`) |
| Event strategy | **Reuse only for v1** — Phase 1 found **no new events** required; empty Dev tiles OK until flows exercised |
| Do not use | Legacy `rapport_consulte` (seen as `app_agent`) — client uses `rapport_visualise` |
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
| Verify event names, properties and counts on **Production**; no duplicate events or cross-tenant leakage *(rewritten 2026-11-28 — was staging-before-prod; Prod-only)* | **5** (Production verify — last) |
| Do not capture PII, credentials, raw search input or sensitive payloads | **1–2** (design); confirm in **3** + **5** |
| Document event definitions, trigger semantics, supported properties and unavailable features; verify production events after rollout | **3** (docs); production verify **5** / post-rollout Exit notes — **5** last |

---

## Phase status

| Phase | Name | Status | Owner / agent | Completed |
|---|---|---|---|---|
| 0 | Preconditions & Linear gate | Done (branch + plan) | Cursor | 2026-11-28 |
| 1 | Audit instrumentation ↔ dashboard metrics | Done | Cursor | 2026-11-28 |
| 2 | Build dashboard in LivSight Development | Done | Cursor | 2026-11-28 |
| 3 | Document denominators, coverage, definitions | Done | Cursor | 2026-11-28 |
| 4 | Development / staging verification | **Skipped** (Prod-only, 2026-11-28) | — | 2026-11-28 |
| 5 | Recreate Production dashboard + link ticket | Not started | — | — |

Statuses: `Not started` · `In progress` · `Blocked` · `Done`

---

## Context snapshot (Phase 1 audit, 2026-11-28)

| Existing piece | Role today | Relation to LIV-135 |
|---|---|---|
| `lib/analytics/*` | PostHog client, typed `track()`, identity, `$screen` | **Reuse — no gaps requiring new events** |
| `AnalyticsEvents` (20) | Frozen French `snake_case` catalog | Primary metric inputs |
| `$screen` stable names | Manual via `useScreenAnalytics` | Active + stock consult (`stock`) |
| `demande_soumise` | Successful createTransaction | Engaged + demandes/user |
| `rapport_visualise` / `document_telecharge` | Report view / download-or-share | Engaged + downloads |
| `erreur_api` | 5xx in `apiFetch` | Reliability **count** (client filter mandatory) |
| SDK `Application Opened` | Lifecycle | Opens per user |
| `app_source: app_client` | Super property | Filter **every** insight (shared Dev project) |
| Dev `309706` / Prod `309875` | Separate keys / data | Twin dashboards |
| LIV-132 | Screen + UX empty/search | Prerequisite catalog maturity |

### Approved metric → event map (Phase 1)

| Dashboard metric | Approved signal | Denominator / notes |
|---|---|---|
| Weekly / monthly active users | Unique users with `$screen` + `app_source = app_client` | Complete Mon–Sun weeks (UTC) |
| Weekly engaged users | Unique users with `demande_soumise` **OR** (`$screen` ∧ `$screen_name = stock`) **OR** `rapport_visualise` | Same `app_source` filter on all series |
| Feature adoption | Unique users by `$screen_name` (+ key feature events as secondary) | Filter `app_source` |
| Active days | Stickiness on `$screen` | Filter `app_source` |
| 30-day retention | Retention returning to `$screen` | Identified users; low Dev volume expected |
| Inactive users | Previously active (had `$screen`), no activity in lookback | Document lookback in tile text |
| Opens per user | `Application Opened` events / unique users | Filter `app_source` |
| Report downloads | `document_telecharge` | May be empty in Dev until exercised |
| API reliability | Count of `erreur_api` | **Not** a %; filter `app_client` only |
| Demandes soumises / user | `demande_soumise` / unique users | Label clearly — not completed deliveries |

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

**Status:** Done (2026-11-28, Cursor) — human approved formulas  
**Goal:** Confirm which existing events power each metric; list gaps; decide deliveries-per-user in/out.

### Scope

- Codebase + Development PostHog (`309706`) sample audited.
- Metric map approved (see [Approved metric → event map](#approved-metric--event-map-phase-1)).
- **No new events** for v1.

### Verification

- Audit tables in this MD; human approved engaged formula + demandes/user + API count + no new events (2026-11-28).

### Exit notes

- **Dev project:** LivSight Development `309706`, TZ **UTC**.
- **Sample (app_client, ~14–30d):** `$screen` (incl. `stock`, `rapports`, `courses`, …), `Application Opened`, `rapport_visualise`, `courses_filtrees`, sparse `erreur_api`.
- **Not seen yet in Dev taxonomy:** `demande_soumise`, `document_telecharge`, `ajout_stock_*`, `tarif_zone_consulte` — still wired in app; empty dashboard tiles until exercised.
- **Cross-app pollution:** `erreur_api` dominated by `app_agent` / `parcours_admin` / `app_livreur` unless filtered — **mandatory** `app_source = app_client` on every tile.
- **Do not use** `rapport_consulte` for Client (agent traffic).
- **Linear ACs:** none flipped this phase (audit AC completes at Phase 3 docs).
- Do **not** start Phase 2 until the human explicitly says so.

### Suggested commit

```text
docs(analytics): audit events for engagement dashboard [LIV-135]

Refs LIV-135
```

### Phase 1 appendix — Development presence (2026-11-28)

| Event / signal | app_client in Dev? | Notes |
|---|---|---|
| `$screen` + `$screen_name` | Yes | Stable names from LIV-132 |
| `Application Opened` | Yes | Opens per user |
| `rapport_visualise` | Yes | Engaged / reports |
| `demande_soumise` | No volume yet | Code path exists |
| `document_telecharge` | No volume yet | Code path exists |
| `erreur_api` | Yes (sparse) | Filter client or numbers are wrong |
| `ajout_stock_soumis` | No volume yet | Not required for v1 engaged (stock `$screen` used) |

---

## Phase 2 — Build dashboard in LivSight Development

**Status:** Done (2026-11-28, Cursor) — human OK on board + plain-language intro  
**Goal:** Create the operational engagement dashboard + insights on **LivSight Development**.

### Scope

- Dashboard **Client operational engagement** on project `309706`: https://eu.posthog.com/project/309706/dashboard/1159076
- Insights: WAU, MAU, weekly engaged, lifecycle (dormant ≈ inactive), feature adoption by screen, stickiness, 30-day retention, opens/user, report downloads, API 5xx count, demandes/user.
- Intro text tile: **How to read this board** (plain language; technical event names in `agent_context` only).
- All insights filter `app_source = app_client`.

### Verification

- `dashboard-insights-run` returned results (sparse Dev traffic; downloads/demandes often 0 — expected).
- Human reviewed; intro rewritten less technical (2026-11-28).

### Exit notes

- **No app code** this phase.
- **Linear ACs:** none flipped (staging verify = Phase 4; docs = Phase 3).
- Do **not** start Phase 3 until the human explicitly says so.

### Suggested commit

```text
docs(analytics): record Development engagement dashboard URL [LIV-135]

Refs LIV-135
```

---

## Phase 3 — Document denominators, coverage, definitions

**Status:** Done (2026-11-28, Cursor)  
**Goal:** Living docs match the dashboard contract.

### Scope

- [`docs/ANALYTICS_POSTHOG.md`](./ANALYTICS_POSTHOG.md): section **Dashboard engagement opérationnel (LIV-135)** — métriques, dénominateurs, Dev→Prod twin, indisponibles (`rapport_consulte`, taux API %, livraisons terminées).
- Catalog changes: **none** (reuse only).
- Index: [`docs/README.md`](./README.md) links this plan.

### Verification

- Docs written; human review welcome.
- No app behavior change.

### Exit notes

- Linear AC **audit + document changes** flipped after human OK (2026-11-28).
- Human decided **Prod-only** — Phase 4 skipped; do **not** start Phase 5 until the human explicitly says so.

### Suggested commit

```text
docs(analytics): document engagement dashboard metrics [LIV-135]

Refs LIV-135
```

---

## Phase 4 — Development / staging verification

**Status:** **Skipped** (2026-11-28)  
**Goal:** ~~Satisfy staging-before-prod AC against Development~~ — **cancelled**.

### Exit notes

- Human: do **not** gate this work on staging; go **directly to Production**.
- Linear AC rewritten from “staging before production” → “verify on Production” (see checkbox map).
- Dev dashboard `1159076` kept as **design reference** only; not required for AC completion.
- No commit required for this skip alone (docs update may ship with Phase 5 or a small `docs:` commit if human asks).

---

## Phase 5 — Recreate Production dashboard + link ticket

**Status:** Not started  
**Goal:** Canonical dashboard on Production `309875`; link on LIV-135; verify events/properties/counts on Prod.

### Scope

- Recreate same insights/dashboard on **LivSight Production** from Dev reference definitions (Phases 1–2).
- Filter `app_source = app_client`.
- Checklist on Prod: event names, properties, sample counts; no engaged double-count; no PII in sampled props; no cross-tenant leakage assumptions documented.
- Add Production dashboard URL to Linear issue (link attachment or description).
- Spot-check Production Activity (or note “pending traffic” in Exit notes if sparse).
- Do **not** use `Fixes LIV-135` on commits unless human says the issue is finished.

### Verification

- Prod dashboard URL live; Linear linked; human OK on parity with Dev reference + Prod verify checklist.

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
| Dev → Prod move | **Resolved** — recreate on Production; **Prod-only** deliverable (skip staging verify / Phase 4) |
| Exact engaged-user event set | **Resolved** — `demande_soumise` ∨ `$screen`/`stock` ∨ `rapport_visualise` |
| Deliveries per user in/out | **Resolved** — in as Demandes soumises / user |
| API reliability shape | **Resolved** — `erreur_api` count, not % |
| New events for v1 | **Resolved** — none |
| Dashboard language (EN/FR) | **Resolved** — English plain-language intro + insight titles |
