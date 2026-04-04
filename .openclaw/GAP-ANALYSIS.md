# Gap Analysis: feature/project-agent-flows vs Spec Docs

**Date:** 2026-04-04
**Analyst:** Claude Sonnet 4.6 (automated deep-dive)
**Spec source:** /opt/docs/openclaw/ (14 HTML files, updated 2026-04-01)
**Implementation branch:** feature/project-agent-flows

---

## Executive Summary

The implementation has strong foundations: the SQLite schema and CLI plumbing work end-to-end (`openclaw issues init/add/list/update/status/export/migrate`), the web UI navigation and issues/projects views are structurally in place, and the gateway RPC handlers are wired up. However, there are **30 distinct gaps** between the spec and the implementation.

The gaps fall into four severity tiers:

- **Critical (2):** Status enum mismatch breaks the approval workflow; orchestrator is entirely absent.
- **High (9):** Missing schema columns, execution_runs bridge, registry fields, init gaps, agent templates, batch CLI, native bridge.
- **Medium (13):** Timestamp type decision, selfimprove schema cleanup, export completeness, CLI flag gaps, web UI pipeline tab, docs inconsistencies.
- **Low (6):** Complexity casing, selfimprove categories, project add UX, analytics UI, index coverage, docs cleanup.

**Key decision point for Hein:** Several gaps require choosing between updating the docs to match the implementation vs. extending the implementation to match the spec. These are flagged `requires-approval`.

---

## Gap Table

| ID          | Title                                                                                                                                       | Doc-Wrong or Code-Wrong                                                      | Severity | Complexity | Labels                       | Requires Approval |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------- | ---------- | ---------------------------- | :---------------: |
| TASK-763659 | Schema: docs use task_id PK but impl uses issue_id                                                                                          | **docs-wrong** — issue_id is the newer correct name                          | high     | s          | docs, schema                 |        No         |
| TASK-793021 | Status enum mismatch: spec has open/approved/in_progress/rejected; impl has notStarted/inProgress/inReview/cancelled                        | **ambiguous** — approved state missing from impl, approval workflow absent   | critical | m          | schema                       |        Yes        |
| TASK-775613 | issues table missing project_id, batch_id, requires_approval, touches_json, approved_at, blocked_reason, started_at, closed_at, agent_notes | **code-wrong OR docs-wrong** — depends on scope decision                     | high     | l          | schema                       |        Yes        |
| TASK-783562 | Timestamp type: spec=INTEGER Unix ms, impl=TEXT ISO strings                                                                                 | **ambiguous** — impl TEXT is arguably better for git-readability             | high     | m          | schema                       |        Yes        |
| TASK-804374 | execution_runs missing run_id PK, project_id, native_label, native_status, spawned_at, terminal_summary                                     | **code-wrong** — native bridge requires these columns                        | high     | m          | schema, orchestrator         |        No         |
| TASK-813262 | selfimprove table: spec uses entry_id UUID PK, impl uses INTEGER AUTOINCREMENT                                                              | **ambiguous** — impl is simpler but loses deduplication                      | medium   | s          | schema, selfimprove          |        No         |
| TASK-822885 | Registry projects table missing display_name, repo_url, sqlite_path, last_seen_at, config_json                                              | **code-wrong** — web dashboard needs sqlite_path                             | high     | m          | schema, registry, web-ui     |        No         |
| TASK-831322 | Orchestrator: src/orchestrator/ directory and 7-step pipeline entirely absent                                                               | **code-wrong** — core missing feature                                        | critical | xl         | orchestrator                 |        Yes        |
| TASK-840563 | init: no .openclaw/agents/ tree with AGENT.md templates                                                                                     | **code-wrong**                                                               | high     | m          | init, agents, directory-spec |        No         |
| TASK-851001 | init: no CODEBASE.md, CODESTYLE.md, SELFIMPROVE.md, ADL.json generated                                                                      | **code-wrong**                                                               | medium   | s          | init, directory-spec         |        No         |
| TASK-857953 | issues add missing --category and --requires-approval flags                                                                                 | **code-wrong** (blocked by TASK-775613)                                      | medium   | s          | cli, schema                  |        No         |
| TASK-866282 | issues update missing --agent-notes and --closed-reason flags                                                                               | **code-wrong** (blocked by TASK-775613)                                      | medium   | s          | cli, schema                  |        No         |
| TASK-876155 | issues batch plan and batch start not implemented                                                                                           | **code-wrong**                                                               | high     | m          | cli, orchestrator            |        No         |
| TASK-883339 | issues run status not implemented                                                                                                           | **code-wrong**                                                               | medium   | s          | cli, orchestrator            |        No         |
| TASK-889633 | issues deps add not implemented                                                                                                             | **code-wrong**                                                               | medium   | xs         | cli                          |        No         |
| TASK-897744 | project add requires --name and --repo-path flags instead of positional path                                                                | **code-wrong**                                                               | low      | xs         | cli                          |        No         |
| TASK-906420 | selfimprove categories: spec has bug_class/optimization, impl has process (4 vs 5 differ)                                                   | **ambiguous** — selfimprove.html shows impl-centric model                    | low      | xs         | cli, schema, selfimprove     |        No         |
| TASK-914061 | Complexity casing: spec uppercase S/M/L/XL, impl lowercase xs/s/m/l/xl                                                                      | **docs-wrong** — impl lowercase + xs is the better convention                | low      | xs         | schema, docs                 |        No         |
| TASK-920988 | Missing PRAGMA busy_timeout=5000 in db initialization                                                                                       | **code-wrong**                                                               | medium   | xs         | schema, correctness          |        No         |
| TASK-927935 | Missing recommended indexes (severity, project_status, batch, deps reverse, label, runs_status, selfimprove_category/applied)               | **code-wrong**                                                               | low      | xs         | schema, performance          |        No         |
| TASK-935805 | Export: no dependencies.md, SELFIMPROVE.md not written to .openclaw/ root                                                                   | **code-wrong**                                                               | medium   | s          | export, directory-spec       |        No         |
| TASK-943550 | Web UI: pipeline tab exists in nav but no view/controller implemented                                                                       | **code-wrong**                                                               | medium   | l          | web-ui                       |        No         |
| TASK-953231 | Web UI: selfimprove analytics section not implemented                                                                                       | **code-wrong**                                                               | low      | l          | web-ui, selfimprove          |        No         |
| TASK-962848 | Docs: 14 spec HTML files hardcode task_id in SQL — update to issue_id throughout                                                            | **docs-wrong**                                                               | medium   | m          | docs                         |        No         |
| TASK-977246 | Docs: wrong branch name (feature/clawforge-issues vs feature/project-agent-flows)                                                           | **docs-wrong**                                                               | low      | xs         | docs                         |        No         |
| TASK-986881 | Docs: selfimprove.html contradicts schema.html data model                                                                                   | **docs-wrong** — selfimprove.html reflects reality, schema.html needs update | medium   | s          | docs, selfimprove            |        No         |
| TASK-003563 | init: no .gitignore for _.sqlite_ files generated                                                                                           | **code-wrong**                                                               | medium   | xs         | init, directory-spec         |        No         |
| TASK-015420 | 13 agent AGENT.md role templates need to be created and updated                                                                             | **code-wrong**                                                               | high     | l          | agents                       |        Yes        |
| TASK-025012 | init does not auto-register project in global registry                                                                                      | **code-wrong**                                                               | medium   | xs         | init, cli, registry          |        No         |
| TASK-033601 | Native bridge for singleton check (openclaw tasks list integration) absent                                                                  | **code-wrong**                                                               | high     | m          | orchestrator, schema         |        No         |

_(Note: TASK-869932 "Issues page UI refresh — readability and column alignment" was a pre-existing issue already in the DB.)_

---

## Root Cause Analysis

### Why so many schema gaps?

The spec and implementation evolved in parallel during a short sprint (2026-03-29 → 2026-04-01). The spec was finalized after the Go CLI was superseded by the fork approach, and the implementation leaned toward a simpler/leaner schema. The "correct" schema is probably a merge: keep the impl's TEXT timestamps and lowercase complexity, but add the missing functional columns (project_id, native_label, approved status, etc.).

### Why is the orchestrator absent?

The orchestrator is an agent-level concern, not a library. It runs as an OpenClaw session, not as importable TypeScript code. Phase 2 (agent migration) was out of scope for the initial Phase 1 implementation sprint.

---

## Recommended Execution Order

### Stage 1: Schema decisions (needs Hein sign-off first)

These three gaps require a decision before any code can be written for them:

1. **TASK-793021** — Pick the status enum. Recommendation: keep impl enum (notStarted/inProgress/inReview/blocked/done/cancelled) but add `approved` state for the approval workflow. Drop `rejected` (use `cancelled`). Update docs.
2. **TASK-783562** — Pick timestamp type. Recommendation: stay with TEXT/ISO (human-readable, git-friendly). Update docs.
3. **TASK-775613** — Decide which missing columns to add. Recommendation: add `project_id`, `batch_id`, `requires_approval`, `agent_notes`, `started_at`, `closed_at`, `closed_reason`. Skip `approved_at/approved_by/blocked_reason/created_by/source/category/touches_json` as the impl's `labels` covers `touches_json` already.

### Stage 2: Quick wins (no approval needed, unblock further work)

These are small, clear, immediately implementable:

4. **TASK-920988** — Add PRAGMA busy_timeout=5000
5. **TASK-927935** — Add missing indexes
6. **TASK-003563** — Generate .gitignore in init
7. **TASK-025012** — Auto-register in init
8. **TASK-897744** — Fix project add positional path
9. **TASK-889633** — Add deps add CLI

### Stage 3: Schema extensions (unblocks other gaps)

10. **TASK-804374** — Add native_label etc. to execution_runs
11. **TASK-822885** — Extend registry projects table
12. **TASK-813262** — Align selfimprove table (add applied_at, decide entry_id approach)

### Stage 4: CLI completions

13. **TASK-876155** — batch plan + batch start
14. **TASK-883339** — run status
15. **TASK-866282** — update --agent-notes / --closed-reason
16. **TASK-857953** — add --category / --requires-approval
17. **TASK-935805** — export dependencies.md + root SELFIMPROVE.md

### Stage 5: Init completions

18. **TASK-851001** — Generate CODEBASE.md, CODESTYLE.md, SELFIMPROVE.md, ADL.json
19. **TASK-840563** — Generate agents/ directory with AGENT.md templates

### Stage 6: Docs sync (can run in parallel with Stage 5)

20. **TASK-763659** + **TASK-962848** — issue_id rename throughout docs
21. **TASK-977246** — Branch name update in docs
22. **TASK-986881** — Reconcile selfimprove.html vs schema.html
23. **TASK-914061** — Complexity casing in docs
24. **TASK-906420** — selfimprove categories alignment

### Stage 7: Orchestrator (biggest ticket, needs design doc)

25. **TASK-033601** — Native bridge (singleton check utility)
26. **TASK-831322** — Full 7-step orchestrator implementation

### Stage 8: Agent templates

27. **TASK-015420** — 13 AGENT.md role templates

### Stage 9: Web UI

28. **TASK-943550** — Pipeline tab
29. **TASK-953231** — Selfimprove analytics

---

## Items Requiring Hein's Input

| Task        | Question                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------- |
| TASK-793021 | Keep impl status enum and add `approved` state, or adopt spec enum?                       |
| TASK-775613 | Which subset of missing columns to actually add?                                          |
| TASK-783562 | Stay with TEXT/ISO timestamps (update docs) or migrate to INTEGER/Unix ms (update code)?  |
| TASK-831322 | Orchestrator design: cron-triggered session? Which agent runtime first (subagent vs acp)? |
| TASK-015420 | Agent template scope: create all 13 roles or just orchestrator/dev/qa to start?           |

---

## Additional Gaps Found (Not in Known List)

The following gaps were found beyond the known list provided in the task brief:

- **TASK-025012:** init does not auto-register in global registry (spec says it should)
- **TASK-003563:** No .gitignore for SQLite files generated by init
- **TASK-033601:** No native bridge implementation for singleton check
- **TASK-962848:** Docs-wide task_id rename needed across all 14 HTML files
- **TASK-977246:** Wrong branch name in docs (clawforge-issues vs project-agent-flows)
- **TASK-986881:** selfimprove.html contradicts schema.html (two conflicting specs for same table)
- **TASK-914061:** Complexity casing mismatch (spec uppercase vs impl lowercase)
- **TASK-822885:** Registry schema much leaner than spec (missing sqlite_path blocks web UI)
- **TASK-813262:** selfimprove entry_id/UUID approach never implemented
