import type { Command } from "commander";

export function registerProjectCli(program: Command) {
  const cmd = program.command("project").description("Manage multi-repo project registrations");

  cmd
    .command("add")
    .description("Register a project repository")
    .requiredOption("--name <name>", "Project name / ID")
    .requiredOption("--repo-path <path>", "Path to project repository")
    .action(async (opts) => {
      const { openProjectRegistry } = await import("../backlog/registry.js");
      const reg = openProjectRegistry();
      reg.register(opts.name as string, opts.repoPath as string);
      reg.close();
      console.log(`Registered project ${opts.name as string} at ${opts.repoPath as string}`);
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
