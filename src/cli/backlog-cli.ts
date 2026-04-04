import type { Command } from "commander";

export function registerIssuesCli(program: Command) {
  const cmd = program.command("issues").description("Manage project issues");

  cmd
    .command("init")
    .description("Initialize .openclaw/ project directory in current repo")
    .option("--path <path>", "Repository path (default: cwd)")
    .action(async (opts) => {
      const { initProjectDirectory } = await import("../backlog/db.js");
      const repoPath = (opts.path as string) || process.cwd();
      const dbPath = initProjectDirectory(repoPath);
      console.log(`Initialized project at ${dbPath}`);
    });

  cmd
    .command("add")
    .description("Add an issue")
    .requiredOption("--title <title>", "Issue title")
    .option("--description <desc>", "Issue description", "")
    .option("--severity <level>", "Severity: critical, high, medium, low", "medium")
    .option("--complexity <size>", "Complexity: xs, s, m, l, xl", "m")
    .option("--labels <labels>", "Comma-separated labels")
    .option("--touches <files>", "Comma-separated files (alias for --labels)")
    .option("--project-id <id>", "Project ID to associate this issue with")
    .option("--requires-approval", "Mark issue as requiring approval before execution", false)
    .option("--path <path>", "Repository path (default: cwd)")
    .action(async (opts) => {
      const { openProjectDatabase, resolveProjectSqlitePath } = await import("../backlog/db.js");
      const repoPath = (opts.path as string) || process.cwd();
      const dbPath = resolveProjectSqlitePath(repoPath);
      const dbInfo = openProjectDatabase(dbPath);
      try {
        const issueId = `TASK-${String(Date.now()).slice(-6)}`;
        const labels = opts.labels
          ? (opts.labels as string).split(",").map((s: string) => s.trim())
          : opts.touches
            ? (opts.touches as string).split(",").map((s: string) => s.trim())
            : [];
        const now = Date.now();
        dbInfo.addIssue({
          issueId,
          title: opts.title as string,
          description: (opts.description as string) || "",
          severity: opts.severity,
          status: "open",
          complexity: opts.complexity,
          labels,
          assignee: null,
          projectId: (opts.projectId as string) || null,
          batchId: null,
          requiresApproval: opts.requiresApproval ? 1 : 0,
          touchesJson: labels.length > 0 ? JSON.stringify(labels) : null,
          sourceType: "internal",
          sourceExternalId: null,
          sourceExternalUrl: null,
          sourceSyncedAt: null,
          createdAt: now,
          updatedAt: now,
          completedAt: null,
          startedAt: null,
          closedAt: null,
          approvedAt: null,
        });
        console.log(`Added ${issueId}: ${opts.title as string}`);
      } finally {
        dbInfo.db.close();
      }
    });

  cmd
    .command("list")
    .description("List issues")
    .option("--status <status>", "Filter by status")
    .option("--severity <level>", "Filter by severity")
    .option("--project-id <id>", "Filter by project ID")
    .option("--json", "Output as JSON", false)
    .option("--path <path>", "Repository path (default: cwd)")
    .action(async (opts) => {
      const { openProjectDatabase, resolveProjectSqlitePath } = await import("../backlog/db.js");
      const repoPath = (opts.path as string) || process.cwd();
      const dbPath = resolveProjectSqlitePath(repoPath);
      const dbInfo = openProjectDatabase(dbPath);
      try {
        let issues = dbInfo.listIssues();
        if (opts.status) {
          issues = issues.filter((t: { status: string }) => t.status === opts.status);
        }
        if (opts.severity) {
          issues = issues.filter((t: { severity: string }) => t.severity === opts.severity);
        }
        if (opts.projectId) {
          issues = issues.filter(
            (t: { projectId: string | null }) => t.projectId === opts.projectId,
          );
        }

        if (opts.json) {
          console.log(JSON.stringify(issues, null, 2));
        } else {
          if (issues.length === 0) {
            console.log("No issues found.");
            return;
          }
          for (const t of issues) {
            const statusIcon =
              t.status === "done"
                ? "✅"
                : t.status === "in_progress" || t.status === "inProgress"
                  ? "🔄"
                  : t.status === "blocked"
                    ? "🚫"
                    : t.status === "approved"
                      ? "👍"
                      : t.status === "rejected"
                        ? "❌"
                        : "⬜";
            const approvalFlag = t.requiresApproval ? " [needs-approval]" : "";
            const projectTag = t.projectId ? ` (${t.projectId})` : "";
            console.log(
              `${statusIcon} ${t.issueId} [${t.severity}/${t.complexity}]${projectTag} ${t.title} (${t.status})${approvalFlag}`,
            );
          }
          console.log(`\n${issues.length} issue(s)`);
        }
      } finally {
        dbInfo.db.close();
      }
    });

  cmd
    .command("update")
    .description("Update an issue")
    .argument("<issueId>", "Issue ID to update")
    .option("--status <status>", "New status: open, approved, in_progress, blocked, done, rejected")
    .option("--severity <level>", "New severity")
    .option("--complexity <size>", "New complexity")
    .option("--title <title>", "New title")
    .option("--assignee <assignee>", "New assignee")
    .option("--project-id <id>", "Set project ID")
    .option("--batch-id <id>", "Set batch ID")
    .option("--path <path>", "Repository path (default: cwd)")
    .action(async (issueId, opts) => {
      const { openProjectDatabase, resolveProjectSqlitePath } = await import("../backlog/db.js");
      const repoPath = (opts.path as string) || process.cwd();
      const dbPath = resolveProjectSqlitePath(repoPath);
      const dbInfo = openProjectDatabase(dbPath);
      try {
        const issue = dbInfo.getIssue(issueId as string);
        if (!issue) {
          console.error(`Issue ${issueId as string} not found`);
          return;
        }
        const updates: Record<string, unknown> = {};
        if (opts.status) {
          updates.status = opts.status;
        }
        if (opts.severity) {
          updates.severity = opts.severity;
        }
        if (opts.complexity) {
          updates.complexity = opts.complexity;
        }
        if (opts.title) {
          updates.title = opts.title as string;
        }
        if (opts.assignee) {
          updates.assignee = opts.assignee as string;
        }
        if (opts.projectId) {
          updates.projectId = opts.projectId as string;
        }
        if (opts.batchId) {
          updates.batchId = opts.batchId as string;
        }

        dbInfo.updateTask(issueId as string, updates);
        console.log(`Updated ${issueId as string}`);
      } finally {
        dbInfo.db.close();
      }
    });

  cmd
    .command("status")
    .description("Show issues dashboard summary")
    .option("--path <path>", "Repository path (default: cwd)")
    .option("--json", "Output as JSON", false)
    .option("--project-id <id>", "Filter dashboard by project ID")
    .action(async (opts) => {
      const { openProjectDatabase, resolveProjectSqlitePath } = await import("../backlog/db.js");
      const repoPath = (opts.path as string) || process.cwd();
      const dbPath = resolveProjectSqlitePath(repoPath);
      const dbInfo = openProjectDatabase(dbPath);
      try {
        let issues = dbInfo.listIssues();
        if (opts.projectId) {
          issues = issues.filter(
            (t: { projectId: string | null }) => t.projectId === opts.projectId,
          );
        }

        const summary: Record<string, number> = {};
        for (const t of issues) {
          summary[t.status] = (summary[t.status] || 0) + 1;
        }
        summary.total = issues.length;

        const needsApproval = issues.filter(
          (t: { requiresApproval: number; status: string }) =>
            t.requiresApproval === 1 && t.status === "open",
        ).length;
        const readyToDispatch = issues
          .filter((t: { status: string }) => t.status === "approved" || t.status === "open")
          .filter((t: { requiresApproval: number }) => t.requiresApproval === 0).length;

        if (opts.json) {
          console.log(JSON.stringify({ ...summary, needsApproval, readyToDispatch }, null, 2));
        } else {
          console.log("Issues Dashboard:");
          console.log("─".repeat(40));
          for (const [status, count] of Object.entries(summary)) {
            if (status === "total") {
              continue;
            }
            console.log(`  ${status.padEnd(15)} ${count}`);
          }
          console.log("─".repeat(40));
          console.log(`  ${"TOTAL".padEnd(15)} ${summary.total ?? 0}`);
          console.log("");
          if (needsApproval > 0) {
            console.log(`  ⚠️  ${needsApproval} issue(s) awaiting approval`);
          }
          if (readyToDispatch > 0) {
            console.log(`  🚀 ${readyToDispatch} issue(s) ready to dispatch`);
          }
        }
      } finally {
        dbInfo.db.close();
      }
    });

  cmd
    .command("dispatch")
    .description("Pick approved/open issues and dispatch agent batch (dry-run skeleton)")
    .option("--path <path>", "Repository path (default: cwd)")
    .option("--project-id <id>", "Limit dispatch to a specific project")
    .option("--batch-size <n>", "Max issues per batch", "5")
    .option("--dry-run", "Print what would be dispatched without spawning agents", false)
    .option("--json", "Output as JSON", false)
    .action(async (opts) => {
      const { openProjectDatabase, resolveProjectSqlitePath } = await import("../backlog/db.js");
      const repoPath = (opts.path as string) || process.cwd();
      const dbPath = resolveProjectSqlitePath(repoPath);
      const dbInfo = openProjectDatabase(dbPath);
      try {
        let issues = dbInfo.listIssues();

        // Filter to dispatchable issues: approved OR (open and no approval required)
        issues = issues.filter(
          (t) => t.status === "approved" || (t.status === "open" && t.requiresApproval === 0),
        );

        if (opts.projectId) {
          issues = issues.filter(
            (t: { projectId: string | null }) => t.projectId === opts.projectId,
          );
        }

        const batchSize = parseInt(opts.batchSize as string, 10) || 5;
        const batch = issues.slice(0, batchSize);

        // Generate a batch ID
        const batchId = `BATCH-${String(Date.now()).slice(-8)}`;

        const dispatchPlan = batch.map((t) => ({
          issueId: t.issueId,
          title: t.title,
          severity: t.severity,
          complexity: t.complexity,
          assignee: t.assignee ?? "dev",
          projectId: t.projectId,
          batchId,
          agentCommand: [
            "openclaw",
            "sessions",
            "spawn",
            "--agent",
            t.assignee ?? "dev",
            "--issue",
            t.issueId,
            "--batch",
            batchId,
          ].join(" "),
        }));

        if (opts.json) {
          console.log(JSON.stringify({ batchId, dryRun: true, issues: dispatchPlan }, null, 2));
          return;
        }

        if (batch.length === 0) {
          console.log("No dispatchable issues found.");
          console.log("Issues must have status 'approved' or be 'open' without requires_approval.");
          return;
        }

        console.log(`Dispatch Plan — ${batchId}`);
        console.log("─".repeat(60));
        console.log(`Would spawn ${batch.length} agent session(s) for the following issues:\n`);

        for (const item of dispatchPlan) {
          console.log(
            `  ${item.issueId} [${item.severity}/${item.complexity}] → agent: ${item.assignee}`,
          );
          console.log(`    Title: ${item.title}`);
          console.log(`    Command: ${item.agentCommand}`);
          console.log("");
        }

        // NOTE: Actual agent spawning (sessions_spawn) not yet implemented — this is a planning skeleton.
        // Always prints the dry-run notice until spawn support is added.
        console.log(
          "NOTE: Actual agent spawning (sessions_spawn) not yet implemented — this is a planning skeleton.",
        );
        console.log("To spawn agents, run each command above manually or via your cron setup.");
      } finally {
        dbInfo.db.close();
      }
    });

  cmd
    .command("export")
    .description("Export issues and selfimprove to markdown files")
    .option("--path <path>", "Repository path (default: cwd)")
    .action(async (opts) => {
      const { openProjectDatabase, resolveProjectSqlitePath } = await import("../backlog/db.js");
      const { exportIssues, exportSelfImprove } = await import("../backlog/export.js");
      const repoPath = (opts.path as string) || process.cwd();
      const dbPath = resolveProjectSqlitePath(repoPath);
      const db = openProjectDatabase(dbPath);
      try {
        const issues = db.listIssues();
        // Collect all deps
        const allDeps: Array<{ taskId: string; dependsOn: string }> = [];
        for (const t of issues) {
          const deps = db.listDependencies(t.issueId);
          allDeps.push(...deps.map((d) => ({ taskId: d.issueId, dependsOn: d.dependsOn })));
        }
        const issuesPath = exportIssues(repoPath, issues, allDeps);
        console.log(`Exported issues to ${issuesPath}`);

        const entries = db.listSelfImprove();
        if (entries.length > 0) {
          const siPath = exportSelfImprove(repoPath, entries);
          console.log(`Exported ${entries.length} selfimprove entries to ${siPath}`);
        }
      } finally {
        db.close();
      }
    });

  cmd
    .command("migrate")
    .description("Migrate TASKS.json to SQLite issues")
    .option("--path <path>", "Repository path (default: cwd)")
    .option("--file <file>", "Path to TASKS.json (auto-detected if omitted)")
    .action(async (opts) => {
      const { migrateFromTasksJson } = await import("../backlog/migrate.js");
      const repoPath = (opts.path as string) || process.cwd();
      const result = migrateFromTasksJson(repoPath, opts.file as string | undefined);
      console.log(`Migration complete: ${result.imported} imported, ${result.skipped} skipped`);
    });
}

// Backward-compatible alias
export const registerBacklogCli = registerIssuesCli;
