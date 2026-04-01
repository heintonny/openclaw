import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { requireNodeSqlite } from "../infra/node-sqlite.js";

// Resolve registry path: ~/.openclaw/project-registry.sqlite
function resolveRegistryPath(): string {
  const home = process.env.OPENCLAW_HOME || path.join(process.env.HOME || "/root", ".openclaw");
  return path.join(home, "project-registry.sqlite");
}

export function openProjectRegistry() {
  const { DatabaseSync } = requireNodeSqlite();
  const registryPath = resolveRegistryPath();
  const dir = path.dirname(registryPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const db = new DatabaseSync(registryPath);
  db.exec("PRAGMA journal_mode=WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      project_id TEXT NOT NULL,
      repo_path TEXT NOT NULL,
      registered_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (project_id, repo_path)
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_projects_id ON projects(project_id);`);

  return {
    db,
    register(projectId: string, repoPath: string) {
      db.prepare("INSERT OR IGNORE INTO projects (project_id, repo_path) VALUES (?, ?)").run(
        projectId,
        repoPath,
      );
    },
    unregister(projectId: string, repoPath: string) {
      db.prepare("DELETE FROM projects WHERE project_id = ? AND repo_path = ?").run(
        projectId,
        repoPath,
      );
    },
    listProjects(): Array<{ projectId: string; repoPaths: string[]; registeredAt: string }> {
      const rows = db
        .prepare(
          "SELECT project_id, repo_path, registered_at FROM projects ORDER BY project_id, registered_at",
        )
        .all() as { project_id: string; repo_path: string; registered_at: string }[];
      const map = new Map<string, { repoPaths: string[]; registeredAt: string }>();
      for (const row of rows) {
        if (!map.has(row.project_id)) {
          map.set(row.project_id, { repoPaths: [], registeredAt: row.registered_at });
        }
        map.get(row.project_id)!.repoPaths.push(row.repo_path);
      }
      return [...map.entries()].map(([projectId, data]) => ({ projectId, ...data }));
    },
    getProject(projectId: string): string[] {
      const rows = db
        .prepare("SELECT repo_path FROM projects WHERE project_id = ?")
        .all(projectId) as { repo_path: string }[];
      return rows.map((r) => r.repo_path);
    },
    close() {
      db.close();
    },
  };
}
