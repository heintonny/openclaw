import { openProjectDatabase, resolveProjectSqlitePath } from "./db.js";

export function addLesson(params: {
  path?: string;
  title: string;
  description?: string;
  category?: string;
  severity?: string;
  role?: string;
  taskId?: string;
  scope?: string;
}): string {
  const repoPath = params.path || process.cwd();
  const dbPath = resolveProjectSqlitePath(repoPath);
  const db = openProjectDatabase(dbPath);
  try {
    const now = Date.now();
    db.addSelfImprove({
      taskId: params.taskId ?? null,
      agentRole: params.role || "general",
      category: (params.category || "lesson") as "lesson" | "pattern" | "anti_pattern" | "process",
      severity: (params.severity || "info") as "info" | "warning" | "critical",
      title: params.title,
      description: params.description || "",
      tags: null,
      scope: (params.scope || "project") as "project" | "global",
      applied: false,
      createdAt: now,
    });
    return params.title;
  } finally {
    db.close();
  }
}

export function listLessons(params: { path?: string; scope?: string; severity?: string }): Array<{
  category: string;
  severity: string;
  title: string;
  description: string;
  role: string;
  createdAt: number;
}> {
  const repoPath = params.path || process.cwd();
  const dbPath = resolveProjectSqlitePath(repoPath);
  const db = openProjectDatabase(dbPath);
  try {
    let entries = db.listSelfImprove();
    if (params.scope) {
      entries = entries.filter((e) => e.scope === params.scope);
    }
    if (params.severity) {
      entries = entries.filter((e) => e.severity === params.severity);
    }
    return entries.map((e) => ({
      category: e.category,
      severity: e.severity,
      title: e.title,
      description: e.description,
      role: e.agentRole,
      createdAt: e.createdAt,
    }));
  } finally {
    db.close();
  }
}
