# OpenClaw Fork — feature/project-agent-flows

## What This Is

This is Hein Tonny Køien's fork of the OpenClaw autonomous agent platform, working branch `feature/project-agent-flows`. The goal of this branch is to implement a full **project-agent workflow system**: a structured pipeline where autonomous agents plan, implement, review, and learn from tasks tracked in a SQLite-backed issue backlog.

## Goals

1. **Schema v2** — SQLite issues table with approval flow columns (`project_id`, `batch_id`, `requires_approval`, `touches_json`, `approved_at`, `started_at`, `closed_at`). Timestamps as Unix ms integers.
2. **Approval workflow** — Status enum: `open → approved → in_progress → done / rejected`. Issues marked `requires_approval = 1` stay in `open` until a human approves them.
3. **Orchestrator dispatch** — `openclaw issues dispatch` picks approved/open issues, assigns batch IDs, and spawns agent sessions.
4. **Agent templates** — Standardized AGENT.md templates for orchestrator, dev, QA, reviewer, deep-planner, and self-improve roles. Located in `.openclaw/agents/`.
5. **Project CLI** — `openclaw project add` with positional path shorthand and cron output.
6. **Test coverage** — All new schema and CLI changes covered by Vitest tests.

## Stack

- **Runtime:** Node.js 22+, TypeScript (tsdown bundler)
- **Database:** SQLite via `node:sqlite` (Node.js built-in, no better-sqlite3 dep)
- **CLI:** Commander.js
- **Tests:** Vitest (co-located `.test.ts` files)
- **Agent runtime:** OpenClaw sessions (Claude Code subagents)

## Key Files

| Path                        | Purpose                                     |
| --------------------------- | ------------------------------------------- |
| `src/backlog/db.ts`         | SQLite schema, migrations, CRUD             |
| `src/backlog/types.ts`      | Issue, SelfImproveEntry, ExecutionRun types |
| `src/cli/backlog-cli.ts`    | `openclaw issues` subcommands               |
| `src/cli/project-cli.ts`    | `openclaw project` subcommands              |
| `.openclaw/agents/`         | Agent role AGENT.md templates               |
| `.openclaw/GAP-ANALYSIS.md` | Gap analysis vs spec, 30 identified gaps    |
| `.openclaw/BUILD-PLAN.md`   | Original phase build plan                   |

## Architecture Decisions

- **TEXT timestamps rejected** — migrated to INTEGER Unix ms for consistency with spec and easier arithmetic. ISO strings are still accepted on input (auto-converted).
- **Status enum** — Using spec enum (`open/approved/in_progress/blocked/done/rejected`) with legacy aliases for backward compatibility (`notStarted`, `inProgress`, `inReview`, `cancelled` still accepted but deprecated).
- **requires_approval** — INTEGER 0/1 (not boolean) to match SQLite convention. CLI accepts `--requires-approval` flag (boolean).
- **Orchestrator dispatch** — Implemented as a planning skeleton (`openclaw issues dispatch`). Actual `sessions_spawn` integration is Phase 2.
- **Agent templates** — 6 core roles implemented: orchestrator, dev, qa, reviewer, deep-planner, selfimprove. Templates are in `.openclaw/agents/` and should be customized per project.

## Current Status (2026-04-04)

- Schema v2 implemented with migration code
- All v2 columns added: `project_id`, `batch_id`, `requires_approval`, `touches_json`, `started_at`, `closed_at`, `approved_at`
- CLI updated: `issues add/list/update/status/dispatch` with new flags
- Agent templates created: 6 roles
- Tests updated and passing
- 25+ gaps remaining from GAP-ANALYSIS.md (web UI, native bridge, full orchestrator)

## Constraints

- Do not commit secrets or credentials
- Keep backward compatibility for existing project.sqlite databases (migration code handles upgrades)
- Tests must pass before marking any issue done
- SOUL.md and AGENTS.md require human sign-off before modification
