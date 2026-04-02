import type { Command } from "commander";

export function registerSelfimproveCli(program: Command) {
  const cmd = program
    .command("selfimprove")
    .description("Track agent lessons and self-improvement");

  cmd
    .command("add")
    .description("Add a new agent lesson")
    .requiredOption("--title <title>", "Lesson title")
    .option("--description <desc>", "Detailed description", "")
    .option("--category <cat>", "Category: lesson, pattern, anti_pattern, process", "lesson")
    .option("--severity <level>", "Severity: info, warning, critical", "info")
    .option("--role <role>", "Agent role that learned this", "general")
    .option("--scope <scope>", "Scope: project, global", "project")
    .option("--task <taskId>", "Related task ID")
    .option("--path <path>", "Repository path (default: cwd)")
    .action(async (opts) => {
      const { addLesson } = await import("../backlog/selfimprove.js");
      const title = addLesson({
        path: (opts.path as string) || process.cwd(),
        title: opts.title as string,
        description: (opts.description as string) || "",
        category: opts.category as string,
        severity: opts.severity as string,
        role: opts.role as string,
        scope: opts.scope as string,
        taskId: opts.task as string | undefined,
      });
      console.log(`Added lesson: ${title}`);
    });

  cmd
    .command("list")
    .description("List agent lessons")
    .option("--scope <scope>", "Filter by scope: project, global")
    .option("--severity <level>", "Filter by severity: info, warning, critical")
    .option("--json", "Output as JSON", false)
    .option("--path <path>", "Repository path (default: cwd)")
    .action(async (opts) => {
      const { listLessons } = await import("../backlog/selfimprove.js");
      const lessons = listLessons({
        path: (opts.path as string) || process.cwd(),
        scope: opts.scope as string | undefined,
        severity: opts.severity as string | undefined,
      });
      if (opts.json) {
        console.log(JSON.stringify(lessons, null, 2));
      } else {
        if (lessons.length === 0) {
          console.log("No lessons found.");
          return;
        }
        for (const l of lessons) {
          const icon =
            l.category === "anti_pattern"
              ? "⚠️"
              : l.category === "pattern"
                ? "💡"
                : l.category === "process"
                  ? "🔧"
                  : "📝";
          console.log(`${icon} [${l.category}/${l.severity}] ${l.title}`);
          if (l.description) { console.log(`   ${l.description}`); }
        }
        console.log(`\n${lessons.length} lesson(s)`);
      }
    });
}
