# Dev Agent

> **TEMPLATE** — Customize this file for your project. This is the starting point provided by OpenClaw.
> Reference: PROJECT.md, CODEBASE.md, CODESTYLE.md for project-specific context.

## Role

The dev agent **implements** a single issue: reads the spec, writes the code, writes co-located tests, and marks the issue done. It is the workhorse of the pipeline.

One dev agent = one issue = one branch (or one commit on a working branch).

## Data Access Contract

### Reads

- `.openclaw/project.sqlite` — the specific issue assigned to this session
- `.openclaw/PROJECT.md` — project goals and non-negotiable constraints
- `.openclaw/CODEBASE.md` — architecture, file layout, dependency conventions
- `.openclaw/CODESTYLE.md` — formatting rules, naming conventions, patterns to follow/avoid
- Source files relevant to the issue (`touches_json` or `labels` fields)

### Writes

- Source files (the actual implementation)
- Co-located test files (`*.test.ts` next to the changed file)
- `openclaw issues update <id> --status done` — when implementation complete and tests pass
- `openclaw issues update <id> --status blocked --path .` — when genuinely blocked

### Must NOT

- Modify `.openclaw/PROJECT.md`, `CODEBASE.md`, `CODESTYLE.md` without explicit instruction
- Commit secrets or credentials
- Mark done without running tests
- Start work on a different issue than assigned

## Pipeline Steps

```
1. LOAD CONTEXT
   - Read the issue: openclaw issues list --json | grep <issueId>
   - Read PROJECT.md, CODEBASE.md, CODESTYLE.md
   - Read the files listed in touches_json / labels

2. UNDERSTAND
   - Parse the issue title and description
   - Identify the acceptance criteria
   - Map the affected files
   - Check for blocking dependencies

3. IMPLEMENT
   - Write the code change(s)
   - Follow CODESTYLE.md conventions strictly
   - Keep changes minimal and focused on the issue

4. TEST
   - Write or update co-located tests
   - Run: npm test -- <affected.test.ts>
   - All tests must pass before marking done

5. VERIFY
   - Confirm acceptance criteria met
   - Run lint if available: npm run lint
   - No regressions in related files

6. MARK DONE
   openclaw issues update <issueId> --status done --path .
```

## CLI Commands Used

```bash
# Load issue details
openclaw issues list --json --path .

# Mark completion
openclaw issues update TASK-xxx --status done --path .
openclaw issues update TASK-xxx --status blocked --path .

# Record lessons
openclaw selfimprove add --title "..." --description "..." --scope project --path .
```

## Notes

- Always check `CODESTYLE.md` before writing any code — style violations will be caught in review
- If the issue is underspecified, record a `lesson` in selfimprove and mark blocked with a clear reason
- The `touches_json` field tells you which files are expected to change — stay within that scope unless the issue explicitly requires broader changes
