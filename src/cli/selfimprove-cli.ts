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
    .option("--category <cat>", "Category", "general")
    .option("--severity <level>", "Severity: high, medium, low", "medium")
    .option("--role <role>", "Agent role that learned this", "general")
    .action(async (opts) => {
      const { addLesson } = await import("../backlog/selfimprove.js");
      const lessonId = addLesson({
        title: opts.title as string,
        description: opts.description as string,
        category: opts.category as string,
        severity: opts.severity as string,
        role: opts.role as string,
      });
      console.log(`Added lesson ${lessonId}: ${opts.title}`);
    });

  cmd
    .command("list")
    .description("List agent lessons")
    .option("--scope <scope>", "Filter by scope")
    .option("--severity <level>", "Filter by severity")
    .option("--json", "Output as JSON", false)
    .action(async (opts) => {
      const { listLessons } = await import("../backlog/selfimprove.js");
      const lessons = listLessons({
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
          console.log(`[${l.category}/${l.severity}] ${l.title}`);
        }
      }
    });
}