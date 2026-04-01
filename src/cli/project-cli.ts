import type { Command } from "commander";

export function registerProjectCli(program: Command) {
  const cmd = program
    .command("project")
    .description("Manage multi-repo project registrations");

  cmd
    .command("add")
    .description("Register a project repository")
    .requiredOption("--name <name>", "Project name")
    .requiredOption("--repo-path <path>", "Path to project repository")
    .action(async (opts) => {
      const { registerProject } = await import("../backlog/registry.js");
      registerProject(opts.name as string, opts.repoPath as string);
      console.log(`Registered project ${opts.name} at ${opts.repoPath}`);
    });

  cmd
    .command("list")
    .description("List registered projects")
    .action(async () => {
      const { listProjects } = await import("../backlog/registry.js");
      const projects = listProjects();
      if (projects.length === 0) {
        console.log("No registered projects found.");
        return;
      }
      for (const p of projects) {
        console.log(`${p.name} - ${p.repoPath}`);
      }
    });
}