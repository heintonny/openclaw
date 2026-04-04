# Issues

> Generated 2026-04-04T12:50:45.323Z — do not edit manually

## Summary

| Status     | Count  |
| ---------- | ------ |
| notStarted | 31     |
| **Total**  | **31** |

## notStarted (31)

### TASK-763659: Schema: docs use task_id PK but impl uses issue_id — update docs

- **Severity:** high | **Complexity:** s
- **Labels:** docs, schema

The spec docs (schema.html) define the issues table with 'task_id TEXT PRIMARY KEY'. The implementation uses 'issue_id TEXT PRIMARY KEY'. Per Hein, issue_id is the correct newer name. All spec docs (schema.html, orchestrator.html, data-access.html) need to be updated to use issue_id instead of task_id as the primary key column name. This is a docs-wrong gap.

### TASK-775613: Schema: issues table missing project_id, batch_id, requires_approval, touches_json columns

- **Severity:** high | **Complexity:** l
- **Labels:** schema, requires-approval

The spec (schema.html) defines these columns on the issues table that are absent from the implementation in src/backlog/db.ts: project_id (NOT NULL), batch_id (TEXT), requires_approval (INTEGER DEFAULT 0), approved_at/approved_by (INTEGER/TEXT), blocked_reason (TEXT), created_by (TEXT), started_at (INTEGER), closed_at/closed_reason (INTEGER/TEXT), agent_notes (TEXT), touches_json (TEXT). The implementation uses 'labels' (JSON array) as a rough substitute for touches_json, but the richer metadata columns are missing. Decision needed: implement full spec or keep the leaner impl schema? Labels 'requires-approval' because scope of change is significant.

### TASK-783562: Schema: timestamp type mismatch — spec uses INTEGER (Unix ms), impl uses TEXT (ISO strings)

- **Severity:** high | **Complexity:** m
- **Labels:** schema, requires-approval

The spec defines all timestamps as INTEGER (Unix milliseconds: unixepoch() \* 1000). The implementation uses TEXT (ISO 8601 datetime strings). The implementation applies consistent TEXT timestamps throughout db.ts. The spec queries use datetime(col/1000, 'unixepoch') which would break on the current TEXT schema. Decision: standardize on one approach. The TEXT/ISO approach is arguably more human-readable and git-friendly; the spec may need updating to match. Labels 'requires-approval' since this is a cross-cutting schema decision.

### TASK-793021: Schema: status enum mismatch — spec: open/approved/in_progress/blocked/done/rejected vs impl: notStarted/inProgress/blocked/done

- **Severity:** critical | **Complexity:** m
- **Labels:** schema, requires-approval

The spec defines the status CHECK constraint as: open, approved, in_progress, blocked, done, rejected. The implementation uses: notStarted, inProgress, inReview, blocked, done, cancelled. Key functional differences: (1) 'approved' state is missing from impl — agents cannot gate tasks behind human approval. (2) 'rejected' is replaced by 'cancelled'. (3) 'inReview' exists in impl but not spec. (4) The approval workflow (open→approved→in_progress) is entirely absent. The migrate.ts maps old statuses to the impl enum. Decision: Either update spec to match impl (leaner approval model) or add the approved/rejected states to impl. Labels 'requires-approval'.

### TASK-804374: Schema: execution_runs table missing run_id PK, project_id, native_label, native_status, spawned_at, terminal_summary

- **Severity:** high | **Complexity:** m
- **Labels:** schema, orchestrator

The spec defines execution_runs with: run_id TEXT PK (UUID), project_id TEXT NOT NULL, native_label TEXT NOT NULL, spawned_at INTEGER PK, native_status TEXT, terminal_summary TEXT. The implementation uses: id INTEGER AUTOINCREMENT, session_key TEXT, label TEXT, status TEXT, started_at TEXT, no native_label/native_status/terminal_summary/project_id/spawned_at. The native_label column is critical for the OpenClaw-native bridge pattern (label format: {project_id}/{task_id}). Without it, the orchestrator cannot query native task_runs to sync execution status back. This is a code-wrong gap and needs implementation.

### TASK-813262: Schema: selfimprove table schema divergence — spec uses entry_id UUID PK, impl uses INTEGER AUTOINCREMENT

- **Severity:** medium | **Complexity:** s
- **Labels:** schema, selfimprove

The spec defines selfimprove with: entry_id TEXT PRIMARY KEY (UUID), source_task_id TEXT, source_agent TEXT, applied_at INTEGER. The implementation uses: id INTEGER AUTOINCREMENT, task_id TEXT, agent_role TEXT, tags TEXT, scope TEXT. Functional differences: (1) No UUID-based entry_id in impl (makes cross-project deduplication harder). (2) spec has 'bug_class' and 'optimization' categories; impl does not. (3) impl has 'scope' (project/global) and 'tags' fields not in spec. (4) 'applied_at' timestamp is absent from impl. The spec also does not have 'process' as a category but impl does. Docs may need updating for tags/scope fields.

### TASK-822885: Schema: global registry table missing display_name, repo_url, sqlite_path, last_seen_at, config_json columns

- **Severity:** high | **Complexity:** m
- **Labels:** schema, registry, web-ui

The spec defines the projects table with: project_id, display_name, repo_path, repo_url, sqlite_path, created_at, last_seen_at, config_json. The implementation in src/backlog/registry.ts has a much leaner schema: project_id, repo_path, registered_at (as composite PK). Missing: display_name, repo_url, sqlite_path (which the web dashboard needs), last_seen_at, config_json. The web UI's projects view relies on sqlite_path to open per-repo databases. This is a code-wrong gap.

### TASK-831322: Orchestrator: src/orchestrator/ directory and implementation entirely absent

- **Severity:** critical | **Complexity:** xl
- **Labels:** orchestrator, requires-approval

The spec (orchestrator.html, architecture.html) defines a full 7-step orchestrator pipeline: (1) Singleton idle-bounce check via openclaw tasks list, (2) Query issues SQLite, (3) Pick batch of up to 3 unblocked tasks, (4) Spawn agents with sessions_spawn using label convention {project_id}/{task_id}, (5) Register execution_runs, (6) sessions_yield, (7) Sync native status back from task_runs. The src/orchestrator/ directory does not exist. This is the core value proposition of the extension and is entirely unimplemented. Requires designing the orchestrator as an OpenClaw session/agent that can be invoked via cron.

### TASK-840563: init: does not generate .openclaw/agents/ directory tree with AGENT.md templates

- **Severity:** high | **Complexity:** m
- **Labels:** init, agents, directory-spec

The directory spec (directory-spec.html) requires the init command to create: .openclaw/agents/orchestrator/AGENT.md, .openclaw/agents/dev/AGENT.md, .openclaw/agents/qa/AGENT.md. Currently initProjectDirectory() in db.ts only creates .openclaw/ and writes a minimal PROJECT.md. No agents/ subdirectory or AGENT.md templates are generated. Without these, newly spawned agents have no role-specific instructions injected.

### TASK-851001: init: does not generate CODEBASE.md, CODESTYLE.md, SELFIMPROVE.md, ADL.json

- **Severity:** medium | **Complexity:** s
- **Labels:** init, directory-spec

Per directory-spec.html, the .openclaw/ init should create: CODEBASE.md (codebase overview for dev agent), CODESTYLE.md (style rules and conventions), SELFIMPROVE.md (human-readable selfimprove export), ADL.json (optional architecture decision log). Currently only PROJECT.md is generated. These files are critical context files that agents read before starting work. SELFIMPROVE.md should also be regenerated by 'openclaw issues export'.

### TASK-857953: CLI: openclaw issues add missing --category and --requires-approval flags

- **Severity:** medium | **Complexity:** s
- **Labels:** cli, schema

The CLI spec (cli.html) defines 'openclaw issues add' with these flags: --category (e.g. bug, feature), --requires-approval (boolean, starts task as open not approved). The implementation in src/cli/backlog-cli.ts does not expose --category or --requires-approval flags. The --requires-approval flag is needed for the approval workflow. The --category flag supports filtering by work type. Both map to missing columns in the current schema (related to GAP-002).

### TASK-866282: CLI: openclaw issues update missing --agent-notes and --closed-reason flags

- **Severity:** medium | **Complexity:** s
- **Labels:** cli, schema

The CLI spec defines 'openclaw issues update' with: --agent-notes (append notes from an agent run), --closed-reason (required when setting status to done/rejected). The current update command in backlog-cli.ts only supports --status, --severity, --complexity, --title. The --agent-notes flag maps to the missing agent_notes column. The --closed-reason flag maps to the missing closed_reason column. These are important for the agent workflow: after completing a task, the agent should record its summary via --agent-notes.

### TASK-869932: Issues page UI refresh — readability and column alignment

- **Severity:** medium | **Complexity:** m
- **Labels:** ui, issues-view, ux

The Issues table at clawd.jawk.ai/issues has readability problems and column header misalignment:

1. Column headers (ID, Project, Title, Status, Severity, Complexity) do not align with their cell content — likely due to fixed widths not matching actual content width
2. Overall readability is low: row density is too high, text truncation aggressive, status badges and severity chips compete visually
3. Proposed improvements:
   - Fix column header alignment (use flex/grid with consistent column sizing)
   - Increase row height or add padding for breathing room
   - Make Title column wider (it is the primary content)
   - Improve truncation with ellipsis + tooltip on hover
   - Better visual hierarchy: ID de-emphasised, Title prominent
   - Consider sticky header when scrolling long issue lists
   - Ensure status dropdown and severity badge widths are consistent across rows

Reference: screenshot shared in #orchestration 2026-04-04

### TASK-876155: CLI: openclaw issues batch plan and batch start subcommands not implemented

- **Severity:** high | **Complexity:** m
- **Labels:** cli, orchestrator

The CLI spec defines: 'openclaw issues batch plan [--limit 3]' (show next unblocked tasks by priority) and 'openclaw issues batch start <task-id...>' (marks tasks as in_progress and creates execution_runs). Neither exists in the current backlog-cli.ts. The planBatch() function exists in src/backlog/deps.ts (used in gateway), but no CLI wrapper. 'batch start' is especially critical for the orchestrator workflow: it atomically transitions tasks to in_progress and records execution_runs.

### TASK-883339: CLI: openclaw issues run status subcommand not implemented

- **Severity:** medium | **Complexity:** s
- **Labels:** cli, orchestrator

The CLI spec defines 'openclaw issues run status' which shows running agents by bridging to OpenClaw's native 'openclaw tasks list'. The current CLI has no 'run' subcommand group. This command is used by the orchestrator singleton check and provides visibility into active agent executions. It should query the native runs.sqlite (READ-ONLY) and cross-reference with execution_runs to show which issues have active agents.

### TASK-889633: CLI: openclaw issues deps add subcommand not implemented

- **Severity:** medium | **Complexity:** xs
- **Labels:** cli

The CLI spec defines 'openclaw issues deps add <task-id> --depends-on <other-id>'. No 'deps' subcommand group exists in backlog-cli.ts. Dependencies can currently only be added programmatically or via migration. Human operators and agents need a CLI to manage the dependency graph directly. The DB layer (db.ts addDependency) already supports this — just needs CLI wiring.

### TASK-897744: CLI: openclaw project add should accept positional path without --name and --repo-path flags

- **Severity:** low | **Complexity:** xs
- **Labels:** cli

The CLI spec defines 'openclaw project add <path>' as a simple positional argument (e.g. 'openclaw project add .'). The implementation requires both --name and --repo-path as named options, making it verbose. The spec intends the command to be terse: 'openclaw project add .' should auto-derive the project name from the directory and register the current path. The current flag-based approach is spec-divergent and makes migration flows awkward.

### TASK-906420: CLI: selfimprove add missing --category values bug_class, optimization (spec has 5, impl has 4)

- **Severity:** low | **Complexity:** xs
- **Labels:** cli, schema, selfimprove

The spec (schema.html selfimprove table) defines 5 categories: pattern, antipattern, lesson, optimization, bug_class. The implementation (types.ts) defines 4: lesson, pattern, anti_pattern, process. Mismatches: (1) 'optimization' category is in spec but not impl. (2) 'bug_class' is in spec but not impl. (3) 'process' is in impl but not spec. (4) 'anti_pattern' uses underscore in impl but 'antipattern' in spec. The CLI add command and selfimprove.ts need to align. The selfimprove.html shows the impl-centric categories (anti_pattern, process) so that doc may be the 'authoritative' version.

### TASK-914061: CLI: complexity values uppercase in spec (S/M/L/XL) but lowercase in impl (xs/s/m/l/xl)

- **Severity:** low | **Complexity:** xs
- **Labels:** schema, docs

The spec defines complexity as: S, M, L, XL. The implementation uses: xs, s, m, l, xl (lowercase, with an extra 'xs' size). The CLI help text and DB defaults use lowercase. The spec's SQL CHECK constraint uses uppercase. This creates a mismatch if anyone uses the spec queries directly against the impl DB. Decision: pick one canonical casing. The impl's 'xs' size is a valid addition not in spec. The docs need to be updated to reflect lowercase + xs, or the impl should be changed to uppercase.

### TASK-920988: Schema: missing PRAGMA busy_timeout=5000 in db initialization

- **Severity:** medium | **Complexity:** xs
- **Labels:** schema, correctness

The spec initialization SQL includes 'PRAGMA busy_timeout=5000;' to prevent agents from crashing when they hit a locked database. The implementation in db.ts only sets 'PRAGMA journal_mode=WAL'. Under concurrent agent load (multiple agents reading/writing simultaneously), missing busy_timeout can cause 'SQLITE_BUSY' errors. This is a one-line fix but has real correctness implications in multi-agent scenarios.

### TASK-927935: Schema: missing recommended indexes (idx_issues_severity, idx_issues_project_status, idx_issues_batch, etc.)

- **Severity:** low | **Complexity:** xs
- **Labels:** schema, performance

The spec lists 10 recommended indexes. The implementation creates only 4: idx_issues_status, idx_issues_external, idx_execution_runs_task_id, idx_selfimprove_task_id. Missing indexes: idx_issues_severity, idx_issues_project_status (for project_id+status queries), idx_issues_batch (for batch_id lookups), idx_deps_depends_on (reverse dep lookup), idx_runs_label (for native bridge queries), idx_runs_status, idx_selfimprove_category, idx_selfimprove_applied. Performance impact on large issue sets.

### TASK-935805: Export: issues export does not generate dependencies.md, and does not update SELFIMPROVE.md in root

- **Severity:** medium | **Complexity:** s
- **Labels:** export, directory-spec

The spec (directory-spec.html) and CLI spec define 'openclaw issues export' as writing to: .openclaw/export/issues.md, .openclaw/export/dependencies.md, .openclaw/export/selfimprove.md. The current export.ts exports issues.md and selfimprove.md but there is no dedicated dependencies.md export. Additionally the spec's SELFIMPROVE.md lives at .openclaw/SELFIMPROVE.md (root of .openclaw, not in export/), serving as a fallback for agents when SQLite is unavailable. Currently only .openclaw/export/selfimprove.md is created.

### TASK-943550: Web UI: pipeline tab not implemented (spec: issues batch plan + live agent status view)

- **Severity:** medium | **Complexity:** l
- **Labels:** web-ui

The spec (web-ui.html) defines a 'pipeline' tab in the PROJECTS sidebar group showing: current batch plan, running agents, execution history. The navigation.ts adds 'pipeline' to TAB_GROUPS but no view file exists for it. The issues tab and projects tab have partial implementations (ui/src/ui/views/issues.ts, views/projects.ts) but the pipeline view is absent. This needs: a renderPipeline() view function, a pipeline controller, and SSE/RPC handlers for live agent status.

### TASK-953231: Web UI: self-improve analytics tab not implemented

- **Severity:** low | **Complexity:** l
- **Labels:** web-ui, selfimprove

The spec (selfimprove.html, web-ui.html) describes a self-improve analytics section in the web UI showing: lesson frequency by category/tag, application rate, cross-project insights, agent learning curve over time. No view/controller for selfimprove analytics exists in ui/src/ui/views/. The selfimprove data is accessible via the gateway (server-methods/backlog.ts) but needs a frontend rendering layer.

### TASK-962848: Docs: all 14 spec HTML files hardcode 'task_id' in SQL and doc references — update to issue_id

- **Severity:** medium | **Complexity:** m
- **Labels:** docs

Following from GAP-001, the spec docs use 'task_id' pervasively throughout SQL examples, table references, and narrative text. All occurrences of 'task_id' as the issues PK need to be updated to 'issue_id' across: schema.html (primary definition), orchestrator.html (SQL examples), data-access.html (join patterns), cli.html (update command examples), agents.html. This is a documentation-only fix, no code changes needed. The dependencies table uses 'task_id' as FK column name too — that column name is fine to keep (it references the issues table's PK), but the references need to use the correct PK name.

### TASK-977246: Docs: architecture.html and roadmap.html reference feature/clawforge-issues branch but actual branch is feature/project-agent-flows

- **Severity:** low | **Complexity:** xs
- **Labels:** docs

The spec docs (architecture.html, decisions.html, roadmap.html) reference the feature branch as 'feature/clawforge-issues'. The actual branch in this repo is 'feature/project-agent-flows'. All doc references to the branch name and the 'clawforge' CLI name need to be updated to reflect the actual implementation. The 'clawforge' name appears in migration.html as an old CLI name and in decisions.html. This is a docs-wrong gap.

### TASK-986881: Docs: selfimprove.html shows a data model inconsistent with both spec schema.html and implementation

- **Severity:** medium | **Complexity:** s
- **Labels:** docs, selfimprove

The selfimprove.html shows a data model that matches the implementation (task_id, agent_role, category with anti_pattern/process, scope, tags, applied) rather than the schema.html spec (entry_id UUID, source_task_id, source_agent, category with antipattern/bug_class/optimization). This creates two conflicting 'specs' for the same table. One of them needs to be chosen as canonical and the other updated. The implementation-aligned version in selfimprove.html is likely the correct one to keep.

### TASK-003563: Missing: .openclaw/.gitignore entry for _.sqlite_ files is not generated by init

- **Severity:** medium | **Complexity:** xs
- **Labels:** init, directory-spec

The spec states: 'It must be excluded from version control (add .openclaw/_.sqlite_ to your .gitignore). The state inside it is transiently critical but is regularly exported to the export/ folder'. The init command does not create a .openclaw/.gitignore or update the repo's .gitignore to exclude project.sqlite, project.sqlite-wal, project.sqlite-shm. Without this, teams may accidentally commit the binary SQLite files. The repo's own .gitignore should be checked/updated.

### TASK-015420: Agent AGENT.md templates: 13 core agent roles need updating to use openclaw issues commands

- **Severity:** high | **Complexity:** l
- **Labels:** agents, requires-approval

Per roadmap.html Phase 2 and agents.html, all 13 core agent AGENT.md files (orchestrator, dev, qa, qa-ux, deep-planner, architect, tech-lead, product-lead, scribe, ux-journey, ux-tech, self-improve, reviewer) need to be updated to: (1) Remove all references to the old rcache/Redis/clawforge CLI, (2) Replace with direct file reads for markdown context (cat .openclaw/PROJECT.md), (3) Update data queries to use sqlite3 or openclaw issues list, (4) Add post-task selfimprove recording routine. These templates don't exist at all yet in this repo (need to be created in .openclaw/agents/).

### TASK-025012: Init: does not register project in global registry (spec: init should call project add)

- **Severity:** medium | **Complexity:** xs
- **Labels:** init, cli, registry

The CLI spec (cli.html) states that 'openclaw issues init' should: create .openclaw/ directory, create project.sqlite, AND register the project in the global project registry. Currently initProjectDirectory() only creates the directory and PROJECT.md — it does not call openProjectRegistry().register(). This means projects initialized via CLI are invisible to 'openclaw project list' and the web dashboard until manually registered.

### TASK-033601: Missing: native bridge query for singleton check (openclaw tasks list integration)

- **Severity:** high | **Complexity:** m
- **Labels:** orchestrator, schema

The spec and orchestrator guide both describe a singleton check that queries 'openclaw tasks list | grep "{project_id}/" | grep running' before the orchestrator proceeds. There is no implementation of this bridge in any src/ file. The execution_runs.native_label column (also missing from impl) is the linchpin for this feature. The data-access.html shows the required JOIN pattern across issues + execution_runs + native task_runs. This native bridge is architecturally central to preventing duplicate agent spawning.
