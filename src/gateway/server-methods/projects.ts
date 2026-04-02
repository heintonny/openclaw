import { openProjectDatabase, resolveProjectSqlitePath } from "../../backlog/db.js";
import { openProjectRegistry } from "../../backlog/registry.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import type { GatewayRequestHandlers } from "./types.js";

export const projectsHandlers: GatewayRequestHandlers = {
  "projects.list": async ({ respond }) => {
    const registry = openProjectRegistry();
    try {
      const projects = registry.listProjects();

      // Enhance with summary stats
      const enhanced = projects.map((p) => {
        let total = 0;
        let active = 0;
        let done = 0;

        // Just checking the first repo for stats in this v1 implementation
        if (p.repoPaths.length > 0) {
          try {
            const dbPath = resolveProjectSqlitePath(p.repoPaths[0]);
            const db = openProjectDatabase(dbPath);
            const summary = db.getSummary();
            total = summary.total || 0;
            active = summary.inProgress || 0;
            done = summary.done || 0;
            db.close();
          } catch {
            // DB might not exist yet
          }
        }

        return {
          projectId: p.projectId,
          id: p.projectId,
          name: p.projectId,
          repoPaths: p.repoPaths,
          registeredAt: p.registeredAt,
          stats: { total, active, done },
        };
      });

      respond(true, { projects: enhanced });
    } finally {
      registry.close();
    }
  },

  "projects.register": async ({ params, respond }) => {
    if (!params.projectId || !params.repoPath) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "projectId and repoPath are required"),
      );
      return;
    }
    const registry = openProjectRegistry();
    try {
      registry.register(params.projectId as string, params.repoPath as string);
      respond(true, { success: true });
    } finally {
      registry.close();
    }
  },

  "projects.unregister": async ({ params, respond }) => {
    if (!params.projectId || !params.repoPath) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "projectId and repoPath are required"),
      );
      return;
    }
    const registry = openProjectRegistry();
    try {
      registry.unregister(params.projectId as string, params.repoPath as string);
      respond(true, { success: true });
    } finally {
      registry.close();
    }
  },
};
