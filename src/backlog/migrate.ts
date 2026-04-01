import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { initProjectDirectory, openProjectDatabase } from "./db.js";

type TasksJsonEntry = {
  id: string;
  title: string;
  description?: string;
  status?: string;
  severity?: string;
  complexity?: string;
  depends_on?: string[];
  blocks?: string[];
  touches?: string[];
  assignee?: string;
};

// Map v1 status names to v2
function mapStatus(status?: string): string {
  const map: Record<string, string> = {
    open: "notStarted",
    not_started: "notStarted",
    notStarted: "notStarted",
    in_progress: "inProgress",
    inProgress: "inProgress",
    in_review: "inReview",
    inReview: "inReview",
    done: "done",
    complete: "done",
    completed: "done",
    blocked: "blocked",
    cancelled: "cancelled",
    canceled: "cancelled",
  };
  return map[status || ""] || "notStarted";
}

export function migrateFromTasksJson(
  repoPath: string,
  tasksJsonPath?: string,
): { imported: number; skipped: number } {
  // Find TASKS.json
  const jsonPath = tasksJsonPath || findTasksJson(repoPath);
  if (!jsonPath || !existsSync(jsonPath)) {
    throw new Error(`No TASKS.json found at ${jsonPath || repoPath}`);
  }

  const raw = readFileSync(jsonPath, "utf-8");
  let entries: TasksJsonEntry[];

  // Handle both array and object-with-array formats
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    entries = parsed;
  } else if (parsed.tasks && Array.isArray(parsed.tasks)) {
    entries = parsed.tasks;
  } else {
    throw new Error("TASKS.json must be an array or { tasks: [...] }");
  }

  // Init project and open DB
  const dbPath = initProjectDirectory(repoPath);
  const db = openProjectDatabase(dbPath);

  let imported = 0;
  let skipped = 0;

  try {
    for (const entry of entries) {
      // Skip if already exists
      if (db.getBacklogTask(entry.id)) {
        skipped++;
        continue;
      }

      const now = new Date().toISOString();
      db.addBacklogTask({
        taskId: entry.id,
        title: entry.title,
        description: entry.description || "",
        status: mapStatus(entry.status) as import("./types.js").BacklogStatus,
        severity: (entry.severity || "medium") as import("./types.js").BacklogSeverity,
        complexity: (entry.complexity || "m") as import("./types.js").BacklogComplexity,
        touches: entry.touches || [],
        agentRole: entry.assignee || null,
        createdAt: now,
        updatedAt: now,
        completedAt:
          entry.status === "done" || entry.status === "complete" || entry.status === "completed"
            ? now
            : null,
      });

      // Import dependencies
      if (entry.depends_on) {
        for (const dep of entry.depends_on) {
          db.addDependency({ taskId: entry.id, dependsOn: dep });
        }
      }

      // "blocks" is the reverse: if A blocks B, then B depends on A
      if (entry.blocks) {
        for (const blocked of entry.blocks) {
          db.addDependency({ taskId: blocked, dependsOn: entry.id });
        }
      }

      imported++;
    }
  } finally {
    db.close();
  }

  return { imported, skipped };
}

function findTasksJson(repoPath: string): string | null {
  // Check common locations
  const candidates = [
    path.join(repoPath, ".clawd", "TASKS.json"),
    path.join(repoPath, ".openclaw", "TASKS.json"),
    path.join(repoPath, "TASKS.json"),
    path.join(repoPath, ".agent", "TASKS.json"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) {
      return c;
    }
  }
  return null;
}
