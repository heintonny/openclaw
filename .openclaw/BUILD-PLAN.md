# Build Plan: Project Agent Flows

## Branch: feature/project-agent-flows

## Goal: Add `openclaw backlog`, `openclaw project`, `openclaw selfimprove` subcommands

## Phase 1: Foundation (Tonight)

### TASK-001: SQLite Schema + Database Module

**Status:** notStarted
**Files:**

- `src/backlog/schema.ts` — Table definitions, migrations, WAL setup
- `src/backlog/db.ts` — Database open/close, ATTACH support, connection pool
- `src/backlog/types.ts` — TypeScript types for all tables
- `src/backlog/db.test.ts` — Unit tests
  **Acceptance:**
- Creates `.openclaw/project.sqlite` with tables: backlog, dependencies, execution_runs, selfimprove
- WAL mode enabled
- All types exported
- Tests pass

### TASK-002: Project Registry

**Status:** notStarted
**Depends on:** TASK-001
**Files:**

- `src/backlog/registry.ts` — Global project registry (SQLite in ~/.openclaw/)
- `src/backlog/registry.test.ts` — Unit tests
  **Acceptance:**
- Register/unregister/list projects
- Multi-repo support (project → [repo_path, ...])
- Cross-repo lookup by project name

### TASK-003: CLI — `openclaw backlog` subcommand

**Status:** notStarted
**Depends on:** TASK-001
**Files:**

- `src/cli/backlog-cli.ts` — Commander.js subcommand registration
- `src/cli/program/register.backlog.ts` — Lazy loader
- Update `src/cli/program/subcli-descriptors.ts` — Add entry
- Update `src/cli/program/register.subclis.ts` — Add entry
  **Subcommands:**
- `openclaw backlog init` — Create .openclaw/ directory + project.sqlite
- `openclaw backlog add` — Add task
- `openclaw backlog list` — List/filter tasks (--status, --severity, --json)
- `openclaw backlog update` — Update task fields
- `openclaw backlog status` — Dashboard summary
  **Acceptance:**
- All subcommands work from CLI
- JSON output mode
- Tests pass

### TASK-004: CLI — `openclaw project` subcommand

**Status:** notStarted
**Depends on:** TASK-002
**Files:**

- `src/cli/project-cli.ts`
- `src/cli/program/register.project.ts`
- Update subcli-descriptors.ts + register.subclis.ts
  **Subcommands:**
- `openclaw project list` — List all registered projects
- `openclaw project add` — Register a repo to a project
- `openclaw project status` — Aggregate stats
  **Acceptance:**
- Multi-repo project registration works
- Tests pass

### TASK-005: CLI — `openclaw selfimprove` subcommand

**Status:** notStarted
**Depends on:** TASK-001
**Files:**

- `src/cli/selfimprove-cli.ts`
- `src/cli/program/register.selfimprove.ts`
- Update subcli-descriptors.ts + register.subclis.ts
  **Subcommands:**
- `openclaw selfimprove add` — Record a lesson
- `openclaw selfimprove list` — List entries (--project, --scope, --severity)
  **Acceptance:**
- Entries persisted in project.sqlite
- Tests pass

### TASK-006: Backlog Dependencies + Batch Planning

**Status:** notStarted
**Depends on:** TASK-003
**Files:**

- `src/backlog/deps.ts` — Dependency graph, cycle detection, topological sort
- `src/backlog/batch.ts` — Batch planner (find ready tasks respecting deps)
- `src/backlog/deps.test.ts`
- `src/backlog/batch.test.ts`
- Add `openclaw backlog deps add/remove/list` subcommands
- Add `openclaw backlog batch plan/start` subcommands
  **Acceptance:**
- Cycle detection prevents invalid deps
- Batch planner returns dependency-resolved task list
- Tests pass

### TASK-007: Export + Migrate

**Status:** notStarted
**Depends on:** TASK-003
**Files:**

- `src/backlog/export.ts` — SQLite → Markdown export
- `src/backlog/migrate.ts` — TASKS.json → SQLite migration
- Add `openclaw backlog export` and `openclaw backlog migrate` subcommands
  **Acceptance:**
- Export generates readable .openclaw/export/backlog.md
- Migrate ingests existing TASKS.json files
- Tests pass

## Phase 2: Integration (Tomorrow+)

### TASK-008: Gateway RPC Methods

### TASK-009: Web UI — Projects Tab

### TASK-010: Web UI — Backlog Tab

### TASK-011: Web UI — Pipeline Tab

### TASK-012: Orchestrator Integration

## Conventions

- Follow OpenClaw code style (check existing files for patterns)
- Co-located tests (_.test.ts next to _.ts)
- Vitest for testing
- Use better-sqlite3 (already a dependency)
- Conventional commits: feat(backlog): ..., test(backlog): ...
