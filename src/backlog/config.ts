import fs from "node:fs/promises";
import path from "node:path";
import { ProjectConfig } from "./types.js";

export async function getProjectConfig(repoPath: string): Promise<ProjectConfig | null> {
  const configPath = path.join(repoPath, ".openclaw", "config.json");
  try {
    const content = await fs.readFile(configPath, "utf-8");
    return JSON.parse(content) as ProjectConfig;
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function initProjectConfig(repoPath: string, name: string): Promise<void> {
  const dotDir = path.join(repoPath, ".openclaw");
  await fs.mkdir(dotDir, { recursive: true });

  const configPath = path.join(dotDir, "config.json");

  const defaultConfig: ProjectConfig = {
    project_name: name,
    default_environment: "dev",
    environments: {
      dev: {
        base_branch: "feature/my-branch",
        agent_engine: "cursor_self_hosted",
        auto_deploy: true,
        requires_approval_override: false,
        on_success: "run_script",
        script_path: "scripts/deploy.sh",
      },
      prod: {
        base_branch: "main",
        agent_engine: "cursor_cloud",
        auto_deploy: false,
        requires_approval_override: true,
        on_success: "create_pr",
      },
    },
  };

  try {
    await fs.access(configPath);
    // Config already exists, don't overwrite
  } catch {
    await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2), "utf-8");
  }
}
