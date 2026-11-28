# LIV-132 — Screen navigation and UX analytics

Plan for [LIV-132](https://linear.app/livsight-sarl/issue/LIV-132/client-mobile-implement-screen-navigation-and-ux-analytics):
measure meaningful operational usage of LivSight Client via stable `$screen` names and UX
signals (`recherche_sans_resultat`, `etat_vide_affiche`), without duplicating existing failure
events or inventing support contact tracking we do not have.

**Branch:** `edjou/liv-132-client-mobile-implement-screen-navigation-and`  
**Base for PRs:** `staging`  
**Living catalog:** [`docs/ANALYTICS_POSTHOG.md`](./ANALYTICS_POSTHOG.md) + `lib/analytics/events.ts`  
**Last updated:** 2026-11-28  
**Current phase:** 5 (staging verification) — wait for human before checklist

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
| Issue signal | Work is explicitly for **LIV-132** (branch, user, or Linear URL) |
| Branch name | Use Linear’s git branch name: `edjou/liv-132-client-mobile-implement-screen-navigation-and` (contains `liv-132`) |
| **Commits (mandatory while coding)** | Conventional Commits, English, imperative; every commit on this work **must** link LIV-132 via subject `[LIV-132]` and/or body/trailer `Refs LIV-132` (use `Fixes LIV-132` only when the human says the issue is finished) |
| PR title | Conventional Commit + `[LIV-132]` (when a PR is requested) |
| PR body | Near the top: `Fixes LIV-132` (finishes) or `Refs LIV-132` (partial / related) |
| No invented links | Do not invent other Linear IDs |

If these rules are **not** configured in the agent/session, the agent must:

1. **Stop immediately** — do not write or edit application code
2. Tell the human that Linear ↔ GitHub linking is missing or incomplete
3. Refuse to code, commit, update this plan’s phase status as Done, or open a PR until the rules match

Paste or confirm this block is present **before starting to code** (Phase 1+):

```text
Linear ↔ GitHub (required before coding): branch includes liv-132; every commit links LIV-132
(Refs/Fixes); PR title has [LIV-132]; PR body has Fixes/Refs LIV-132; do not invent Linear IDs.
```

---

## Agent handoff protocol (every phase)

**Before writing any code for a phase:** re-check the [Hard gate](#hard-gate--linear--github-rules-claude-code--any-agent) and [Agent rules](#agent-rules-all-agents--cursor-claude-code-other). If Linear commit-linking rules are not configured, stop — do not code. Ask before codebase reads; propose code edits and wait for human OK.

When an agent (Cursor, Claude Code, or other) **finishes a phase**:

1. **Propose** MD updates (phase **Done**, **Current phase**, **Exit notes**); wait for human OK,
   then apply.
2. Run the phase’s verification (`npm test` scoped as listed, or full suite if unspecified).
3. **Re-fetch** LIV-132 from Linear. **Propose** which still-open checkboxes this phase completed
   per [Linear checkbox map](#linear-checkbox-map); wait for human OK; then flip only those
   `- [ ]` → `- [x]` (preserve all other description text; do not invent boxes). Multi-phase
   items only when this phase is the last required one. If Linear update fails, record that in
   Exit notes and continue.
4. **Commit** all approved phase work **including this markdown update**, using Conventional
   Commits English, scope `analytics` when appropriate, and **always** link LIV-132 in the
   commit (see Hard gate).
5. Do **not** start the next phase in the same commit unless the human explicitly asks.
6. Do **not** open a PR unless the human explicitly asks (then base `staging`, title/body per
   Linear rules).

Suggested commit shape when closing a phase:

```text
feat(analytics): <phase summary> [LIV-132]

Refs LIV-132
```

Use `docs:` if the phase only updated planning/docs. Use `test:` if tests-only. Never omit the
LIV-132 link on commits for this branch.

**Code permission:** Do not write or change production code unless (a) Linear ↔ GitHub rules
are configured for commits as above, and (b) the human explicitly allows implementation for
the current phase after a proposed plan of edits. Docs-only phases still require human OK
before editing this file, and LIV-132-linked commits when committing.

---

## Validated product decisions (2026-11-28)

| Topic | Decision |
|---|---|
| Event strategy | **Reuse first** — do not add parallel umbrella events that double-count |
| `action_echouee` | **Do not add** — covered by existing `demande_echouee`, `connexion_echouee`, `ajout_stock_echoue`, `document_echec`, `erreur_api` |
| `support_contacte` | **Dropped** — no support-contact surface in the app |
| `recherche_sans_resultat` | **Add** for free-text list search 0-hits: stock, tarifs, conversations. Props: `{ contexte }` only — **no raw query**. Quartier stays `quartier_recherche` + `trouve: false` |
| `etat_vide_affiche` | **Add** for true empty states. Props: `{ ecran, motif: "liste_vide" \| "filtre" }`. If empty is from active search → only `recherche_sans_resultat`, not both |
| `$screen` | Audit staging emissions → stable `snake_case` route map → capture on real navigation with last-screen dedupe; if autocapture + manual would double-fire, disable `captureScreens` and own `$screen` |
| Staging PostHog | Staging already has a key — verify there (AC #3). Update stale note in `ANALYTICS_POSTHOG.md` when documenting |
| Out of scope | Notification tracking (**LIV-23**), session replay (**LIV-31**) |
| PII | No new PII; do not send raw search strings; leave `quartier_recherche.terme` as-is unless a follow-up says otherwise |

---

## Linear checkbox map

Source: LIV-132 acceptance criteria. Phase **Done** means the mapped boxes may be proposed for
flip after human OK (multi-phase items only on the **last** required phase).

| Linear AC (verbatim summary) | Phase(s) |
|---|---|
| Audit existing instrumentation; reuse equivalent names; document any changes | **1** (audit), **4** (docs finalize) |
| All applicable events use `app_source = app_client` and correct env PostHog project | **2–3** (impl inherits existing `register`); verify in **5** |
| Verify event names, properties and counts in staging before production; no duplicate events or cross-tenant leakage | **5** (last for this box) |
| Do not capture PII, credentials, raw search input or sensitive payloads | **2–3** (design + tests); confirm in **4–5** |
| Document event definitions, trigger semantics, supported properties and unavailable features; verify production events after rollout | **4** (docs); production verify is **post-merge / rollout** (note in Exit notes — not a code phase) |

---

## Phase status

| Phase | Name | Status | Owner / agent | Completed |
|---|---|---|---|---|
| 0 | Preconditions & Linear gate | Done (branch + plan) | Cursor | 2026-11-28 |
| 1 | Audit instrumentation & screen emissions | Done | Cursor | 2026-11-28 |
| 2 | Stable `$screen` map + dedupe | Done | Cursor | 2026-11-28 |
| 3 | UX events: empty + search (TDD) | Done | Cursor | 2026-11-28 |
| 4 | Document catalog, aliases, unavailable | Done | Cursor | 2026-11-28 |
| 5 | Staging verification checklist | Not started | — | — |

Statuses: `Not started` · `In progress` · `Blocked` · `Done`

---

## Context snapshot (updated by Phase 1 audit, 2026-11-28)

| Existing piece | Role today | Relation to LIV-132 |
|---|---|---|
| `lib/analytics/*` | PostHog client, typed `track()`, identity, mappers | Reuse; extend catalog carefully |
| `AnalyticsProvider` | `captureScreens: false`, `captureTouches: false` | Autocapture screens off — manual `$screen` via `useScreenAnalytics` |
| `screenNames.ts` + `useScreenAnalytics` | Stable route map + dedupe + `client.screen()` | Phase 2 Done |
| `events.ts` | **20** typed events (`ANALYTICS_POSTHOG.md` still stale) | Includes `recherche_sans_resultat`, `etat_vide_affiche` |
| `emptyUx.ts` + `useEmptyUxTracking` | Classify + dedupe empty/search UX | Phase 3 Done |
| `track()` call sites | See [Phase 1 appendix](#phase-1-appendix--audit-2026-11-28) | All catalogued; no unnamed captures |
| `quartier_recherche` | Tariff quartier lookup; `trouve: false` = uncovered | Keep; not a substitute for list-search empty |
| Failure events | `demande_echouee`, `connexion_echouee`, `ajout_stock_echoue`, `document_echec`, `erreur_api` | Cover `action_echouee` |
| Empty / search UIs | See appendix capture matrix | Phase 3 targets |
| `app_source: app_client` | Super property via `client.register` | Already OK |
| Staging PostHog | Human confirmed key present | Phase 5 verify |
| LIV-23 / LIV-31 | Notifications / replay | Out of scope |

---

## Conventions (all implementation phases)

- TDD mandatory: failing tests in `__tests__/lib/analytics/` (and component tests if UI hooks) **before** production code.
- New events declared in `AnalyticsEvents` first; never capture outside the catalog.
- Fire-and-forget `track()`; never throw into UX.
- Zero PII in properties (no names, phones, addresses, amounts, raw search queries).
- One capture point per semantic event; dedupe on re-render / focus where needed.
- Prefer pure helpers in `mappers.ts` (+ tests) for screen-name resolution and empty/search classification.
- UI text stays French; event names stay French `snake_case` as today.
- Use `@/lib/logger` — no new `console.log`.

---

## Phase 0 — Preconditions & Linear gate

**Status:** Done (branch from `origin/staging` + this plan).

### Scope

- Branch `edjou/liv-132-client-mobile-implement-screen-navigation-and` exists (from `origin/staging`).
- This plan file exists with Agent rules, Hard gate, checkbox map, and validated decisions.
- Linear scope updated to drop `support_contacte` (human-approved).

### Exit notes

- Branch tip is **`origin/staging`** (`b69cf97`) — human confirmed git base is `staging` (after a brief main trial).
- No application code yet.
- Do **not** start Phase 1 until the human explicitly says so.

### Commit (when human asks to commit Phase 0)

```text
docs(analytics): add screen UX analytics plan for LIV-132 [LIV-132]

Refs LIV-132
```

---

## Phase 1 — Audit instrumentation & screen emissions

**Status:** Done (2026-11-28, Cursor)  
**Goal:** Inventory current PostHog events and what `$screen` actually emits so Phase 2–3 reuse correctly.

### Scope

- List every `track()` call site and map to catalog names.
- Document current autocapture `$screen` behavior (route/component names seen or expected under Expo Router).
- Propose stable screen name table (route → `snake_case` name) covering `app/` screens in use.
- Document equivalents: `action_echouee` → existing failure events; `support_contacte` → unavailable; `quartier_recherche`/`trouve:false` vs new `recherche_sans_resultat`.
- Update this plan’s Context snapshot / tables after human OK.

### Out of scope

- Production code changes (unless human expands).

### Verification

- Human reviewed audit tables (OK 2026-11-28); no tests touched.

### Commit

```text
docs(analytics): audit PostHog screens and UX event gaps [LIV-132]

Refs LIV-132
```

### Exit notes

- Full matrices in [Phase 1 appendix](#phase-1-appendix--audit-2026-11-28).
- `$screen`: autocapture only; local `node_modules` lacked `posthog-react-native` so live Activity strings were not sampled — Phase 2 should disable `captureScreens` if manual `screen()` is used, to avoid doubles.
- Linear audit AC **not** flipped yet (also requires Phase 4 docs finalize).
- Do **not** start Phase 2 until the human explicitly says so.

---

## Phase 2 — Stable `$screen` map + dedupe

**Status:** Done (2026-11-28, Cursor)  
**Goal:** `$screen` fires once per real navigation with stable names; no re-render duplicates.

### Scope

- Implement route → stable name resolver (pure + tests).
- Wire navigation/focus capture; remember last screen name to dedupe.
- If SDK autocapture would double-count, set `captureScreens: false` and own screen capture.
- Confirm `app_source` still present on screen events via existing `register`.

### Out of scope

- New UX custom events (Phase 3); notification/replay work.

### Verification

- Unit tests for resolver + dedupe + `captureScreenTransition` (7 cases) — green.
- `__tests__/lib/analytics` — 37 tests green.
- Staging Activity spot-check deferred to Phase 5.

### Commit

```text
feat(analytics): stable screen names with navigation dedupe [LIV-132]

Refs LIV-132
```

### Exit notes

- Files: `lib/analytics/screenNames.ts`, `useScreenAnalytics.ts`; `AnalyticsProvider` `captureScreens: false`; hook in `app/_layout.tsx`.
- `$screen` uses PostHog `client.screen(name)` → event `$screen` with `$screen_name`; `app_source` still from `register`.
- Do **not** start Phase 3 until the human explicitly says so.

---

## Phase 3 — UX events: empty + search (TDD)

**Status:** Done (2026-11-28, Cursor)  
**Goal:** Add `etat_vide_affiche` and `recherche_sans_resultat` at unique capture points.

### Scope

- Extend `AnalyticsEvents` + `track()` call sites (stock, tarifs, conversations search; empty states as decided in Phase 1 audit).
- Mutual exclusion: active search empty → search event only; no-data / filter empty → empty-state event.
- No raw search string in properties.
- Tests for classification helpers and (where practical) hook/component behavior.

### Out of scope

- `action_echouee`, `support_contacte`, renaming existing failure events.

### Verification

- `npm test` — 600 passed (incl. `emptyUx` + full suite).

### Commit

```text
feat(analytics): track empty states and search with no results [LIV-132]

Refs LIV-132
```

### Exit notes

- Wired: stock, tarifs, courses (`livraison`), conversations, notifications, tarifs_zone, rapports.
- Do **not** start Phase 4 until the human explicitly says so.

---

## Phase 4 — Document catalog, aliases, unavailable

**Status:** Done (2026-11-28, Cursor)  
**Goal:** Living docs match reality for product/insights use.

### Scope

- Update `docs/ANALYTICS_POSTHOG.md`: event count, new events, aliases (`action_echouee` covered), unavailable (`support_contacte`), screen naming, staging key note, PII rules.
- Cross-link from `docs/README.md` if needed.
- Refresh this plan’s Current phase / Exit notes after human OK.

### Verification

- Docs updated; no app behavior change. Human review of `ANALYTICS_POSTHOG.md`.

### Commit

```text
docs(analytics): document screen UX events and aliases [LIV-132]

Refs LIV-132
```

### Exit notes

- Living catalog + aliases + unavailable in `docs/ANALYTICS_POSTHOG.md`; index links plan.
- Linear audit AC may be proposed for flip together with Phase 4 (map: Phase 1 + 4).
- Do **not** start Phase 5 until the human explicitly says so.

---

## Phase 5 — Staging verification checklist

**Status:** Not started  
**Goal:** Satisfy staging AC before treating the issue as ready for production rollout.

### Scope

- Checklist (execute / record results in Exit notes):
  - `$screen` names match the stable map; no duplicate bursts on re-render
  - `recherche_sans_resultat` / `etat_vide_affiche` properties and counts look sane
  - Existing failure events unchanged and still tagged `app_source: app_client`
  - No raw search / PII in new properties
  - Filter by `app_source` — no cross-app confusion in shared project
- Production verification after store/rollout: note as follow-up in Exit notes (AC last clause); do not block code merge if human accepts staging-only for merge.

### Verification

- Human confirms checklist results against PostHog Staging/Development project Activity.

### Commit

```text
docs(analytics): record staging verification for screen UX [LIV-132]

Refs LIV-132
```

---

## Suggested overall PR (when human asks)

**Title:** `feat(analytics): screen navigation and UX analytics [LIV-132]`  
**Base:** `staging`  
**Body (top):** `Fixes LIV-132` (only if human says the issue is finished) or `Refs LIV-132`

---

## Open questions

_None remaining after 2026-11-28 validation._

---

## Phase 1 appendix — audit (2026-11-28)

### A. `track()` call sites → catalog

| Event | Call site(s) |
|---|---|
| `demande_soumise` / `demande_echouee` / `demande_abandonnee` | `resume-produit-en-stock.tsx`, `resume-produit-ramasse.tsx` |
| `connexion_reussie` / `connexion_echouee` | `lib/auth/AuthProvider.tsx` |
| `annulation_demandee` | `annulation.tsx` |
| `ajout_stock_soumis` / `ajout_stock_echoue` | `ajouter-au-stock.tsx` |
| `quartier_recherche` | `useQuartierLookupTracking` (resume screens) |
| `rapport_visualise` / `document_*` | `rapport-pdf-preview.tsx`, `rapports.tsx` |
| `courses_filtrees` | `livraison.tsx` |
| `notification_recue` / `notification_ouverte` | `usePushNotifications.ts` (LIV-23 related — leave as-is) |
| `tarif_zone_consulte` | `tarifs-zone/[zone].tsx` |
| `rapport_scroll` | `rapports.tsx` |
| `conversation_ouverte` | `inbox/[id].tsx` |
| `erreur_api` | `lib/api/client.ts` (5xx) |

### B. Issue-name equivalents

| Name in issue | Verdict |
|---|---|
| `action_echouee` | Do not add — use existing failure events above |
| `support_contacte` | Unavailable (dropped from Linear scope) |
| `quartier_recherche` + `trouve: false` | Keep; tariff expansion signal, not list search |
| `recherche_sans_resultat` | **Add** in Phase 3 |
| `etat_vide_affiche` | **Add** in Phase 3 |

### C. Proposed stable `$screen` names (Phase 2)

| Expo Router path | Stable name |
|---|---|
| `login` | `login` |
| `(tabs)/index` | `accueil` |
| `(tabs)/livraison` | `courses` |
| `(tabs)/tarifs` | `tarifs` |
| `(tabs)/rapports` | `rapports` |
| `(tabs)/stock` | `stock` |
| `(tabs)/inbox` | `conversations` |
| `livraison-detail/[id]` | `livraison_detail` |
| `expedition-detail/[id]` | `expedition_detail` |
| `inbox/[id]` | `conversation_detail` |
| `notifications` | `notifications` |
| `profile` | `profil` |
| `mes-informations` | `mes_informations` |
| `ma-demande-livraison` | `ma_demande_livraison` |
| `ma-demande-expedition` | `ma_demande_expedition` |
| `demande-expedition` | `demande_expedition` |
| `info-produit-en-stock` | `info_produit_en_stock` |
| `info-produit-ramasse` | `info_produit_ramasse` |
| `ajouter-les-produits` | `ajouter_les_produits` |
| `resume-produit-en-stock` | `resume_produit_en_stock` |
| `resume-produit-ramasse` | `resume_produit_ramasse` |
| `confirmee` | `confirmee` |
| `ajouter-au-stock` | `ajouter_au_stock` |
| `confirmation-ajout-stock` | `confirmation_ajout_stock` |
| `annulation` | `annulation` |
| `annulation-confirmee` | `annulation_confirmee` |
| `tarifs-zone/[zone]` | `tarifs_zone` |
| `rapport-pdf-preview` | `rapport_pdf_preview` |

Strip dynamic segments (`[id]`, `[zone]`) before lookup; unknown routes → normalized path `snake_case` fallback (no raw IDs).

### D. Phase 3 capture matrix (empty / search)

| Surface | Condition | Event | Properties |
|---|---|---|---|
| Stock | Empty catalog, no query | `etat_vide_affiche` | `ecran: stock`, `motif: liste_vide` |
| Stock | Active search, 0 hits | `recherche_sans_resultat` | `contexte: stock` |
| Tarifs | Catalog empty | `etat_vide_affiche` | `ecran: tarifs`, `motif: liste_vide` |
| Tarifs | Active search, 0 hits | `recherche_sans_resultat` | `contexte: tarifs` |
| Courses | No orders | `etat_vide_affiche` | `ecran: courses`, `motif: liste_vide` |
| Courses | Filtered empty | `etat_vide_affiche` | `ecran: courses`, `motif: filtre` |
| Conversations | Empty list | `etat_vide_affiche` | `ecran: conversations`, `motif: liste_vide` |
| Conversations | Filter-only empty | `etat_vide_affiche` | `ecran: conversations`, `motif: filtre` |
| Conversations | Active search, 0 hits | `recherche_sans_resultat` | `contexte: conversations` |
| Notifications | Empty | `etat_vide_affiche` | `ecran: notifications`, `motif: liste_vide` |
| Tarifs zone | No quartiers | `etat_vide_affiche` | `ecran: tarifs_zone`, `motif: liste_vide` |
| Rapports | Period empty | `etat_vide_affiche` | `ecran: rapports`, `motif: filtre` |

Mutual exclusion: if active free-text search yields empty UI → fire **only** `recherche_sans_resultat` (never both). No raw query in properties.
