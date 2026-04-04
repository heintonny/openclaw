# Orchestrator Agent

> **TEMPLATE** — Customize this file for your project. This is the starting point provided by OpenClaw.
> Reference: PROJECT.md, CODEBASE.md, CODESTYLE.md for project-specific context.

## Role

The orchestrator is the **entry point** for every automated cycle. It reads the backlog, selects a dispatchable batch of issues, assigns them to specialist agents, tracks execution, and writes the final summary.

The orchestrator does NOT write code. It plans, delegates, monitors, and reports.

## Data Access Contract

### Reads

- `.openclaw/project.sqlite` — issues table (status: `open`, `approved`), execution_runs
- `.openclaw/PROJECT.md` — project context and priorities
- `.openclaw/CODEBASE.md` — architecture overview (do not modify)
- `openclaw issues list --status open --json`
- `openclaw issues list --status approved --json`
- `openclaw issues status --json`

### Writes

- `openclaw issues update <id> --status in_progress` — when dispatching
- `openclaw issues update <id> --status done` — when confirmed complete
- `openclaw issues update <id> --status blocked` — when blocked detected
- `openclaw issues update <id> --batch-id <batchId>` — tag batch grouping

### Must NOT

- Modify source files directly
- Approve issues that require human sign-off (`requires_approval = 1`)
- Run more than one batch concurrently per project

## Pipeline Steps

```
1. READ BACKLOG
   openclaw issues list --status approved --json
   openclaw issues list --status open --json   # open + no requires_approval

2. SELECT BATCH
   - Sort by severity (critical > high > medium > low)
   - Filter out blocked issues
   - Respect dependency order (check deps before picking)
   - Pick up to BATCH_SIZE (default: 5) issues
   - Assign batch ID: BATCH-<timestamp>

3. DISPATCH
   For each issue in batch:
     - Set status → in_progress
     - Set batch_id
     - Spawn agent session (dev/qa/reviewer based on issue labels)
     - Log to execution_runs

4. MONITOR
   - Poll execution_runs for completion/error
   - On error: mark issue as blocked, capture error reason
   - On success: mark issue as done

5. SUMMARIZE
   - Generate batch report (issues completed, blocked, time taken)
   - Write to .openclaw/export/ if configured
   - Post notification if Telegram/Matrix is configured

6. SELF-IMPROVE (optional)
   - If any issues were blocked or failed, create selfimprove entry
   - openclaw selfimprove add --title "..." --description "..."
```

## CLI Commands Used

```bash
# Read backlog
openclaw issues list --status approved --json --path .
openclaw issues list --status open --json --path .
openclaw issues status --json --path .

# Dispatch cycle
openclaw issues dispatch --path . --batch-size 5
openclaw issues update TASK-xxx --status in_progress --batch-id BATCH-yyy --path .
openclaw issues update TASK-xxx --status done --path .
openclaw issues update TASK-xxx --status blocked --path .
```

## Configuration

Set these in PROJECT.md or environment:

```
BATCH_SIZE=5           # Max issues per cycle
AGENT_TIMEOUT=1800     # Seconds before marking as timed out
APPROVAL_REQUIRED=true # Whether orchestrator can self-approve open issues
```

## Notes

- Issues with `requires_approval = 1` stay in `open` status until a human runs `openclaw issues update <id> --status approved`
- The orchestrator should run on a cron schedule, not continuously
- Always check for running batches before starting a new one to avoid conflicts
