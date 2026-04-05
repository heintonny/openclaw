import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { requireNodeSqlite } from "../infra/node-sqlite.js";
import type { Project } from "./types.js";

// Resolve registry path: ~/.openclaw/project-registry.sqlite
function resolveRegistryPath(): string {
  const home = process.env.OPENCLAW_HOME || path.join(process.env.HOME || "/root", ".openclaw");
  return path.join(home, "project-registry.sqlite");
}

function migrateProjectsTable(db: import("node:sqlite").DatabaseSync) {
  const columns = db.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>;
  const colNames = new Set(columns.map((c) => c.name));

  const needsMigration =
    !colNames.has("display_name") ||
    !colNames.has("repo_url") ||
    !colNames.has("sqlite_path") ||
    !colNames.has("last_seen_at") ||
    !colNames.has("config_json");

  if (!needsMigration) {
    return;
  }

  db.exec(`
    CREATE TABLE projects_new (
      project_id TEXT NOT NULL,
      repo_path TEXT NOT NULL,
      display_name TEXT,
      repo_url TEXT,
      sqlite_path TEXT,
      last_seen_at INTEGER,
      config_json TEXT,
      registered_at INTEGER NOT NULL,
      PRIMARY KEY (project_id, repo_path)
    );
  `);

  const hasTextRegisteredAt = colNames.has("registered_at");
  if (hasTextRegisteredAt) {
    db.exec(`
      INSERT INTO projects_new (project_id, repo_path, registered_at)
      SELECT project_id, repo_path,
             CAST((julianday(registered_at) - 2440587.5) * 86400000 AS INTEGER)
      FROM projects;
    `);
  } else {
    db.exec(`
      INSERT INTO projects_new (project_id, repo_path, registered_at)
      SELECT project_id, repo_path, strftime('%s', 'now') * 1000
      FROM projects;
    `);
  }

  db.exec("DROP TABLE projects;");
  db.exec("ALTER TABLE projects_new RENAME TO projects;");
  db.exec("CREATE INDEX IF NOT EXISTS idx_projects_id ON projects(project_id);");
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
      display_name TEXT,
      repo_url TEXT,
      sqlite_path TEXT,
      last_seen_at INTEGER,
      config_json TEXT,
      registered_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      PRIMARY KEY (project_id, repo_path)
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_projects_id ON projects(project_id);`);

  migrateProjectsTable(db);

  return {
    db,
    register(
      projectId: string,
      repoPath: string,
      options?: {
        displayName?: string | null;
        repoUrl?: string | null;
        sqlitePath?: string | null;
        lastSeenAt?: number | null;
        configJson?: string | null;
      },
    ) {
      const now = Date.now();
      db.prepare(
        `INSERT INTO projects (project_id, repo_path, display_name, repo_url, sqlite_path, last_seen_at, config_json, registered_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(project_id, repo_path) DO UPDATE SET
           display_name = COALESCE(excluded.display_name, display_name),
           repo_url = COALESCE(excluded.repo_url, repo_url),
           sqlite_path = COALESCE(excluded.sqlite_path, sqlite_path),
           last_seen_at = COALESCE(excluded.last_seen_at, last_seen_at),
           config_json = COALESCE(excluded.config_json, config_json)`,
      ).run(
        projectId,
        repoPath,
        options?.displayName ?? null,
        options?.repoUrl ?? null,
        options?.sqlitePath ?? null,
        options?.lastSeenAt ?? null,
        options?.configJson ?? null,
        now,
      );
    },
    updateProject(
      projectId: string,
      repoPath: string,
      updates: {
        displayName?: string | null;
        repoUrl?: string | null;
        sqlitePath?: string | null;
        lastSeenAt?: number | null;
        configJson?: string | null;
      },
    ) {
      const fields: string[] = [];
      const values: Array<string | number | null> = [];

      if (updates.displayName !== undefined) {
        fields.push("display_name = ?");
        values.push(updates.displayName);
      }
      if (updates.repoUrl !== undefined) {
        fields.push("repo_url = ?");
        values.push(updates.repoUrl);
      }
      if (updates.sqlitePath !== undefined) {
        fields.push("sqlite_path = ?");
        values.push(updates.sqlitePath);
      }
      if (updates.lastSeenAt !== undefined) {
        fields.push("last_seen_at = ?");
        values.push(updates.lastSeenAt);
      }
      if (updates.configJson !== undefined) {
        fields.push("config_json = ?");
        values.push(updates.configJson);
      }

      if (fields.length === 0) {
        return;
      }

      values.push(projectId, repoPath);
      db.prepare(
        `UPDATE projects SET ${fields.join(", ")} WHERE project_id = ? AND repo_path = ?`,
      ).run(...values);
    },
    unregister(projectId: string, repoPath: string) {
      db.prepare("DELETE FROM projects WHERE project_id = ? AND repo_path = ?").run(
        projectId,
        repoPath,
      );
    },
    listProjects(): Array<{ projectId: string; repoPaths: string[]; registeredAt: number }> {
      const rows = db
        .prepare(
          "SELECT project_id, repo_path, registered_at FROM projects ORDER BY project_id, registered_at",
        )
        .all() as { project_id: string; repo_path: string; registered_at: number }[];
      const map = new Map<string, { repoPaths: string[]; registeredAt: number }>();
      for (const row of rows) {
        if (!map.has(row.project_id)) {
          map.set(row.project_id, { repoPaths: [], registeredAt: row.registered_at });
        }
        map.get(row.project_id)!.repoPaths.push(row.repo_path);
      }
      return [...map.entries()].map(([projectId, data]) => ({ projectId, ...data }));
    },
    getProject(projectId: string): Project[] {
      const rows = db
        .prepare(
          `SELECT project_id, repo_path, display_name, repo_url, sqlite_path,
                  last_seen_at, config_json, registered_at
           FROM projects WHERE project_id = ?`,
        )
        .all(projectId) as Array<{
        project_id: string;
        repo_path: string;
        display_name: string | null;
        repo_url: string | null;
        sqlite_path: string | null;
        last_seen_at: number | null;
        config_json: string | null;
        registered_at: number;
      }>;
      return rows.map((r) => ({
        projectId: r.project_id,
        repoPath: r.repo_path,
        displayName: r.display_name,
        repoUrl: r.repo_url,
        sqlitePath: r.sqlite_path,
        lastSeenAt: r.last_seen_at,
        configJson: r.config_json,
        registeredAt: r.registered_at,
      }));
    },
    getProjectByPath(repoPath: string): Project | null {
      const row = db
        .prepare(
          `SELECT project_id, repo_path, display_name, repo_url, sqlite_path,
                  last_seen_at, config_json, registered_at
           FROM projects WHERE repo_path = ? LIMIT 1`,
        )
        .get(repoPath) as
        | {
            project_id: string;
            repo_path: string;
            display_name: string | null;
            repo_url: string | null;
            sqlite_path: string | null;
            last_seen_at: number | null;
            config_json: string | null;
            registered_at: number;
          }
        | undefined;
      if (!row) {
        return null;
      }
      return {
        projectId: row.project_id,
        repoPath: row.repo_path,
        displayName: row.display_name,
        repoUrl: row.repo_url,
        sqlitePath: row.sqlite_path,
        lastSeenAt: row.last_seen_at,
        configJson: row.config_json,
        registeredAt: row.registered_at,
      };
    },
    close() {
      db.close();
    },
  };
}
