import { openProjectDatabase, resolveProjectSqlitePath } from "../../backlog/db.js";
import { planBatch } from "../../backlog/deps.js";
import { openProjectRegistry } from "../../backlog/registry.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import type { GatewayRequestHandlers } from "./types.js";

function resolveRepoPath(params: Record<string, unknown>): string {
  // Accept repoPath directly
  if (typeof params.repoPath === "string" && params.repoPath) {
    return params.repoPath;
  }
  // Resolve from projectId via registry
  if (typeof params.projectId === "string" && params.projectId) {
    const registry = openProjectRegistry();
    try {
      const repos = registry.getProject(params.projectId);
      if (repos.length === 0) {
        throw new Error(`Project "${params.projectId}" not found in registry`);
      }
      return repos[0];
    } finally {
      registry.close();
    }
  }
  throw new Error("repoPath or projectId is required");
}

function getDbForRepo(repoPath: string) {
  if (!repoPath) {
    throw new Error("repoPath is required");
  }
  const dbPath = resolveProjectSqlitePath(repoPath);
  return openProjectDatabase(dbPath);
}

export const issuesHandlers: GatewayRequestHandlers = {
  "issues.listAll": async ({ params: _params, respond }) => {
    try {
      const registry = openProjectRegistry();
      try {
        const projects = registry.listProjects();
        const allTasks: Array<Record<string, unknown>> = [];
        for (const project of projects) {
          for (const repoPath of project.repoPaths) {
            try {
              const dbPath = resolveProjectSqlitePath(repoPath);
              const db = openProjectDatabase(dbPath);
              try {
                const tasks = db.listTasks();
                for (const task of tasks) {
                  allTasks.push({ ...task, projectId: project.projectId });
                }
              } finally {
                db.close();
              }
            } catch {
              // Skip projects with missing/corrupt DBs
            }
          }
        }
        respond(true, { tasks: allTasks });
      } finally {
        registry.close();
      }
    } catch (e: unknown) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, e instanceof Error ? e.message : String(e)),
      );
    }
  },

  "issues.list": async ({ params, respond }) => {
    try {
      const db = getDbForRepo(resolveRepoPath(params));
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        respond(true, { tasks: db.listTasks(params.filters as any) });
      } finally {
        db.close();
      }
    } catch (e: unknown) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, e instanceof Error ? e.message : String(e)),
      );
    }
  },

  "issues.add": async ({ params, respond }) => {
    if ((!params.taskId && !params.issueId) || !params.title) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "issueId (or taskId) and title are required"),
      );
      return;
    }
    try {
      const db = getDbForRepo(resolveRepoPath(params));
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        db.addTask(params as any);
        const id = (params.issueId || params.taskId) as string;
        respond(true, { task: db.getIssue(id) });
      } finally {
        db.close();
      }
    } catch (e: unknown) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, e instanceof Error ? e.message : String(e)),
      );
    }
  },

  "issues.update": async ({ params, respond }) => {
    const id = (params.issueId || params.taskId) as string | undefined;
    if (!id || !params.updates) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "issueId (or taskId) and updates are required"),
      );
      return;
    }
    try {
      const db = getDbForRepo(resolveRepoPath(params));
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        db.updateTask(id, params.updates as any);
        respond(true, { task: db.getIssue(id) });
      } finally {
        db.close();
      }
    } catch (e: unknown) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, e instanceof Error ? e.message : String(e)),
      );
    }
  },

  "issues.deps": async ({ params, respond }) => {
    const id = (params.issueId || params.taskId) as string | undefined;
    if (!id) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "issueId (or taskId) is required"),
      );
      return;
    }
    try {
      const db = getDbForRepo(resolveRepoPath(params));
      try {
        respond(true, {
          dependencies: db.listDependencies(id),
        });
      } finally {
        db.close();
      }
    } catch (e: unknown) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, e instanceof Error ? e.message : String(e)),
      );
    }
  },

  "issues.deps.add": async ({ params, respond }) => {
    const id = (params.issueId || params.taskId) as string | undefined;
    if (!id || !params.dependsOn) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "issueId (or taskId) and dependsOn are required"),
      );
      return;
    }
    try {
      const db = getDbForRepo(resolveRepoPath(params));
      try {
        db.addDependency({
          issueId: id,
          dependsOn: params.dependsOn as string,
        });
        respond(true, { success: true });
      } finally {
        db.close();
      }
    } catch (e: unknown) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, e instanceof Error ? e.message : String(e)),
      );
    }
  },

  "issues.deps.remove": async ({ params, respond }) => {
    const id = (params.issueId || params.taskId) as string | undefined;
    if (!id || !params.dependsOn) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "issueId (or taskId) and dependsOn are required"),
      );
      return;
    }
    try {
      const db = getDbForRepo(resolveRepoPath(params));
      try {
        db.removeDependency({
          issueId: id,
          dependsOn: params.dependsOn as string,
        });
        respond(true, { success: true });
      } finally {
        db.close();
      }
    } catch (e: unknown) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, e instanceof Error ? e.message : String(e)),
      );
    }
  },

  "issues.batch.plan": async ({ params, respond }) => {
    try {
      const db = getDbForRepo(resolveRepoPath(params));
      try {
        const issues = db.listIssues();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allDeps: any[] = [];
        for (const t of issues) {
          allDeps.push(...db.listDependencies(t.issueId));
        }
        const batch = planBatch(issues, allDeps, (params.maxSize as number) || 5);
        respond(true, { batch });
      } finally {
        db.close();
      }
    } catch (e: unknown) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, e instanceof Error ? e.message : String(e)),
      );
    }
  },

  "selfimprove.list": async ({ params, respond }) => {
    try {
      const db = getDbForRepo(resolveRepoPath(params));
      try {
        let entries = db.listSelfImprove();
        if (params.scope) {
          entries = entries.filter((e) => e.scope === params.scope);
        }
        if (params.severity) {
          entries = entries.filter((e) => e.severity === params.severity);
        }
        respond(true, { entries });
      } finally {
        db.close();
      }
    } catch (e: unknown) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, e instanceof Error ? e.message : String(e)),
      );
    }
  },

  "selfimprove.add": async ({ params, respond }) => {
    if (!params.title || !params.description || !params.agentRole) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "title, description, and agentRole are required"),
      );
      return;
    }
    try {
      const db = getDbForRepo(resolveRepoPath(params));
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        db.addSelfImprove(params as any);
        respond(true, { success: true });
      } finally {
        db.close();
      }
    } catch (e: unknown) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, e instanceof Error ? e.message : String(e)),
      );
    }
  },
};

// Backward-compatible alias
export const backlogHandlers = issuesHandlers;
