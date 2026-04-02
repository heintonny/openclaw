import { openProjectDatabase, resolveProjectSqlitePath } from "../../backlog/db.js";
import { planBatch } from "../../backlog/deps.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import type { GatewayRequestHandlers } from "./types.js";

function getDbForRepo(repoPath: string) {
  if (!repoPath) {
    throw new Error("repoPath is required");
  }
  const dbPath = resolveProjectSqlitePath(repoPath);
  return openProjectDatabase(dbPath);
}

export const backlogHandlers: GatewayRequestHandlers = {
  "backlog.list": async ({ params, respond }) => {
    try {
      const db = getDbForRepo(params.repoPath as string);
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

  "backlog.add": async ({ params, respond }) => {
    if (!params.taskId || !params.title) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "taskId and title are required"),
      );
      return;
    }
    try {
      const db = getDbForRepo(params.repoPath as string);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        db.addTask(params as any);
        respond(true, { task: db.getBacklogTask(params.taskId as string) });
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

  "backlog.update": async ({ params, respond }) => {
    if (!params.taskId || !params.updates) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "taskId and updates are required"),
      );
      return;
    }
    try {
      const db = getDbForRepo(params.repoPath as string);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        db.updateTask(params.taskId as string, params.updates as any);
        respond(true, { task: db.getBacklogTask(params.taskId as string) });
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

  "backlog.deps": async ({ params, respond }) => {
    if (!params.taskId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "taskId is required"));
      return;
    }
    try {
      const db = getDbForRepo(params.repoPath as string);
      try {
        respond(true, { dependencies: db.listDependencies(params.taskId as string) });
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

  "backlog.deps.add": async ({ params, respond }) => {
    if (!params.taskId || !params.dependsOn) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "taskId and dependsOn are required"),
      );
      return;
    }
    try {
      const db = getDbForRepo(params.repoPath as string);
      try {
        db.addDependency({
          taskId: params.taskId as string,
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

  "backlog.deps.remove": async ({ params, respond }) => {
    if (!params.taskId || !params.dependsOn) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "taskId and dependsOn are required"),
      );
      return;
    }
    try {
      const db = getDbForRepo(params.repoPath as string);
      try {
        db.removeDependency({
          taskId: params.taskId as string,
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

  "backlog.batch.plan": async ({ params, respond }) => {
    try {
      const db = getDbForRepo(params.repoPath as string);
      try {
        const tasks = db.listBacklogTasks();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allDeps: any[] = [];
        for (const t of tasks) {
          allDeps.push(...db.listDependencies(t.taskId));
        }
        const batch = planBatch(tasks, allDeps, (params.maxSize as number) || 5);
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
      const db = getDbForRepo(params.repoPath as string);
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
      const db = getDbForRepo(params.repoPath as string);
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
