import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Command } from "commander";

/** Read project name from .openclaw/PROJECT.md (first # heading) */
function readProjectNameFromMd(repoPath: string): string | null {
  const mdPath = path.join(repoPath, ".openclaw", "PROJECT.md");
  if (!existsSync(mdPath)) {
    return null;
  }
  const content = readFileSync(mdPath, "utf-8");
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

export function registerProjectCli(program: Command) {
  const cmd = program.command("project").description("Manage multi-repo project registrations");

  cmd
    .command("add [repoPath]")
    .description(
      "Register a project repository. Use '.' or omit path to use cwd. --name is optional if PROJECT.md exists.",
    )
    .option(
      "--name <name>",
      "Project name / ID (auto-detected from .openclaw/PROJECT.md if omitted)",
    )
    .option("--repo-path <path>", "Path to project repository (alternative to positional arg)")
    .option("--cron", "Output suggested cron job command for this project", false)
    .action(async (positionalPath, opts) => {
      const { openProjectRegistry } = await import("../backlog/registry.js");

      // Resolve repo path: positional arg > --repo-path > cwd
      const rawPath =
        (positionalPath as string | undefined) ||
        (opts.repoPath as string | undefined) ||
        process.cwd();
      const repoPath = rawPath === "." ? process.cwd() : rawPath;

      // Resolve project name: --name > PROJECT.md heading > directory basename
      let projectName = opts.name as string | undefined;
      if (!projectName) {
        projectName = readProjectNameFromMd(repoPath) ?? path.basename(repoPath);
      }

      const reg = openProjectRegistry();
      reg.register(projectName, repoPath);
      reg.close();
      console.log(`Registered project '${projectName}' at ${repoPath}`);

      if (opts.cron) {
        console.log("\nSuggested cron job (add to your cron/jobs.json):");
        console.log(
          JSON.stringify(
            {
              id: `project-dispatch-${projectName}`,
              schedule: "0 */4 * * *",
              command: `openclaw issues dispatch --path ${repoPath} --project-id ${projectName}`,
              description: `Auto-dispatch approved issues for project '${projectName}'`,
            },
            null,
            2,
          ),
        );
      }
    });

  cmd
    .command("remove")
    .description("Unregister a project repository")
    .requiredOption("--name <name>", "Project name / ID")
    .requiredOption("--repo-path <path>", "Path to project repository")
    .action(async (opts) => {
      const { openProjectRegistry } = await import("../backlog/registry.js");
      const reg = openProjectRegistry();
      reg.unregister(opts.name as string, opts.repoPath as string);
      reg.close();
      console.log(`Unregistered ${opts.repoPath as string} from project ${opts.name as string}`);
    });

  cmd
    .command("list")
    .description("List registered projects")
    .action(async () => {
      const { openProjectRegistry } = await import("../backlog/registry.js");
      const reg = openProjectRegistry();
      const projects = reg.listProjects();
      reg.close();
      if (projects.length === 0) {
        console.log("No registered projects found.");
        return;
      }
      for (const p of projects) {
        console.log(`${p.projectId} (${p.repoPaths.join(", ")})`);
      }
    });
}
