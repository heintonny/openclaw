import type { Command } from "commander";

export function registerBacklogCli(program: Command) {
  const cmd = program
    .command("backlog")
    .description("Manage project task backlogs");

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
    .description("Add a task to the backlog")
    .requiredOption("--title <title>", "Task title")
    .option("--description <desc>", "Task description", "")
    .option("--severity <level>", "Severity: critical, high, medium, low", "medium")
    .option("--complexity <size>", "Complexity: xs, s, m, l, xl", "m")
    .option("--touches <files>", "Comma-separated files this task affects")
    .option("--path <path>", "Repository path (default: cwd)")
    .action(async (opts) => {
      const { openProjectDatabase, resolveProjectSqlitePath } = await import("../backlog/db.js");
      const repoPath = (opts.path as string) || process.cwd();
      const dbPath = resolveProjectSqlitePath(repoPath);
      const dbInfo = openProjectDatabase(dbPath);
      try {
        const taskId = `TASK-${String(Date.now()).slice(-6)}`;
        const touches = opts.touches
          ? (opts.touches as string).split(",").map((s: string) => s.trim())
          : [];
        dbInfo.addBacklogTask({
          taskId,
          title: opts.title as string,
          description: (opts.description as string) || "",
          severity: opts.severity as any,
          status: "notStarted",
          complexity: opts.complexity as any,
          touches,
          agentRole: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
        });
        console.log(`Added ${taskId}: ${opts.title}`);
      } finally {
        dbInfo.db.close();
      }
    });

  cmd
    .command("list")
    .description("List backlog tasks")
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
        let tasks = dbInfo.listBacklogTasks();
        if (opts.status) {
          tasks = tasks.filter((t: any) => t.status === opts.status);
        }
        if (opts.severity) {
          tasks = tasks.filter((t: any) => t.severity === opts.severity);
        }
        
        if (opts.json) {
          console.log(JSON.stringify(tasks, null, 2));
        } else {
          if (tasks.length === 0) {
            console.log("No tasks found.");
            return;
          }
          for (const t of tasks) {
            const statusIcon =
              t.status === "done"
                ? "✅"
                : t.status === "inProgress"
                  ? "🔄"
                  : t.status === "blocked"
                    ? "🚫"
                    : "⬜";
            console.log(
              `${statusIcon} ${t.taskId} [${t.severity}/${t.complexity}] ${t.title} (${t.status})`,
            );
          }
          console.log(`\n${tasks.length} task(s)`);
        }
      } finally {
        dbInfo.db.close();
      }
    });

  cmd
    .command("update")
    .description("Update a task")
    .argument("<taskId>", "Task ID to update")
    .option("--status <status>", "New status")
    .option("--severity <level>", "New severity")
    .option("--complexity <size>", "New complexity")
    .option("--title <title>", "New title")
    .option("--path <path>", "Repository path (default: cwd)")
    .action(async (taskId, opts) => {
      const { openProjectDatabase, resolveProjectSqlitePath } = await import("../backlog/db.js");
      const repoPath = (opts.path as string) || process.cwd();
      const dbPath = resolveProjectSqlitePath(repoPath);
      const dbInfo = openProjectDatabase(dbPath);
      try {
        const task = dbInfo.getBacklogTask(taskId as string);
        if (!task) {
          console.error(`Task ${taskId} not found`);
          return;
        }
        if (opts.status) task.status = opts.status as any;
        if (opts.severity) task.severity = opts.severity as any;
        if (opts.complexity) task.complexity = opts.complexity as any;
        if (opts.title) task.title = opts.title as string;
        task.updatedAt = new Date().toISOString();
        if (opts.status === "done") task.completedAt = new Date().toISOString();
        
        dbInfo.updateBacklogTask(task);
        console.log(`Updated ${taskId}`);
      } finally {
        dbInfo.db.close();
      }
    });

  cmd
    .command("status")
    .description("Show backlog summary")
    .option("--path <path>", "Repository path (default: cwd)")
    .option("--json", "Output as JSON", false)
    .action(async (opts) => {
      const { openProjectDatabase, resolveProjectSqlitePath } = await import("../backlog/db.js");
      const repoPath = (opts.path as string) || process.cwd();
      const dbPath = resolveProjectSqlitePath(repoPath);
      const dbInfo = openProjectDatabase(dbPath);
      try {
        const tasks = dbInfo.listBacklogTasks();
        const summary: Record<string, number> = {};
        for (const t of tasks) {
          summary[t.status] = (summary[t.status] || 0) + 1;
        }
        if (opts.json) {
          console.log(JSON.stringify(summary, null, 2));
        } else {
          console.log("Backlog Summary:");
          for (const [status, count] of Object.entries(summary)) {
            console.log(`  ${status}: ${count}`);
          }
        }
      } finally {
        dbInfo.db.close();
      }
    });
}