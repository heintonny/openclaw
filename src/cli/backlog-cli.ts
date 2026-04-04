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
        dbInfo.addIssue({
          issueId,
          title: opts.title as string,
          description: (opts.description as string) || "",
          severity: opts.severity,
          status: "notStarted",
          complexity: opts.complexity,
          labels,
          assignee: null,
          sourceType: "internal",
          sourceExternalId: null,
          sourceExternalUrl: null,
          sourceSyncedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
        });
        console.log(`Added ${issueId}: ${opts.title}`);
      } finally {
        dbInfo.db.close();
      }
    });

  cmd
    .command("list")
    .description("List issues")
    .option("--status <status>", "Filter by status")
    .option("--severity <level>", "Filter by severity")
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
                : t.status === "inProgress"
                  ? "🔄"
                  : t.status === "blocked"
                    ? "🚫"
                    : "⬜";
            console.log(
              `${statusIcon} ${t.issueId} [${t.severity}/${t.complexity}] ${t.title} (${t.status})`,
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
    .option("--status <status>", "New status")
    .option("--severity <level>", "New severity")
    .option("--complexity <size>", "New complexity")
    .option("--title <title>", "New title")
    .option("--path <path>", "Repository path (default: cwd)")
    .action(async (issueId, opts) => {
      const { openProjectDatabase, resolveProjectSqlitePath } = await import("../backlog/db.js");
      const repoPath = (opts.path as string) || process.cwd();
      const dbPath = resolveProjectSqlitePath(repoPath);
      const dbInfo = openProjectDatabase(dbPath);
      try {
        const issue = dbInfo.getIssue(issueId as string);
        if (!issue) {
          console.error(`Issue ${issueId} not found`);
          return;
        }
        if (opts.status) {
          issue.status = opts.status;
        }
        if (opts.severity) {
          issue.severity = opts.severity;
        }
        if (opts.complexity) {
          issue.complexity = opts.complexity;
        }
        if (opts.title) {
          issue.title = opts.title as string;
        }
        issue.updatedAt = new Date().toISOString();
        if (opts.status === "done") {
          issue.completedAt = new Date().toISOString();
        }

        dbInfo.updateIssue(issue);
        console.log(`Updated ${issueId}`);
      } finally {
        dbInfo.db.close();
      }
    });

  cmd
    .command("status")
    .description("Show issues summary")
    .option("--path <path>", "Repository path (default: cwd)")
    .option("--json", "Output as JSON", false)
    .action(async (opts) => {
      const { openProjectDatabase, resolveProjectSqlitePath } = await import("../backlog/db.js");
      const repoPath = (opts.path as string) || process.cwd();
      const dbPath = resolveProjectSqlitePath(repoPath);
      const dbInfo = openProjectDatabase(dbPath);
      try {
        const issues = dbInfo.listIssues();
        const summary: Record<string, number> = {};
        for (const t of issues) {
          summary[t.status] = (summary[t.status] || 0) + 1;
        }
        if (opts.json) {
          console.log(JSON.stringify(summary, null, 2));
        } else {
          console.log("Issues Summary:");
          for (const [status, count] of Object.entries(summary)) {
            console.log(`  ${status}: ${count}`);
          }
        }
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
